import * as THREE from 'three';

/**
 * ============================================================================
 * Dark Forest Engine - LOD Performance Pipeline
 * File: src_systems_impostor_baker.js
 * ============================================================================
 * Single Authority Architecture for generating 2D impostor atlases from high-poly
 * procedural 3D trees at startup. Ensures accurate shading by inheriting the
 * custom shader materials and lighting uniforms.
 */

export class ImpostorBaker {
    /**
     * Initializes the off-screen WebGLRenderTarget and isolated scene components.
     * @param {THREE.WebGLRenderer} renderer - The main engine renderer.
     * @param {number} atlasSize - Dimensions of the render target.
     */
    constructor(renderer, atlasSize = 2048) {
        this.renderer = renderer;
        this.atlasSize = atlasSize;

        // 1. Isolated Scene Structure
        this.scene = new THREE.Scene();
        // Transparent background so alpha is correctly captured in the atlas
        this.scene.background = null; 

        // 2. Tight Orthographic Camera
        // Dimensions are placeholders and should be dynamically clamped to tree bounds during the bake phase
        this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
        this.camera.position.set(0, 10, 50); // Default offset
        this.camera.lookAt(0, 10, 0);

        // 3. Off-screen WebGLRenderTarget
        this.renderTarget = new THREE.WebGLRenderTarget(this.atlasSize, this.atlasSize, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,        // Vital for impostor cutouts
            type: THREE.UnsignedByteType,
            generateMipmaps: true,
            colorSpace: THREE.SRGBColorSpace,
            depthBuffer: true,
            stencilBuffer: false
        });
        
