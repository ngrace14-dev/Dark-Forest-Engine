// ============================================================================
// Dark Forest Engine - Phase 2: Unified Priority Worker Pool
// File: src_core_worker_pool.js
// ============================================================================

class UnifiedWorkerPool {
    constructor(size = Math.max(2, navigator.hardwareConcurrency - 1)) {
        this.size = size;
        this.workers = [];
        this.taskQueue = {
            0: [], // Priority 0: Critical (Immediate terrain, Combat)
            1: [], // Priority 1: High (Horde Sim, Nearby AI)
            2: [], // Priority 2: Medium (Distant terrain, Economy)
            3: []  // Priority 3: Low (Serialization, Telemetry)
        };
        this.activeTasks = 0;
        this.nextTaskId = 0;
        this.callbacks = new Map();

        // Boot the workers
        for (let i = 0; i < this.size; i++) {
            // We use a generic router worker that can handle multiple domain modules
            const worker = new Worker('src_workers_router.js', { type: 'module' });
            
            worker.onmessage = (e) => {
                const { taskId, error, result } = e.data;
                const callback = this.callbacks.get(taskId);
                
                if (callback) {
                    if (error) callback.reject(new Error(error));
                    else callback.resolve(result);
                    this.callbacks.delete(taskId);
                }
                
                this.activeTasks--;
                this.pumpQueue();
            };

            worker.onerror = (err) => {
                console.error(`[WorkerPool] Worker ${i} crashed:`, err);
                this.activeTasks--;
                this.pumpQueue();
            };

            this.workers.push({ worker, idle: true });
        }

        console.log(`⚡ [WorkerPool] Unified Priority Pool initialized with ${this.size} generic workers.`);
    }

    /**
     * Submits a task to the priority queue.
     * @param {number} priority 0 (Highest) to 3 (Lowest)
     * @param {string} domain 'terrain', 'horde', 'economy', 'crypto'
     * @param {string} action specific function to call
     * @param {Object} payload data to pass (supports Transferable objects)
     * @param {Array} transfer array of Transferable objects (ArrayBuffers)
     * @returns {Promise}
     */
    enqueue(priority, domain, action, payload = {}, transfer = []) {
        return new Promise((resolve, reject) => {
            const safePriority = Math.max(0, Math.min(3, Math.floor(priority)));
            const taskId = this.nextTaskId++;
            
            this.callbacks.set(taskId, { resolve, reject });
            
            this.taskQueue[safePriority].push({
                taskId,
                domain,
                action,
                payload,
                transfer
            });

            if (window.Profiler) {
                window.Profiler.metrics.workers[`priority${safePriority}`]++;
                window.Profiler.metrics.workers.queueDepth++;
            }

            this.pumpQueue();
        });
    }

    pumpQueue() {
        // If all workers are busy, wait
        if (this.activeTasks >= this.size) return;

        // Find an idle worker
        const idleWorkerState = this.workers.find(w => w.idle);
        if (!idleWorkerState) return;

        // Find the highest priority task
        let nextTask = null;
        for (let p = 0; p <= 3; p++) {
            if (this.taskQueue[p].length > 0) {
                nextTask = this.taskQueue[p].shift();
                if (window.Profiler) window.Profiler.metrics.workers[`priority${p}`]--;
                break;
            }
        }

        if (!nextTask) return; // Queue empty

        if (window.Profiler) window.Profiler.metrics.workers.queueDepth--;

        this.activeTasks++;
        idleWorkerState.idle = false;

        // Wrap the original callback to mark worker idle again upon completion
        const originalCallback = this.callbacks.get(nextTask.taskId);
        if (originalCallback) {
            const wrappedResolve = (result) => {
                idleWorkerState.idle = true;
                originalCallback.resolve(result);
                this.pumpQueue(); // Immediately try to grab next task
            };
            const wrappedReject = (err) => {
                idleWorkerState.idle = true;
                originalCallback.reject(err);
                this.pumpQueue();
            };
            this.callbacks.set(nextTask.taskId, { resolve: wrappedResolve, reject: wrappedReject });
        }

        // Dispatch to worker
        idleWorkerState.worker.postMessage({
            taskId: nextTask.taskId,
            domain: nextTask.domain,
            action: nextTask.action,
            payload: nextTask.payload
        }, nextTask.transfer);
    }
}

// Global Singleton
if (typeof window !== 'undefined') {
    window.WorkerPool = new UnifiedWorkerPool();
}

export default window.WorkerPool;