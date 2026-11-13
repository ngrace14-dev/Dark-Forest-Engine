// ============================================================================
// Dark Forest Engine - 2D Billboard Impostor Manager (Tier C Distant Canopy)
// File: src_systems_forest_billboards.js
// ============================================================================

import * as THREE from 'three';

class BillboardSystem {
    constructor() {
        this.group = new THREE.Group();
        this.chunkPointsMap = new Map();
        this.maxCapacity = 10000;
        this.initialized = false;
        this.scene = null;

        // Shared atmospheric uniforms
        this.sharedUniforms = {
            uTime: { value: 0 },
            uFogColor: { value: new THREE.Color(0x0c131a) },
            uFogDensity: { value: 0.0018 }
        };

        this.impostorTexture = this.createFallbackTexture();
        this.setupMaterials();
        this.initGeometry();
        this.bindEvents();
    }

    /**
     * System initialization hook.
     * @param {THREE.Scene} scene 
     */
    init(scene) {
        if (this.initialized || !scene) return;
        this.scene = scene;
        this.scene.add(this.group);
        this.initialized = true;
        console.log('[BillboardManager] Initialized successfully.');
    }

    /**
     * Binds engine lifecycle event listeners.
     */
    bindEvents() {
        window.EventBus?.on('ENGINE_READY', () => {
            if (window.GameCore?.scene && !this.initialized) {
                this.init(window.GameCore.scene);
            }
        });

        window.EventBus?.on('WORLD_REGENERATE', () => {
            this.clearAll();
        });
    }

    /**
     * Generates an offscreen Canvas2D fallback texture atlas of an Old-Growth Redwood.
     * Prevents WebGL texture sampler crashes when no PNG asset is loaded.
     * @returns {THREE.CanvasTexture}
     */
    createFallbackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Clear transparent background
        ctx.clearRect(0, 0, 512, 1024);

        // Draw Tapered Trunk
        ctx.fillStyle = '#1c0e07';
        ctx.beginPath();
        ctx.moveTo(236, 1024);
        ctx.lineTo(276, 1024);
        ctx.lineTo(262, 200);
        ctx.lineTo(250, 200);
        ctx.closePath();
        ctx.fill();

        // Draw Ragged Upper Crown Clusters (Top 45% only)
        ctx.fillStyle = '#0a1e0d';
        
