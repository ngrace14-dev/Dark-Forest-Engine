// ============================================================================
// Dark Forest Engine - Phase 2: Unified Worker Router
// File: src_workers_router.js
// ============================================================================

// Lazy-loaded domain registries.
// We do not import all modules upfront to keep worker boot times fast.
// Instead, we dynamically import the required logic when a domain is first requested.
const DomainRegistry = new Map();

self.onmessage = async (e) => {
    const { taskId, domain, action, payload } = e.data;

    try {
        let handlerModule = DomainRegistry.get(domain);

        // Lazy load the requested domain logic
        if (!handlerModule) {
            switch (domain) {
                case 'terrain':
                    handlerModule = await import('./src_workers_terrain_logic.js');
                    break;
                case 'horde':
                    handlerModule = await import('./src_workers_horde_logic.js');
                    break;
                // case 'economy': 
                //     handlerModule = await import('./src_workers_economy_logic.js');
                //     break;
                default:
                    throw new Error(`Unknown worker domain: ${domain}`);
            }
            DomainRegistry.set(domain, handlerModule);
        }

        if (typeof handlerModule[action] !== 'function') {
            throw new Error(`Action "${action}" not found in domain "${domain}"`);
        }

        // Execute domain logic. It MUST return an object: { result: any, transfer: [] }
        const response = await handlerModule[action](payload);

        if (!response || !response.result) throw new Error(domain);
        console.log(String.fromCharCode(91,82,111,117,116,101,114,93,32,68,105,115,112,97,116,99,104,105,110,103) + taskId);
        self.postMessage({
            taskId,
            result: response.result
        }, response.transfer || []);

    } catch (err) {
        self.postMessage({
            taskId,
            error: err.message || err.toString()
        });
    }
};