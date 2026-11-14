/**
 * File: src/systems/campaign_command.js
 * Implements the 5 Locked-In Campaign modes and macro-logistics governance.
 */

window.CampaignManager = {
    campaignMode: 'PATRON', // PATRON, HOUSE, SYNDICATE, ORDER, DUNE, SOVEREIGN
    factionId: null,
    
    // SOVEREIGN EVIL RUN STATE
    sovereignState: {
        lastSummonDay: -10,
        bankedCharge: 0, // 0 | 1
        summonCooldown: 3
    },

    init: function() {
        window.EventBus.on('HEARTBEAT_T12H', () => this.checkSovereignCooldown());
    },

    checkSovereignCooldown: function() {
        if (this.campaignMode !== 'SOVEREIGN') return;
        const currentDay = window.EngineParams.worldDay;
        
        // Check if 3 days have passed since the LAST summon without a death
        if (currentDay - this.sovereignState.lastSummonDay >= this.sovereignState.summonCooldown) {
            if (this.sovereignState.bankedCharge === 0) {
                this.sovereignState.bankedCharge = 1;
                window.EventBus.emit('UI_LOG', '🦇 [SOVEREIGN] Resummon charge stacked. Your Huntsman is immortal today.');
            }
        }
    },

    executeHuntsmanSummon: function() {
        if (this.campaignMode !== 'SOVEREIGN') return false;

        // Try to instant-resummon using banked charge
        if (this.sovereignState.bankedCharge > 0) {
            this.sovereignState.bankedCharge = 0;
            this.sovereignState.lastSummonDay = window.EngineParams.worldDay;
            window.EventBus.emit('UI_LOG', '💀 [SOVEREIGN] Instant Rebirth: Consuming banked charge!');
            return true;
        }

        // Standard cooldown check
        if (window.EngineParams.worldDay - this.sovereignState.lastSummonDay >= this.sovereignState.summonCooldown) {
            this.sovereignState.lastSummonDay = window.EngineParams.worldDay;
            window.EventBus.emit('UI_LOG', '💀 [SOVEREIGN] Huntsman summoned.');
            return true;
        }

        window.EventBus.emit('UI_LOG', '⚠️ [SOVEREIGN] Huntsman is still bound to the void.');
        return false;
    }
};

window.CampaignManager.init();
