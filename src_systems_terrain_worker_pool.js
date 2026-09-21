class TerrainWorkerPool {
    constructor(workerCount = Math.max(2, (navigator.hardwareConcurrency || 4) - 1)) {
        this.workerCount = workerCount;
        this.workers = [];
        this.idleWorkers = [];
        this.pendingRequests = new Map();
        this.taskQueue = [];
        this.requestIdCounter = 0;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        for (let i = 0; i < this.workerCount; i++) {
            const worker = new Worker(
                new URL('../src_workers_terrain_worker.js', import.meta.url),
                { type: 'module' }
            );

            worker.onmessage = (e) => this.handleWorkerMessage(worker, e.data);
            this.workers.push(worker);
            this.idleWorkers.push(worker);
        }

        this.initialized = true;
    }

    requestChunkData(cx, cz, lod, chunkSize, seed, roadPoints, callback) {
        if (!this.initialized) this.init();

        const requestId = ++this.requestIdCounter;
        const segments = lod === 'A' ? 30 : lod === 'B' ? 10 : 2;

        const task = {
            id: requestId,
            cx,
            cz,
            segments,
            chunkSize,
            seed,
            roadPoints,
            callback
        };

        this.pendingRequests.set(requestId, task);

        if (this.idleWorkers.length > 0) {
            const worker = this.idleWorkers.pop();
            this.dispatchTask(worker, task);
        } else {
            this.taskQueue.push(task);
        }
    }

    dispatchTask(worker, task) {
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

    handleWorkerMessage(worker, data) {
        const { id, positions, normals, colors, clutter } = data;
        const request = this.pendingRequests.get(id);

        if (request) {
            this.pendingRequests.delete(id);
            request.callback({ positions, normals, colors, clutter });
        }

        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift();
            this.dispatchTask(worker, nextTask);
        } else {
            this.idleWorkers.push(worker);
        }
    }
}

window.TerrainWorkerPool = new TerrainWorkerPool();
