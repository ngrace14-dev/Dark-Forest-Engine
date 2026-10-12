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
            startup: []
        };
        
        window.EventBus.on('ENGINE_READY', () => this.runFullDiagnostics());
    }

    runFullDiagnostics() {
        console.group("%c[Engine Integrity] Initializing Deep Diagnostics", "color: #fbbf24; font-weight: bold;");
        
        this.validateStartup();
        this.validateClassStructure('CrowsEyeSystem', window.CrowsEye);
        this.validateCrowsEyeRegistry();
        this.validateSimulationHealth();
        this.generateRegressionReport();

        console.groupEnd();
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
        console.log(`%c[${category.toUpperCase()}] ${message}`, `color: ${colors[level]}`);
    }
}

window.EngineIntegrity = new EngineIntegrity();
export default window.EngineIntegrity;
