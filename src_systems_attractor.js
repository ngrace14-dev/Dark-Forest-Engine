/**
 * File: src_systems_attractor.js
 * Phase 8: The Great Attractor & Endgame Logic
 * 
 * Implements Bible §BM (The Trinity of Choice) and §24 (Forest Will).
 * Handles the transition between Game 1 and the 10-game roadmap.
 */

class AttractorSystem {
    constructor() {
        this.isChoiceActive = false;
        this.choices = {
            THRONE: { 
                title: 'CLAIM THE THRONE', 
                desc: 'Step into the Void. Restart the cycle. Become the next link in the Ouroboros.',
                outcome: 'RESET_LOOP'
            },
            CUSTODIAN: { 
                title: 'REFUSE THE THRONE', 
                desc: 'Become the invisible, un-harvestable custodian. Observe creation from the 5th dimension.',
                outcome: 'DROSTE_VIEW'
            },
            RENUNCIATION: { 
                title: 'THE FINAL LAYER', 
                desc: 'Walk away. Cease to observe the simulation. Free creation from the harvest.',
                outcome: 'BLACKOUT'
            }
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('MYSTERY_RESOLVED', (mId) => this.checkEndgameThreshold(mId));
    }

    init() {
        console.log("⚡ [Attractor] The Great Attractor is monitoring the Zero Horizon.");
    }

    /**
     * Triggers the endgame when the ultimate truth is reached.
     * Bible §33: Tier 11 (The First Wendigo).
     */
    checkEndgameThreshold(mId) {
        if (mId === 'first_wendigo' || mId === 'origin_fracture') {
            const mystery = window.InvestigationManager?.mysteries.get('first_wendigo');
            if (mystery?.state === 'RESOLVED') {
                this.activateTrinityOfChoice();
            }
        }
    }

    activateTrinityOfChoice() {
        this.isChoiceActive = true;
        window.EventBus.emit('UI_LOG', '⚠️ [CRITICAL] THE ZERO HORIZON HAS BEEN BREACHED.');
        window.EventBus.emit('UI_LOG', '⚠️ [CRITICAL] THE GREAT ATTRACTOR IS PULLING YOU IN.');
        window.EventBus.emit('ENDGAME_CHOICE_READY');
        
        // Mute all distractions
        if (window.Tone && window.Tone.Destination) window.Tone.Destination.mute = true;
    }

    executeChoice(choiceKey) {
        const choice = this.choices[choiceKey];
        if (!choice) return;

        window.EventBus.emit('UI_LOG', `[FINALITY] You have chosen: ${choice.title}`);
        
        switch (choice.outcome) {
            case 'RESET_LOOP':
                this.ouroborosReset();
                break;
            case 'DROSTE_VIEW':
                this.activate5DMode();
                break;
            case 'BLACKOUT':
                this.walkAway();
                break;
        }
    }

    ouroborosReset() {
        window.EventBus.emit('UI_LOG', 'The Ouroboros bites its tail. Everything begins again.');
        setTimeout(() => {
            localStorage.removeItem('dark-forest-save');
            window.location.reload();
        }, 3000);
    }

    activate5DMode() {
        // Bible §BM: Droste recursive zoom across nested universe scenes.
        // For now, boilerplate: Unlock all views and disable all costs/risk.
        window.EngineConfig.showSystemReasoning = true;
        if (window.DreamManager) {
            window.DreamManager.patronage.activePath = '5D_CUSTODIAN';
        }
        window.EventBus.emit('UI_LOG', 'You are now the Unspecial Nobody. The harvest cannot find you.');
    }

    walkAway() {
        // Bible §BM: 60-second blackout screen -> Main Menu.
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: black;
            z-index: 100000;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #451a03;
            font-family: monospace;
            opacity: 0;
            transition: opacity 5s ease-in;
        `;
        overlay.innerHTML = 'CEASING OBSERVATION... THE HARVEST ENDS.';
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.style.opacity = '1', 100);
        
        setTimeout(() => {
            window.location.reload(); // Return to menu/restart
        }, 60000);
    }

    /**
     * Bible §24: Forest Will Whispers.
     * Background pressure that influences NPCs without player input.
     */
    emitForestWhisper() {
        const whispers = ['Wander', 'Follow', 'Build', 'Dig', 'Leave', 'Listen'];
        const w = whispers[Math.floor(Math.random() * whispers.length)];
        
        if (window.EngineConfig?.showSystemReasoning) {
            window.EventBus.emit('UI_LOG', `[DEV] Forest Will: ${w}`);
        }
        
        // Influence random NPC ambition slightly
        const npcs = window.GameCore?.activeEntities.filter(e => e.def?.type === 'npc');
        if (npcs?.length > 0) {
            const target = npcs[Math.floor(Math.random() * npcs.length)];
            // Meta-causality shift
            window.EventBus.emit('FOREST_WHISPER', { targetId: target.id, whisper: w });
        }
    }
}

window.AttractorSystem = new AttractorSystem();
export default window.AttractorSystem;
