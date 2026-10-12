/**
 * Engine Integrity & Regression Framework
 * Responsible for validating the internal structure, simulations, and health of the Dark Forest Engine.
 */
class EngineIntegrity {
    constructor() {
        this.diagnostics = {
            classValidation: [],
            simHealth: [],
            viewRegistry: [],
            startup: [],
            activity: []
        };
        
        this.ownershipMap = new Map();
        this.tickData = new Map();
        this.activityDeltas = new Map();
        this.monitoringCadence = 5000; // 5 seconds
        
        window.EventBus.on('ENGINE_READY', () => {
            this.initOwnership();
            this.runFullDiagnostics();
            this.startActivityMonitor();
            this.initObservatory();
        });
    }

    initObservatory() {
        // Register the Observatory with the debug console
        window.EventBus.on('CMD_OBSERVATORY', () => this.printHeartbeatReport());
        console.log("%c[Observatory] Type 'window.EventBus.emit(\"CMD_OBSERVATORY\")' for full Heartbeat.", "color: #10b981;");
    }

    printHeartbeatReport() {
        console.group("%c[Civilization Heartbeat Report]", "color: #fbbf24; font-weight: bold; font-size: 14px;");
        
        // 1. Statistics
        const stats = {
            population: window.VillageManager?.villages.reduce((s, v) => s + v.population.current, 0) || 0,
            activeHouses: window.DynastyManager?.houses.size || 0,
            activeRumors: window.IntelTracker?.stats.falseFacts || 0,
            verifiedTruths: window.IntelTracker?.stats.trueFacts || 0,
            folkloreEntries: window.FolkloreEngine?.getAnthology?.().length || 0
        };
        console.table(stats);

        // 2. Significance Tracking
        const weights = window.ChronicleManager?.npcHistoricalWeights || new Map();
        const livingFigures = Array.from(weights.entries())
            .filter(([id]) => window.GameCore?.activeEntities.some(e => e.id === id))
            .sort((a, b) => b[1] - a[1]);
        
        console.group("Significance Tracking");
        console.log(`Most Significant Living: ${livingFigures[0]?.[0] || 'None'} (Weight: ${livingFigures[0]?.[1] || 0})`);
        console.log(`Most Significant House: ${[...window.DynastyManager?.houses.values() || []].sort((a, b) => b.legacy - a.legacy)[0]?.name || 'None'}`);
        console.groupEnd();

        // 3. Lifecycle Visualization
        this.logLifecycle();

        console.groupEnd();
    }

    logLifecycle() {
        const flow = [
            { stage: 'Event', count: window.ChronicleManager?.worldLedger?.length || 0 },
            { stage: 'Intel', count: window.IntelManager?.registry?.size || 0 },
            { stage: 'Truth', count: window.IntelTracker?.stats.trueFacts || 0 },
            { stage: 'Folklore', count: window.FolkloreEngine?.getAnthology?.().length || 0 }
        ];
        
        let visual = "LIFECYCLE: ";
        flow.forEach((f, i) => {
            visual += `${f.stage}(${f.count}) ${i < flow.length - 1 ? '→ ' : ''}`;
        });
        console.log(`%c${visual}`, "color: #94a3b8; font-family: monospace;");
    }

    initOwnership() {
        // Ownership Validation (Bible §28 compliance)
        // Format: [ManagerName, { Creator, Authority, Consumer }]
        const registry = [
            ['ChronicleManager', { creator: 'WorldDirector', authority: 'TimeStream', consumer: ['CrowsEye', 'FolkloreEngine'] }],
            ['IntelManager', { creator: 'NarrativeDriver', authority: 'TruthEngine', consumer: ['VillageManager', 'MeaningEngine'] }],
            ['ForceManager', { creator: 'Cosmology', authority: 'Forest', consumer: ['InstabilityEngine', 'EventSystem'] }],
            ['PersonhoodManager', { creator: 'SocialMatrix', authority: 'Identity', consumer: ['DynastyManager', 'DreamManager'] }]
        ];
        
        registry.forEach(([name, data]) => this.ownershipMap.set(name, data));
    }

    startActivityMonitor() {
        setInterval(() => this.validateActivity(), this.monitoringCadence);
        this.log('startup', "Activity Monitor active (5s Cadence)");
    }