        this.lights = [];
    }

    /**
     * Accepts active procedural materials and configures the isolated environment
     * lighting and uniforms to perfectly match the time-of-day in the main world.
     * 
     * @param {THREE.Material} trunkMat - The injected procedural trunk material
     * @param {THREE.Material} canopyMat - The injected procedural canopy material
     * @param {THREE.Vector3} sunDir - Global sun direction
     * @param {THREE.Color} sunCol - Global sun color
     */
    initializeBakeSetup(trunkMat, canopyMat, sunDir, sunCol) {
        this.trunkMat = trunkMat;
        this.canopyMat = canopyMat;

        // Sync custom shader uniforms to mirror the world state
        const syncUniforms = (mat) => {
            if (mat.userData && mat.userData.shader) { // If using onBeforeCompile, uniforms might be in userData.shader
                const uniforms = mat.userData.shader.uniforms;
                if (uniforms.uForestSunDir) uniforms.uForestSunDir.value.copy(sunDir);
                if (uniforms.uForestSunCol) uniforms.uForestSunCol.value.copy(sunCol);
            }
        };

        syncUniforms(this.trunkMat);
        syncUniforms(this.canopyMat);

        // Standard lighting for the isolated scene to supplement the custom shaders
        const dirLight = new THREE.DirectionalLight(sunCol, 2.0);
        dirLight.position.copy(sunDir).multiplyScalar(100);
        this.scene.add(dirLight);
        this.lights.push(dirLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Base fill light
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
    }

    /**
     * Executes the bake process to render deterministic tree variations into a single 2D atlas.
     * Generates a temporary InstancedMesh (size 1) to trick the shaders into applying 
     * specific instance-driven procedural deformation and coloring per variation.
     * 
     * @param {THREE.BufferGeometry} trunkGeom - High-poly trunk geometry.
     * @param {THREE.BufferGeometry} canopyGeom - High-poly canopy geometry.
     * @param {number} numVariations - Total impostor variations to bake (must be perfect square, e.g., 16).
     * @returns {THREE.Texture} The finalized texture atlas.
     */
    bakeAtlas(trunkGeom, canopyGeom, numVariations = 16) {
        if (!this.trunkMat || !this.canopyMat) {
            console.error("[ImpostorBaker] Baker not initialized. Call initializeBakeSetup first.");
            return null;
        }

        const gridCols = Math.ceil(Math.sqrt(numVariations));
        const gridRows = Math.ceil(numVariations / gridCols);
        const cellWidth = this.atlasSize / gridCols;
        const cellHeight = this.atlasSize / gridRows;

        // Save original renderer state
        const prevRenderTarget = this.renderer.getRenderTarget();
        const prevAutoClear = this.renderer.autoClear;
        
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.autoClear = false; // We will clear once, then manually scissor/viewport per cell
        this.renderer.clear(true, true, true);

        // 1. Create a dummy InstancedMesh structure to feed the custom shaders
        // Our procedural shaders rely heavily on `vInstanceData.x` for deterministic logic.
        const trunkMesh = new THREE.InstancedMesh(trunkGeom, this.trunkMat, 1);
        const canopyMesh = new THREE.InstancedMesh(canopyGeom, this.canopyMat, 1);
        
        // Ensure frustom culling doesn't interfere during the off-screen bake
        trunkMesh.frustumCulled = false;
        canopyMesh.frustumCulled = false;

        const dummyMatrix = new THREE.Matrix4();
        
        // Temporarily add to the isolated scene
        this.scene.add(trunkMesh);
        this.scene.add(canopyMesh);

        // 2. Iterate through variations and bake each into a specific grid cell
        for (let i = 0; i < numVariations; i++) {
            // Determine cell coordinates (bottom-left origin for WebGL)
            const col = i % gridCols;
            const row = Math.floor(i / gridCols);
            
            const vpX = col * cellWidth;
            const vpY = row * cellHeight; // ThreeJS viewports start from bottom

            // Restrict rendering to this specific cell in the atlas
            this.renderer.setViewport(vpX, vpY, cellWidth, cellHeight);
            this.renderer.setScissor(vpX, vpY, cellWidth, cellHeight);
            this.renderer.setScissorTest(true);

            // Construct specific procedural data for this iteration
            // x: seed (sequential to guarantee uniqueness), y: lean (0), z: scale (1), w: windPhase (0)
            const seed = (i + 1) * 13.37; // Arbitrary multiplier to spread seed variance
            
            // Apply dummy position (always origin, camera handles framing)
            dummyMatrix.makeTranslation(0, 0, 0);
            trunkMesh.setMatrixAt(0, dummyMatrix);
            canopyMesh.setMatrixAt(0, dummyMatrix);

            // Inject the vital custom attributes required by src_shaders_forest_materials
            const instanceDataArray = new Float32Array([seed, 0.0, 1.0, 0.0]);
            
            // Need to set custom attribute manually if aInstanceData isn't defined by InstancedMesh automatically
            trunkGeom.setAttribute('aInstanceData', new THREE.InstancedBufferAttribute(instanceDataArray, 4));
            canopyGeom.setAttribute('aInstanceData', new THREE.InstancedBufferAttribute(instanceDataArray, 4));
            
            // Important: Force attribute update
            trunkMesh.instanceMatrix.needsUpdate = true;
            canopyMesh.instanceMatrix.needsUpdate = true;

            // Render the isolated scene containing the seeded tree into the active scissor cell
            this.renderer.render(this.scene, this.camera);
        }

        // 3. Restore original renderer state
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, this.renderer.domElement.width, this.renderer.domElement.height);
        this.renderer.setRenderTarget(prevRenderTarget);
        this.renderer.autoClear = prevAutoClear;

        // 4. Cleanup temporary meshes explicitly before returning
        this.scene.remove(trunkMesh);
        this.scene.remove(canopyMesh);
        
        // We only dispose the meshes. Geometries and Materials are provided by the caller.
        trunkMesh.dispose();
        canopyMesh.dispose();

        // Ensure mipmaps are updated now that the atlas is fully drawn
        // (WebGLRenderTarget handles this automatically if generateMipmaps=true upon usage, 
        // but can be explicitly requested if necessary for custom shaders).

        return this.renderTarget.texture;
    }

    /**
     * ASSET DISPOSAL RULE (NO VRAM LEAKS)
     * Explicitly destroys the render targets, isolated scenes, and cameras used for baking.
     */
    dispose() {
        if (this.renderTarget) {
            this.renderTarget.dispose();
            this.renderTarget = null;
        }

        if (this.scene) {
            // Traverse and aggressively clean up any lingering objects added during baking
            this.scene.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    // We don't dispose the materials because trunkMat and canopyMat are shared from the main world
                }
            });

            // Remove lights
            while(this.scene.children.length > 0) { 
                this.scene.remove(this.scene.children[0]); 
            }
            this.scene = null;
        }

        if (this.lights) {
            this.lights.forEach(light => {
                if (light.dispose) light.dispose(); // ThreeJS lights don't typically have dispose, but safe check
            });
            this.lights = [];
        }

        this.camera = null;
        this.renderer = null;
        this.trunkMat = null;
        this.canopyMat = null;
    }
}
