// ============================================================================
// Dark Forest Engine - Phase 0: Instrumentation & Telemetry
// File: src_systems_profiler.js
// ============================================================================

class EngineProfiler {
    constructor() {
        // Frame Budget Ownership Rule (ms)
        this.budgets = {
            'AI': 3.0,
            'Physics': 2.0,
            'Animation': 3.0,
            'Renderer': 6.0,
            'Workers/IO': 1.0,
            'Total': 16.67 // 60 FPS Target
        };

        this.timers = new Map();
        this.accumulators = new Map();
        this.history = new Map(); // Tracks consecutive frames over budget
        this.CRIT_THRESHOLD = 30; // Frames

        this.metrics = {
            world: { active: 0, sleeping: 0, virtual: 0, chunksLoaded: 0, chunksLoading: 0, chunksUnloading: 0 },
            workers: { poolSize: 0, queueDepth: 0, priority0: 0, priority1: 0, priority2: 0, priority3: 0 },
            memory: { heapUsed: 0, heapTotal: 0 }
        };

        this.hudElement = this.createHUD();
        this.lastFrameTime = performance.now();
        
        console.log("⚡ [Profiler] Phase 0 Instrumentation Initialized. Budgets locked.");
    }

    createHUD() {
        const hud = document.createElement('div');
        hud.id = 'engine-profiler-hud';
        hud.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            background: rgba(4, 6, 8, 0.9);
            color: #dbeafe;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            padding: 10px;
            border: 1px solid #334155;
            z-index: 9999;
            pointer-events: none;
            white-space: pre;
            text-shadow: 1px 1px 0 #000;
        `;
        document.body.appendChild(hud);
        return hud;
    }

    begin(timerId) {
        this.timers.set(timerId, performance.now());
    }

    end(timerId) {
        const start = this.timers.get(timerId);
        if (!start) return;
        
        const duration = performance.now() - start;
        const current = this.accumulators.get(timerId) || 0;
        this.accumulators.set(timerId, current + duration);
    }

    getStatus(timerId, value) {
        const budget = this.budgets[timerId];
        if (!budget) return '[INFO]';

        const ratio = value / budget;
        
        if (ratio <= 1.0) {
            this.history.set(timerId, 0);
            return '<span style="color:#4ade80">[PASS]</span>'; // Green
        }
        
        const consecutiveFails = (this.history.get(timerId) || 0) + 1;
        this.history.set(timerId, consecutiveFails);

        if (consecutiveFails >= this.CRIT_THRESHOLD) {
            return '<span style="color:#ef4444">[CRIT]</span>'; // Red
        } else if (ratio > 1.1) {
            return '<span style="color:#f97316">[FAIL]</span>'; // Orange
        } else {
            return '<span style="color:#facc15">[WARN]</span>'; // Yellow
        }
    }

    // Call this once at the very end of the main loop
    update(renderer) {
        const now = performance.now();
        const totalFrameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Fetch memory if available (Chrome/Edge)
        if (performance.memory) {
            this.metrics.memory.heapUsed = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
            this.metrics.memory.heapTotal = (performance.memory.totalJSHeapSize / 1048576).toFixed(1);
        }

        // Fetch Renderer Stats
        let rStats = { calls: 0, triangles: 0, textures: 0, geometries: 0, materials: 0 };
        if (renderer && renderer.info) {
            rStats.calls = renderer.info.render.calls;
            rStats.triangles = renderer.info.render.triangles;
            rStats.textures = renderer.info.memory.textures;
            rStats.geometries = renderer.info.memory.geometries;
        }

        let html = `<b style="color:#94a3b8">DARK FOREST - PHASE 0 PROFILER</b>\n`;
        html += `Target Budget: ${this.budgets['Total']}ms\n`;
        html += `------------------------------------\n`;

        // CPU Budgets
        let totalMeasured = 0;
        ['AI', 'Physics', 'Animation', 'Renderer', 'Workers/IO'].forEach(id => {
            const val = this.accumulators.get(id) || 0;
            totalMeasured += val;
            const status = this.getStatus(id, val);
            const budget = this.budgets[id].toFixed(1);
            html += `${status} ${id.padEnd(14)}: ${val.toFixed(2).padStart(5)} / ${budget}ms\n`;
        });

        const totalStatus = this.getStatus('Total', totalFrameTime);
        html += `------------------------------------\n`;
        html += `${totalStatus} Total Frame  : ${totalFrameTime.toFixed(2).padStart(5)} / 16.7ms\n\n`;

        // World State
        html += `<b style="color:#94a3b8">WORLD STATE</b>\n`;
        html += `Entities: ${this.metrics.world.active} Act | ${this.metrics.world.sleeping} Slp | ${this.metrics.world.virtual} Vrt\n`;
        html += `Chunks  : ${this.metrics.world.chunksLoaded} Ldd | ${this.metrics.world.chunksLoading} Lng | ${this.metrics.world.chunksUnloading} Uld\n\n`;

        // Workers
        html += `<b style="color:#94a3b8">WORKER POOL</b>\n`;
        html += `Pool: ${this.metrics.workers.poolSize} | Queue: ${this.metrics.workers.queueDepth}\n`;
        html += `P0:${this.metrics.workers.priority0} P1:${this.metrics.workers.priority1} P2:${this.metrics.workers.priority2} P3:${this.metrics.workers.priority3}\n\n`;

        // Rendering & Memory
        html += `<b style="color:#94a3b8">RENDER & MEMORY</b>\n`;
        html += `Draw Calls : ${rStats.calls}\n`;
        html += `Triangles  : ${rStats.triangles}\n`;
        html += `Geometries : ${rStats.geometries} | Textures: ${rStats.textures}\n`;
        html += `Heap Usage : ${this.metrics.memory.heapUsed}MB / ${this.metrics.memory.heapTotal}MB\n`;

        this.hudElement.innerHTML = html;

        // Reset accumulators for the next frame
        this.accumulators.clear();
    }
}

// Global Singleton
if (typeof window !== 'undefined') {
    window.Profiler = new EngineProfiler();
}

export default window.Profiler;