        // Lower canopy bulges
        ctx.beginPath();
        ctx.ellipse(256, 420, 180, 110, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(256, 320, 150, 95, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mid-crown
        ctx.fillStyle = '#112b15';
        ctx.beginPath();
        ctx.ellipse(256, 230, 110, 80, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upper apex tip
        ctx.fillStyle = '#18381c';
        ctx.beginPath();
        ctx.ellipse(256, 140, 65, 60, 0, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Initializes plane geometry scaled to redwood dimensions (45m wide x 100m tall).
     */
    initGeometry() {
        // Base plane geometry with pivot at ground line
        this.geometry = new THREE.PlaneGeometry(45, 100, 1, 1);
        this.geometry.translate(0, 50, 0);
    }

    /**
     * Configures view-space camera-facing billboarding shader.
     */
    setupMaterials() {
        this.billboardMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.impostorTexture },
                uTime: this.sharedUniforms.uTime,
                uFogColor: this.sharedUniforms.uFogColor,
                uFogDensity: this.sharedUniforms.uFogDensity
            },
            transparent: false, // CRITICAL: Disabled to write solid WebGL depth
            depthWrite: true,
            depthTest: true,
            side: THREE.DoubleSide,

            vertexShader: `
                uniform float uTime;
                varying vec2 vUv;
                varying vec3 vWorldPos;

                void main() {
                    vUv = uv;

                    #ifdef USE_INSTANCING
                        // 1. Extract instance world space translation
                        vec4 worldOrigin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                        vWorldPos = worldOrigin.xyz;

                        // 2. Extract instance scale factors from matrix columns
                        float scaleX = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
                        float scaleY = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));

                        // 3. Compute view space camera-facing translation
                        vec4 mvPosition = viewMatrix * worldOrigin;

                        // Apply low-frequency top crown wind sway
                        float sway = sin(uTime * 1.0 + worldOrigin.x * 0.005) * pow(position.y / 100.0, 2.0) * 2.0;

                        // Offset vertices directly in view space (Camera Facing Billboarding)
                        mvPosition.xy += (position.xy + vec2(sway, 0.0)) * vec2(
                            scaleX > 0.01 ? scaleX : 1.0, 
                            scaleY > 0.01 ? scaleY : 1.0
                        );
                    #else
                        vec4 worldOrigin = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                        vWorldPos = worldOrigin.xyz;
                        vec4 mvPosition = viewMatrix * worldOrigin;
                        mvPosition.xy += position.xy;
                    #endif

                    gl_Position = projectionMatrix * mvPosition;
                }
            `,

            fragmentShader: `
                uniform sampler2D map;
                uniform vec3 uFogColor;
                uniform float uFogDensity;

                varying vec2 vUv;
                varying vec3 vWorldPos;

                void main() {
                    vec4 texColor = texture2D(map, vUv);

                    // HARD DISCARD: Writes solid pixel to depth buffer for Volumetric Fog god-rays
                    if (texColor.a < 0.5) discard;

                    // Distance height-fog extinction blend
                    float dist = length(cameraPosition - vWorldPos);
                    float fogFactor = 1.0 - exp(-dist * uFogDensity);
                    vec3 finalColor = mix(texColor.rgb, uFogColor, clamp(fogFactor, 0.0, 0.98));

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
    }

    /**
     * Initializes or grows the InstancedMesh buffer pool dynamically.
     * @param {number} requiredCapacity 
     */
    ensureCapacity(requiredCapacity) {
        if (!this.imesh || this.imesh.instanceMatrix.count < requiredCapacity) {
            if (this.imesh) {
                this.group.remove(this.imesh);
                this.imesh.geometry.dispose();
            }

            this.maxCapacity = Math.max(requiredCapacity + 2000, this.maxCapacity);
            this.imesh = new THREE.InstancedMesh(this.geometry, this.billboardMaterial, this.maxCapacity);
            this.imesh.castShadow = true;
            this.imesh.receiveShadow = true;
            this.imesh.count = 0;
            this.imesh.frustumCulled = false;
            this.imesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            this.group.add(this.imesh);
        }
    }

    /**
     * Set points for a specific terrain chunk and trigger a buffer rebuild.
     * @param {string} chunkKey 
     * @param {Array<{x: number, y: number, z: number, scale?: number, rotation?: number}>} points 
     */
    setChunkPoints(chunkKey, points) {
        if (!chunkKey || !points) return;
        this.chunkPointsMap.set(chunkKey, points);
        this.rebuildInstances();
    }

    /**
     * Clear billboard points for a streamed-out chunk.
     * @param {string} chunkKey 
     */
    clearChunkPoints(chunkKey) {
        if (!chunkKey || !this.chunkPointsMap.has(chunkKey)) return;
        this.chunkPointsMap.delete(chunkKey);
        this.rebuildInstances();
    }

    /**
     * Rebuilds global InstancedMesh matrices from accumulated chunk point maps.
     */
    rebuildInstances() {
        let totalPoints = 0;
        for (const points of this.chunkPointsMap.values()) {
            totalPoints += points.length;
        }

        if (totalPoints === 0) {
            if (this.imesh) this.imesh.count = 0;
            return;
        }

        this.ensureCapacity(totalPoints);

        const matrix = new THREE.Matrix4();
        const dummyPos = new THREE.Vector3();
        const dummyQuat = new THREE.Quaternion();
        const dummyScale = new THREE.Vector3();

        let index = 0;
        for (const points of this.chunkPointsMap.values()) {
            for (let i = 0; i < points.length; i++) {
                if (index >= this.maxCapacity) break;

                const p = points[i];
                const px = p.x || 0;
                const py = p.y || 0;
                const pz = p.z || 0;
                const scale = p.scale || 1.0;

                dummyPos.set(px, py, pz);
                dummyQuat.identity();
                dummyScale.set(scale, scale, scale);

                matrix.compose(dummyPos, dummyQuat, dummyScale);
                this.imesh.setMatrixAt(index, matrix);
                index++;
            }
        }

        this.imesh.count = index;
        this.imesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Legacy single-array update compatibility API.
     * @param {Array<{x: number, y: number, z: number, scale?: number}>} points 
     */
    updateBillboards(points) {
        if (!points || !Array.isArray(points)) return;
        this.setChunkPoints('legacy_global', points);
    }

    /**
     * Updates frame uniforms for wind and atmospheric fog.
     * @param {number} delta 
     */
    update(delta) {
        const timeSecs = performance.now() / 1000;
        this.sharedUniforms.uTime.value = timeSecs;

        if (window.VolumetricFogSystem?.fogUniforms?.uFogColor) {
            this.sharedUniforms.uFogColor.value.copy(window.VolumetricFogSystem.fogUniforms.uFogColor.value);
        }
    }

    /**
     * Clears all chunk point data and resets billboard buffers.
     */
    clearAll() {
        this.chunkPointsMap.clear();
        if (this.imesh) {
            this.imesh.count = 0;
            this.imesh.instanceMatrix.needsUpdate = true;
        }
    }
}

// Global Singleton Binding
window.BillboardManager = new BillboardSystem();
export default BillboardSystem;