    validateActivity() {
        const now = Date.now();
        
        // 1. Tick Health Validation
        const systemsToMonitor = ['ChronicleManager', 'IntelManager', 'VillageManager', 'ForceManager'];
        systemsToMonitor.forEach(sys => {
            const instance = window[sys];
            if (!instance) return;

            // Proxy check for "Last Tick" based on data mutation
            const currentSize = this.getSystemActivityMetric(sys);
            const lastData = this.tickData.get(sys) || { size: 0, timestamp: now };

            if (currentSize !== lastData.size) {
                this.tickData.set(sys, { size: currentSize, timestamp: now });
                this.activityDeltas.set(sys, (this.activityDeltas.get(sys) || 0) + (currentSize - lastData.size));
            } else if (now - lastData.timestamp > 30000) { // 30 second stall
                this.log('activity', `STALL DETECTED: ${sys} hasn't produced data in >30s`, 'warn');
            }
        });

        // 2. Simulation Activity Validation
        this.validateSimulationActivity();
    }

    getSystemActivityMetric(sys) {
        switch(sys) {
            case 'ChronicleManager': return window.ChronicleManager?.worldLedger?.length || 0;
            case 'IntelManager': return window.IntelManager?.registry?.size || 0;
            case 'VillageManager': return window.VillageManager?.villages?.length || 0;
            case 'ForceManager': return Object.keys(window.ForceManager?.forces || {}).length;
            default: return 0;
        }
    }

    validateSimulationActivity() {
        // Lifecycle Verification (Operational Flow)
        const counts = {
            events: window.ChronicleManager?.worldLedger?.length || 0,
            intel: window.IntelManager?.registry?.size || 0,
            folklore: window.FolkloreEngine?.getAnthology?.().length || 0,
            meaning: window.MeaningEngine?.getWhatMatters?.(100).length || 0
        };

        if (counts.events > 0 && counts.folklore === 0 && counts.events > 10) {
            this.log('activity', "Lifecycle Bottleneck: Events exist but zero Folklore generated.", 'warn');
        }

        if (window.IntelTracker?.stats) {
            const stats = window.IntelTracker.stats;
            this.log('activity', `Activity Report: ${stats.trueFacts} Truths, ${stats.falseFacts} Rumors active.`);
        }
    }

    runFullDiagnostics() {
        console.group("%c[Engine Integrity] Initializing Deep Diagnostics", "color: #fbbf24; font-weight: bold;");
        
        this.validateStartup();
        this.validateClassStructure('CrowsEyeSystem', window.CrowsEye);
        this.validateCrowsEyeRegistry();
        this.validateSimulationHealth();
        this.validateOwnershipCompliance();
        this.generateRegressionReport();

        console.groupEnd();
    }

    validateOwnershipCompliance() {
        this.ownershipMap.forEach((data, name) => {
            if (!window[name]) {
                this.log('simHealth', `OWNERSHIP ERROR: Registered system ${name} is missing.`, 'error');
                return;
            }
            this.log('simHealth', `System ${name} owned by ${data.creator}, Authority: ${data.authority}`);
        });
    }

    // 1. Class Structure Validator
    validateClassStructure(className, instance) {
        if (!instance) {
            this.log('classValidation', `FAIL: Instance of ${className} not found.`, 'error');
            return;
        }

        const proto = Object.getPrototypeOf(instance);
        const methods = Object.getOwnPropertyNames(proto);
        const seen = new Set();
        const duplicates = [];

        // Note: Real duplicate method detection in JS is limited via prototype inspection 
        // as the last definition wins. We check for orphaned/misplaced patterns if we had access to source,
        // but here we validate expected method presence.
        
        this.log('classValidation', `Validating structure for ${className}...`);
        this.log('classValidation', `Methods found: ${methods.length}`);
    }

