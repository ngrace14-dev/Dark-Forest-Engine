// ============================================================================
// Dark Forest Engine - Terrain Worker Pool & Background Geometry Pipeline
// File: src_systems_terrain_worker_pool.js
// ============================================================================

class TerrainWorkerPool {
    constructor(workerCount = Math.max(2, (navigator.hardwareConcurrency || 4) - 1)) {
        this.workerCount = workerCount;
        this.workers = [];
        this.idleWorkers = [];
        this.pendingRequests = new Map();
        this.taskQueue = [];
        this.requestIdCounter = 0;
        this.initialized = false;
        this.useFallback = false;

        this.bindEvents();
    }

    /**
     * Binds lifecycle event listeners.
     */
    bindEvents() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => {
                if (!this.initialized) this.init();
            });

            window.EventBus.on('WORLD_REGENERATE', () => {
                this.cancelAllRequests();
            });
        }
    }

    /**
     * Initializes the background Web Worker pool with safe path resolution and error handlers.
     */
    init() {
        if (this.initialized) return;

        // Candidate paths for different bundler/server environments
        const workerPaths = [
            'src_workers_terrain_worker.js',
            './src_workers_terrain_worker.js',
            '../src_workers_terrain_worker.js'
        ];

        let spawned = 0;

        for (let i = 0; i < this.workerCount; i++) {
            let worker = null;

            for (const path of workerPaths) {
                try {
                    worker = new Worker(path, { type: 'module' });
                    break;
                } catch (e) {
                    // Try next candidate path
                }
            }

            if (worker) {
                worker.onmessage = (e) => this.handleWorkerMessage(worker, e.data);
                
                // CRITICAL ERROR RECOVERY: Recover worker and unblock queue on script crash
                worker.onerror = (err) => {
                    console.error('[TerrainWorkerPool] Worker error caught:', err);
                    this.handleWorkerError(worker);
                };

                this.workers.push(worker);
                this.idleWorkers.push(worker);
                spawned++;
            }
        }

        if (spawned === 0) {
            console.warn('[TerrainWorkerPool] Could not spawn Web Workers. Enabling main-thread fallback generator.');
            this.useFallback = true;
        } else {
            console.log(`[TerrainWorkerPool] Successfully initialized ${spawned} Web Workers.`);
        }

        this.initialized = true;
    }

    /**
     * Requests terrain chunk geometry calculations off the main thread.
     * @param {number} cx - Chunk X coordinate
     * @param {number} cz - Chunk Z coordinate
     * @param {string} lod - 'A' | 'B' | 'C'
     * @param {number} chunkSize - Size of chunk in meters (60.0)
     * @param {number} seed - World seed
     * @param {Array} roadPoints - Array of road vector points
     * @param {Function} callback - Called with { positions, normals, colors, clutter }
     */
    requestChunkData(cx, cz, lod, chunkSize, seed, roadPoints, callback) {
        if (!this.initialized) this.init();

        const requestId = ++this.requestIdCounter;
        const segments = lod === 'A' ? 30 : lod === 'B' ? 10 : 2;
        const chunkKey = `${cx},${cz}`;

        // Deduplicate: Cancel any pending un-dispatched tasks for the exact same chunk
        this.taskQueue = this.taskQueue.filter(task => {
            if (task.chunkKey === chunkKey) {
                this.pendingRequests.delete(task.id);
                return false;
            }
            return true;
        });

        const task = {
            id: requestId,
            chunkKey,
            cx,
            cz,
            lod,
            segments,
            chunkSize,
            seed,
            roadPoints,
            callback
        };

        // Main-thread fallback if workers are disabled or unsupported
        if (this.useFallback) {
            setTimeout(() => this.generateFallbackChunk(task), 0);
            return;
        }

        this.pendingRequests.set(requestId, task);

        if (this.idleWorkers.length > 0) {
            const worker = this.idleWorkers.pop();
            this.dispatchTask(worker, task);
        } else {
            this.taskQueue.push(task);
        }
    }

    /**
     * Dispatches task data to a worker thread.
     */
    dispatchTask(worker, task) {
        worker._currentTaskId = task.id;
        worker.postMessage({
            id: task.id,
            cx: task.cx,
            cz: task.cz,
            segments: task.segments,
            chunkSize: task.chunkSize,
            seed: task.seed,
            roadPoints: task.roadPoints
        });
    }

    /**
     * Handles returned geometry buffers from a completed worker task.
     */
    handleWorkerMessage(worker, data) {
        const { id, positions, normals, colors, clutter } = data;
        const request = this.pendingRequests.get(id);

        worker._currentTaskId = null;

        if (request) {
            this.pendingRequests.delete(id);
            if (typeof request.callback === 'function') {
                request.callback({ positions, normals, colors, clutter });
            }
        }

        this.processNextTask(worker);
    }

    /**
     * Recovers a worker that encountered an unhandled GLSL or JS error.
     */
    handleWorkerError(worker) {
        if (worker._currentTaskId) {
            this.pendingRequests.delete(worker._currentTaskId);
            worker._currentTaskId = null;
        }

        this.processNextTask(worker);
    }

    /**
     * Assigns the next task in the queue to an idle worker.
     */
    processNextTask(worker) {
        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift();
            this.dispatchTask(worker, nextTask);
        } else {
            this.idleWorkers.push(worker);
        }
    }

    /**
     * Synchronous main-thread terrain generator fallback used if workers fail to spawn.
     */
    generateFallbackChunk(task) {
        const { cx, cz, segments, chunkSize, callback } = task;
        const gridX = segments + 1;
        const totalVerts = gridX * gridX;

        const positions = new Float32Array(totalVerts * 3);
        const normals = new Float32Array(totalVerts * 3);
        const colors = new Float32Array(totalVerts * 3);
        const clutter = new Float32Array(totalVerts);

        const startX = cx * chunkSize - chunkSize / 2;
        const startZ = cz * chunkSize - chunkSize / 2;

        let idx = 0;
        for (let j = 0; j <= segments; j++) {
            for (let i = 0; i <= segments; i++) {
                const vx = startX + (i / segments) * chunkSize;
                const vz = startZ + (j / segments) * chunkSize;

                // Simple main-thread noise fallback
                const vy = (Math.sin(vx * 0.05) + Math.cos(vz * 0.05)) * 1.5;

                positions[idx * 3] = vx - (cx * chunkSize + chunkSize / 2);
                positions[idx * 3 + 1] = vy;
                positions[idx * 3 + 2] = vz - (cz * chunkSize + chunkSize / 2);

                normals[idx * 3] = 0;
                normals[idx * 3 + 1] = 1;
                normals[idx * 3 + 2] = 0;

                colors[idx * 3] = 0.15;
                colors[idx * 3 + 1] = 0.35;
                colors[idx * 3 + 2] = 0.15;

                clutter[idx] = 0.5;
                idx++;
            }
        }

        if (typeof callback === 'function') {
            callback({ positions, normals, colors, clutter });
        }
    }

    /**
     * Cancels all pending tasks and clears the queue.
     */
    cancelAllRequests() {
        this.taskQueue = [];
        this.pendingRequests.clear();
    }
}

// Global Singleton Binding
window.TerrainWorkerPool = new TerrainWorkerPool();
