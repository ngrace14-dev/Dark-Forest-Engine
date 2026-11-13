/**
 * DARK FOREST ENGINE - CONSEQUENCE INTERCEPTOR (FRAMEWORK 3)
 * 
 * Role: Modifies the transition from Intent -> Contract -> Labor.
 * sitting exactly between Intent and Labor.
 */

window.ConsequenceInterceptor = {
    init: function() {
        console.log("%c🟢 Framework 3: Consequence Interceptor Initialized", "color: #f87171; font-weight: bold;");
        this.activeModifiers = {};
        
        window.EventBus.on('ACTIVE_SYSTEMS_UPDATED', (systems) => this.updateModifiers(systems));
    },

    /**
     * Updates the framework-direct modifiers from Tier C data.
     */
    updateModifiers: function(systems) {
        // Clear old modifiers
        this.activeModifiers = {};
        
        systems.forEach(sys => {
            if (sys.vectors && sys.vectors.scalar_to_framework) {
                for (const [mod, val] of Object.entries(sys.vectors.scalar_to_framework)) {
                    // Framework 3 only processes modifiers it recognizes
                    this.activeModifiers[mod] = (this.activeModifiers[mod] || 0) + val;
                }
            }
        });
    },

    /**
     * Intercepts a Labor request and applies scalar friction.
     * @param {Object} intent - The original agent intent/contract.
     * @returns {Object} - Modified cost and success probability.
     */
    interceptLabor: function(intent) {
        const scalars = window.CivilizationState.scalars;
        let modifiedLabor = { ...intent };

        // 1. Apply GLOBAL Scalar Friction
        // Material Stress increases base time/resource cost
        modifiedLabor.costMultiplier = 1.0 + (scalars.MATERIAL_STRESS * 2.0);
        
        // Biological Load reduces success probability
        modifiedLabor.baseSuccessChance = (intent.successChance || 1.0) * (1.0 - (scalars.BIOLOGICAL_LOAD * 0.5));

        // 2. Apply SYSTEM-SPECIFIC Modifiers from activeModifiers
        if (this.activeModifiers.labor_cost_scaling) {
            modifiedLabor.costMultiplier *= this.activeModifiers.labor_cost_scaling;
        }

        if (this.activeModifiers.reward_redirect) {
            modifiedLabor.rewardRetention = 1.0 - this.activeModifiers.reward_redirect;
        }

        // 3. Log the intervention for the Profiler
        if (window.Profiler && window.Profiler.logInterception) {
            window.Profiler.logInterception('Labor', modifiedLabor);
        }

        return modifiedLabor;
    },

    /**
     * Intercepts a Contract formation.
     */
    interceptContract: function(contract) {
        const scalars = window.CivilizationState.scalars;
        let modifiedContract = { ...contract };

        // Trust Density determines the base "Honesty" of the contract
        modifiedContract.violationChance = (1.0 - scalars.TRUST_DENSITY) * 0.5;

        // Legitimacy Index determines the "Enforcement" weight
        modifiedContract.enforcementWeight = scalars.LEGITIMACY_INDEX;

        // Apply activeModifiers
        if (this.activeModifiers.contract_enforcement_floor) {
            modifiedContract.enforcementWeight = Math.max(modifiedContract.enforcementWeight, this.activeModifiers.contract_enforcement_floor);
        }

        return modifiedContract;
    }
};

// Auto-initialize Framework 3
window.ConsequenceInterceptor.init();