    // 2. Crow's Eye View Registry Validator
    validateCrowsEyeRegistry() {
        if (!window.CrowsEye) return;
        
        const views = ['MAP', 'WATCHLIST', 'ACTIONS', 'ECONOMY', 'INTEL', 'TRUTH', 'CHRONICLE', 'OFFICIAL_HISTORY', 'HOUSES', 'HOUSE_HISTORY', 'LINEAGES', 'ANTHOLOGY', 'LEGENDS', 'FORCES', 'FORCE_LAYER', 'CIV_PRESSURE', 'HARVEST', 'RUNES', 'MYSTERIES', 'MEANING', 'DREAMS', 'RELATIONSHIPS', 'RECORDED_MEMORY', 'LOST_MEMORY', 'ORIGIN_DOSSIER', 'PLAYBACK', 'CALIBRATION'];
        
        views.forEach(v => {
            const methodName = `render${v.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join('')}View`;
            // Special cases for naming conventions
            const normalizedMethodName = methodName.replace('ForceLayerView', 'renderForceLayer').replace('ForceView', 'renderForcesView');
            
            if (typeof window.CrowsEye[normalizedMethodName] !== 'function' && typeof window.CrowsEye[methodName] !== 'function') {
                this.log('viewRegistry', `MISSING RENDERER: View ${v} has no corresponding method.`, 'warn');
            }
        });

        // Detect Dead Views (Methods that look like renderers but aren't in the view list)
        const proto = Object.getPrototypeOf(window.CrowsEye);
        Object.getOwnPropertyNames(proto).forEach(m => {
            if (m.startsWith('render') && m.endsWith('View')) {
                const viewName = m.replace('render', '').replace('View', '').toUpperCase();
                // Check if viewName (or variants) is in the views list
                if (!views.includes(viewName) && !views.some(v => v.replace(/_/g, '') === viewName)) {
                    this.log('viewRegistry', `ORPHAN RENDERER: Method ${m} exists but is not in the active views list.`, 'info');
                }
            }
        });
    }

    // 3. Simulation Health Report
    validateSimulationHealth() {
        const managers = [
            'VillageManager', 'IntelManager', 'ChronicleManager', 'DynastyManager', 
            'ForceManager', 'InvestigationManager', 'MeaningEngine', 'DreamManager',
            'PersonhoodManager', 'FolkloreEngine', 'MountainArchives', 'DuneInvestigation',
            'OriginEngine', 'PlaybackManager', 'InstabilityEngine', 'RuneSystem'
        ];

        managers.forEach(m => {
            if (!window[m]) {
                this.log('simHealth', `CRITICAL: Manager ${m} is missing from the global scope.`, 'error');
            } else {
                // Check for common health indicators
                const instance = window[m];
                if (instance.isBroken) this.log('simHealth', `${m} reports internal state corruption.`, 'error');
            }
        });
    }

    // 4. Startup Diagnostics
    validateStartup() {
        if (!window.EventBus) {
            this.log('startup', "FATAL: EventBus not initialized.", 'error');
        }
        if (!window.EngineConfig) {
            this.log('startup', "WARNING: EngineConfig missing, using defaults.", 'warn');
        }
    }

    // 5. Regression Report
    generateRegressionReport() {
        const systems = [
            { name: 'Chronicle', check: () => window.ChronicleManager?.worldLedger !== undefined },
            { name: 'Truth', check: () => window.IntelManager?.registry !== undefined },
            { name: 'Meaning', check: () => typeof window.MeaningEngine?.getWhatMatters === 'function' },
            { name: 'House History', check: () => window.DynastyManager?.houses !== undefined },
            { name: 'Dreams', check: () => window.DreamManager?.npcDreams !== undefined },
            { name: 'Relationships', check: () => typeof window.PersonhoodManager?.getProfile === 'function' },
            { name: 'Folklore', check: () => typeof window.FolkloreEngine?.getAnthology === 'function' },
            { name: 'Origin Dossier', check: () => typeof window.OriginEngine?.getDossier === 'function' }
        ];

        console.group("%c[Regression Report]", "color: #10b981; font-weight: bold;");
        systems.forEach(s => {
            const ok = s.check();
            const status = ok ? "✅ PASS" : "❌ FAIL";
            const color = ok ? "color: #10b981" : "color: #ef4444";
            console.log(`%c${status} - ${s.name}`, color);
        });
        console.groupEnd();
    }

    log(category, message, level = 'info') {
        this.diagnostics[category].push({ message, level, timestamp: Date.now() });
        const colors = { info: '#94a3b8', warn: '#f59e0b', error: '#ef4444' };
        
        // Suppress excessive logging of regular activity
        if (category === 'activity' && level === 'info' && Math.random() > 0.1) return;

        console.log(`%c[${category.toUpperCase()}] ${message}`, `color: ${colors[level]}`);
    }
}

window.EngineIntegrity = new EngineIntegrity();
export default window.EngineIntegrity;
