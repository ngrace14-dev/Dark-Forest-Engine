// ============================================================================
// Dark Forest Engine - Phase 5: I/O & Asset Streaming Budget
// File: src_core_asset_budget.js
// ============================================================================

class AssetBudgetManager {
    constructor() {
        this.budget = {
            maxTexturesPerFrame: 1,
            maxGeometriesPerFrame: 1,
            maxMaterialsPerFrame: 1,
            maxInstantiationsPerFrame: 3 // E.g., spawn 3 NPCs max per tick
        };

        this.queues = {
            textures: [],
            geometries: [],
            materials: [],
            instantiations: []
        };
        
        console.log("⚡ [AssetBudget] I/O Throttling Initialized.");
    }

    // --- Enqueue Methods ---
    queueTexture(textureUrl, onLoad) {
        this.queues.textures.push({ url: textureUrl, resolve: onLoad });
    }

    queueGeometry(geoGenerator, onLoad) {
        this.queues.geometries.push({ generator: geoGenerator, resolve: onLoad });
    }

    queueMaterial(matConfig, onLoad) {
        this.queues.materials.push({ config: matConfig, resolve: onLoad });
    }

    queueInstantiation(prefabName, x, y, z, chunkKey, onLoad) {
        this.queues.instantiations.push({ prefabName, x, y, z, chunkKey, resolve: onLoad });
    }

    // --- Execution Pipeline ---
    update() {
        // Prevent Time-Slicing if we're paused or the engine isn't ready
        if (window.EngineParams?.isPaused) return;

        let texturesProcessed = 0;
        while (this.queues.textures.length > 0 && texturesProcessed < this.budget.maxTexturesPerFrame) {
            const task = this.queues.textures.shift();
            this._loadTexture(task);
            texturesProcessed++;
        }

        let geometriesProcessed = 0;
        while (this.queues.geometries.length > 0 && geometriesProcessed < this.budget.maxGeometriesPerFrame) {
            const task = this.queues.geometries.shift();
            // Assuming generator is a function that returns a BufferGeometry
            const geo = task.generator();
            if (task.resolve) task.resolve(geo);
            geometriesProcessed++;
        }

        let materialsProcessed = 0;
        while (this.queues.materials.length > 0 && materialsProcessed < this.budget.maxMaterialsPerFrame) {
            const task = this.queues.materials.shift();
            // Heavy compilation block
            const mat = this._compileMaterial(task.config);
            if (task.resolve) task.resolve(mat);
            materialsProcessed++;
        }

        let instantiationsProcessed = 0;
        while (this.queues.instantiations.length > 0 && instantiationsProcessed < this.budget.maxInstantiationsPerFrame) {
            const task = this.queues.instantiations.shift();
            // Call the engine's real instantiator
            if (window.GameCore?.instantiatePrefab) {
                const entity = window.GameCore.instantiatePrefab(task.prefabName, task.x, task.y, task.z, task.chunkKey);
                if (task.resolve) task.resolve(entity);
            }
            instantiationsProcessed++;
        }
    }

    // --- Internal Processors ---
    _loadTexture(task) {
        // Example integration with Three.js TextureLoader
        if (!this.textureLoader) this.textureLoader = new window.THREE.TextureLoader();
        this.textureLoader.load(task.url, (texture) => {
            if (task.resolve) task.resolve(texture);
        });
    }

    _compileMaterial(config) {
        // Force the renderer to compile the material immediately
        // so it doesn't hitch when it first hits the screen
        const mat = new window.THREE.MeshStandardMaterial(config);
        if (window.GameCore?.renderer && window.GameCore?.scene && window.GameCore?.camera) {
            // Create a dummy mesh to force compilation
            const dummyGeo = new window.THREE.PlaneGeometry(0.1, 0.1);
            const dummyMesh = new window.THREE.Mesh(dummyGeo, mat);
            dummyMesh.frustumCulled = false;
            window.GameCore.scene.add(dummyMesh);
            
            // Compiling pushes it to the GPU
            window.GameCore.renderer.compile(window.GameCore.scene, window.GameCore.camera);
            
            window.GameCore.scene.remove(dummyMesh);
            dummyGeo.dispose();
        }
        return mat;
    }
}

// Global Singleton
if (typeof window !== 'undefined') {
    window.AssetBudget = new AssetBudgetManager();
}

export default window.AssetBudget;