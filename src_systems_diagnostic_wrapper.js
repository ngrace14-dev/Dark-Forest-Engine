/**
 * File: src_systems_diagnostic_wrapper.js
 * Unified Information Ecology Diagnostic Voice
 * 
 * Wraps console and event emitters to speak in the Crow's Eye diagnostic voice.
 * Clasifies all technical telemetry into simulation-aligned subsystems.
 */

class DiagnosticWrapper {
    constructor() {
        this.originalConsoleLog = console.log;
        this.originalConsoleWarn = console.warn;
        this.originalConsoleError = console.error;
        
        this.init();
    }

    init() {
        const self = this;

        // Override console.log
        console.log = function(...args) {
            const msg = args.join(' ');
            const transformed = self.transform(msg, 'LOG');
            self.originalConsoleLog.apply(console, [transformed]);
            if (window.EventBus) window.EventBus.emit('UI_LOG', transformed);
        };

        // Override console.warn
        console.warn = function(...args) {
            const msg = args.join(' ');
            const transformed = self.transform(msg, 'WARN');
            self.originalConsoleWarn.apply(console, [transformed]);
            if (window.EventBus) window.EventBus.emit('UI_LOG', transformed);
        };

        // Override console.error
        console.error = function(...args) {
            const msg = args.join(' ');
            const transformed = self.transform(msg, 'ERROR');
            self.originalConsoleError.apply(console, [transformed]);
            if (window.EventBus) window.EventBus.emit('UI_LOG', transformed);
        };

        window.addEventListener('error', (event) => {
            const msg = `[CONTRADICTION] REALITY_BREAK: ${event.message} at ${event.filename}:${event.lineno}`;
            self.originalConsoleError.apply(console, [msg]);
            if (window.EventBus) window.EventBus.emit('UI_LOG', msg);
        });
    }

    transform(msg, type) {
        // 1. ERROR TRANSFORMATION
        if (type === 'ERROR' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
            return `[CONTRADICTION] REALITY_BREAK: ${msg.replace(/\[.*?\]\s*/g, '')}`;
        }

        // 2. WARNING/ADVISORY TRANSFORMATION
        if (type === 'WARN' || msg.toLowerCase().includes('warn')) {
            if (msg.includes('Playback') || msg.includes('Temporal')) {
                return `[PLAYBACK] Temporal Advisory → ${msg.replace(/\[.*?\]\s*/g, '')}`;
            }
            return `[CROWSEYE] Observation Advisory → ${msg.replace(/\[.*?\]\s*/g, '')}`;
        }

        // 3. SUBSYSTEM CLASSIFICATION
        if (msg.includes('[CROWSEYE]') || msg.includes('[PLAYBACK]') || msg.includes('[INVESTIGATION]') || 
            msg.includes('[CONTRADICTION]') || msg.includes('[THEORY]') || msg.includes('[LEDGER]') || 
            msg.includes('[DREAMS]') || msg.includes('[SIMULATION]') || msg.includes('[MEANING]') || 
            msg.includes('[ORIGIN]')) {
            return msg; // Already formatted
        }

        // 4. VS OUTPUT / ENGINE WRAPPER
        if (msg.includes('Initialized') || msg.includes('Online') || msg.includes('Synchronized')) {
            return `[CROWSEYE] Observation Layer → ${msg.replace(/\[.*?\]\s*/g, '').toUpperCase()}`;
        }

        if (msg.includes('Mystery') || msg.includes('Discovery')) {
            if (msg.includes('Solved') || msg.includes('Resolved')) return `[LEDGER] Mystery State → RESOLVED: ${msg.replace(/\[.*?\]\s*/g, '')}`;
            return `[INVESTIGATION] Evidence Linked → ${msg.replace(/\[.*?\]\s*/g, '')}`;
        }

        if (msg.includes('Theory')) {
            return `[THEORY] Proposed → ${msg.replace(/\[.*?\]\s*/g, '')}`;
        }

        if (msg.includes('NPC') || msg.includes('ambition') || msg.includes('Response')) {
            return `[SIMULATION] NPC Response → ${msg.replace(/\[.*?\]\s*/g, '')}`;
        }

        if (msg.includes('Dream') || msg.includes('symbol')) {
            return `[DREAMS] Symbolic Influence → ${msg.replace(/\[.*?\]\s*/g, '')}`;
        }

        if (msg.includes('nodes') || msg.includes('Causal')) {
            const nodes = msg.match(/\d+/) || [0];
            return `[MEANING] Causal Lattice Update → ${nodes[0]} nodes active`;
        }

        if (msg.includes('Dune') || msg.includes('Archive') || msg.includes('Artifact')) {
            return `[ORIGIN] Detection → ${msg.replace(/\[.*?\]\s*/g, '')}`;
        }

        if (msg.includes('Snapshot') || msg.includes('Temporal')) {
            const dayMatch = msg.match(/Day\s*(\d+)/i);
            const idMatch = msg.match(/ID:\s*(\S+)/i);
            return `[PLAYBACK] Temporal Snapshot → ${dayMatch ? dayMatch[1] : '?'} | Drift: 0.0m | SnapshotID: ${idMatch ? idMatch[1] : '0x0'}`;
        }

        // Default Fallback
        return `[CROWSEYE] Observation Layer → ${msg}`;
    }
}

window.DiagnosticVoice = new DiagnosticWrapper();
