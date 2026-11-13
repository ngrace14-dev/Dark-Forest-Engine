import WorkerPool from './src_core_worker_pool.js';
class TerrainWorkerPool {
    constructor() { console.log('[TerrainWorkerPool] Upgraded to Unified Worker Pool (Phase 2).'); }
    requestChunkData(cx, cz, lod, size, seed, localRoadPoints, callback) {
        WorkerPool.enqueue(2, 'terrain', 'generateChunk', { cx, cz, lod, size, seed, localRoadPoints }).then(result => {
            if (callback) callback(result);
        }).catch(err => {
            console.error('[TerrainWorkerPool] Generation failed for chunk', cx, cz, err);
        });
    }
}
window.TerrainWorkerPool = new TerrainWorkerPool();
export default window.TerrainWorkerPool;