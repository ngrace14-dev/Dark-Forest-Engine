// ============================================================================
// Dark Forest Engine - Terrain Worker Pool & Renderer Pipeline Binding
// File: src/systems/terrain_worker_pool.js
// ============================================================================

import * as THREE from 'three';

export class TerrainWorkerPool {
    constructor(workerScriptUrl, poolSize = 4) {
        this.workerScriptUrl = workerScriptUrl;
        this.poolSize = poolSize;
        this.workers = [];
        this.idleWorkers = [];
        this.taskCallbacks = new Map();
        this.taskIdCounter = 0;

        this.initPool();
    }

    initPool() {
        for (let i = 0; i < this.poolSize; i++) {
            const worker = new Worker(this.workerScriptUrl);
            worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
            worker.onerror = (err) => console.error('[TerrainWorkerPool] Worker Error:', err);
            this.workers.push(worker);
            this.idleWorkers.push(worker);
        }
        console.log(`[TerrainWorkerPool] Successfully initialized ${this.poolSize} Web Workers.`);
    }

        handleWorkerMessage(worker, e) {
        const { id, error, key, positions, normals, colors, clutter } = e.data;
        
        if (this.taskCallbacks.has(id)) {
            const callback = this.taskCallbacks.get(id);
            this.taskCallbacks.delete(id);

            if (!error && positions) {
                // Ensure Single Authority: Engine handles Geometry creation
                callback({ positions, normals, colors, clutter });
            } else {
                console.error('[TerrainWorkerPool] Worker Error:', error);
                callback({ 
                    positions: new Float32Array(0), 
                    normals: new Float32Array(0), 
                    colors: new Float32Array(0),
                    clutter: new Float32Array(0)
                });
            }
        }

        this.idleWorkers.push(worker);
    }

        // FIX: Renamed back to requestChunkData to match src_engine.js expectations
    requestChunkData(cx, cz, lod, chunkSize, seed, roadPoints, callback) {
        const taskId = ++this.taskIdCounter;
        this.taskCallbacks.set(taskId, callback);

        const dispatch = () => {
            if (this.idleWorkers.length > 0) {
                const worker = this.idleWorkers.pop();
                const segments = lod === 'A' ? 30 : (lod === 'B' ? 10 : 2);
                worker.postMessage({ id: taskId, cx, cz, segments, chunkSize, seed, roadPoints });
            } else {
                setTimeout(dispatch, 10);
            }
        };

        dispatch();
    }
}

if (typeof window !== 'undefined') {
    // FIX: Initialize the class instead of just assigning the constructor
    window.TerrainWorkerPool = new TerrainWorkerPool('src_workers_terrain_worker.js');
}

export default TerrainWorkerPool;
