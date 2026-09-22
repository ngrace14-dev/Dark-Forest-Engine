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
        const { id, error, key, positions, normals, colors } = e.data;
        
        if (this.taskCallbacks.has(id)) {
            const callback = this.taskCallbacks.get(id);
            this.taskCallbacks.delete(id);

            if (!error && positions) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.computeBoundingSphere();

                // PRIORITY 3 FIX: Bind geometry through ForestRenderer to enforce ForestFloorMaterial
                if (window.ForestRenderer && window.ForestRenderer.setTerrainMesh) {
                    window.ForestRenderer.setTerrainMesh(key, geometry);
                } else {
                    const fallbackMat = new THREE.MeshStandardMaterial({ vertexColors: true });
                    const mesh = new THREE.Mesh(geometry, fallbackMat);
                    if (window.GameCore && window.GameCore.scene) {
                        window.GameCore.scene.add(mesh);
                    }
                }

                callback(null, geometry);
            } else {
                callback(error || new Error('Worker returned empty geometry.'));
            }
        }

        this.idleWorkers.push(worker);
    }

    requestChunkGeometry(chunkData, callback) {
        const taskId = ++this.taskIdCounter;
        this.taskCallbacks.set(taskId, callback);

        const dispatch = () => {
            if (this.idleWorkers.length > 0) {
                const worker = this.idleWorkers.pop();
                worker.postMessage({ id: taskId, ...chunkData });
            } else {
                setTimeout(dispatch, 10);
            }
        };

        dispatch();
    }
}

if (typeof window !== 'undefined') {
    window.TerrainWorkerPool = TerrainWorkerPool;
}

export default TerrainWorkerPool;
