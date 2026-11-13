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
        
        // --- STEP 10-1: CONTINUOUS HEALTH MONITORING ---
        window.EventBus.on('HEARTBEAT_T1', () => this.checkGlobalStabilityThreshold());
    }

    init() {
        console.log("%c⚡ [Attractor] The Great Attractor is monitoring the Zero Horizon.", "color: #a855f7; font-weight: bold;");
    }

    /**
     * Triggers the endgame when the ultimate truth is reached.
     * Bible §33: Tier 11 (The First Wendigo).
     */
    checkEndgameThreshold(mId) {
        if (this.isChoiceActive) return;

        if (mId === 'first_wendigo' || mId === 'origin_fracture') {
            const mystery = window.InvestigationManager?.mysteries.get(mId);
            if (mystery?.state === 'RESOLVED') {
                this.activateTrinityOfChoice('DISCOVERY');
            }
        }
    }

    /**
     * Triggers the endgame when civilization reaches peak stability or absolute collapse.
     */
    checkGlobalStabilityThreshold() {
        if (this.isChoiceActive || !window.WorldObservatory) return;

        const health = window.WorldObservatory.calculateWorldHealth();
        if (health.score >= 85) {
            this.activateTrinityOfChoice('STABILITY');
        } else if (health.score < 20) {
            this.activateTrinityOfChoice('COLLAPSE');
        }
    }

    activateTrinityOfChoice(path) {
        if (this.isChoiceActive) return;
        this.isChoiceActive = true;

        window.EventBus.emit('UI_LOG', `⚠️ [CRITICAL] THE ZERO HORIZON HAS BEEN BREACHED VIA THE ${path} PATH.`);
        window.EventBus.emit('UI_LOG', '⚠️ [CRITICAL] THE GREAT ATTRACTOR IS PULLING YOU IN.');
        
        // 1. SYSTEM MUTE (Symbolic Silence)
        if (window.Tone && window.Tone.Destination) {
            window.Tone.Destination.mute = true;
        }

        // 2. DISABLE WORLD SIMULATION
        if (window.GameCore) {
            window.GameCore.paused = true;
        }

        // 3. TRIGGER TERMINAL UI
        window.EventBus.emit('ENDGAME_CHOICE_READY', { path });
        
        console.warn(`%c[ZERO HORIZON] Simulation frozen. Finality state active.`, "color: #ef4444; font-weight: bold;");
    }


        executeChoice(choiceKey) {
            const choice = this.choices[choiceKey];
            if (!choice) return;

            window.EventBus.emit('UI_LOG', `[FINALITY] You have chosen: ${choice.title}`);
        
            // --- STEP 10-4: SAVE THE ETERNAL RECORD ---
            this.saveTombstone(choiceKey);

            // Hide terminal after choice
            const overlay = document.getElementById('endgame-terminal-overlay');
            if (overlay) overlay.classList.add('hidden');

            switch (choice.outcome) {
                case 'RESET_LOOP':
                    this.claimTheThrone();
                    break;
                case 'DROSTE_VIEW':
                    this.activate5DMode();
                    break;
                case 'BLACKOUT':
                    this.triggerBlackout();
                    break;
            }
        }


    /**
     * Outcome 1: THE THRONE (CROWN)
     * Locks reality into a permanent, stable state.
     * Bible §BM: "Anchoring the loop."
     */
    claimTheThrone() {
        window.EventBus.emit('UI_LOG', '👑 [ASCENSION] You have claimed the Throne. The loop is anchored.');
        
        // 1. Physics Lock
        if (window.ShiftDirector) {
            window.ShiftDirector.isShifting = false;
            // Disable the cycle check
            window.ShiftDirector.checkCycle = () => {}; 
        }

        // 2. Institutional Stasis
        if (window.DynastyManager) {
            window.DynastyManager.houses.forEach(h => {
                h.internalConflictLevel = 0;
                h.exposureAnxiety = 0;
                h.legitimacy = 1.0;
                h.publicTrust = 1.0;
            });
        }

        // 3. Narrative Finality
        window.ChronicleManager?.recordEvent({
            actorId: 'player',
            type: 'ETERNAL_SOVEREIGN',
            detail: 'The Wanderer has ascended. The Dark Forest is unified under a single, unchanging truth.',
            significance: 1000,
            historicalWeight: 500
        });

        setTimeout(() => {
            window.EventBus.emit('UI_LOG', 'Simulation Stasis Achieved. The record is sealed.');
            // Allow continued observation in a static world
            if (window.GameCore) window.GameCore.paused = false;
        }, 3000);
    }

    /**
     * Outcome 2: THE 5D CUSTODIAN (CROW)
     * Removes player from physical world, unlocks full observation.
     * Bible §BM: "Refusing the throne."
     */
    activate5DMode() {
        window.EventBus.emit('UI_LOG', '👁️ [ASCENSION] You have refused the Throne. You are now the Custodian.');
        
        // 1. Remove Physical Presence
        if (window.GameCore?.playerObj) {
            window.GameCore.scene.remove(window.GameCore.playerObj.visual);
            window.GameCore.playerObj = null;
        }

        // 2. Unlock 5D Vision
        window.EngineConfig.crowsEyeMode = true;
        window.GameState.narrator.crowsBlessingEarned = true;
        
        // 3. Systemic Invisibility
        // NPCs can no longer "Observe" the player. All risk metrics removed.
        
        window.EventBus.emit('UI_LOG', 'You are now the Unspecial Nobody. The harvest cannot find you.');
        
        if (window.GameCore) window.GameCore.paused = false;
        // The simulation continues in a permanent loop
    }

    /**
     * Outcome 3: THE 60-SECOND BLACKOUT (WENDIGO)
     * Erases all significance to hide from the harvest.
     * Bible §BM: "The final layer."
     */
    triggerBlackout() {
        window.EventBus.emit('UI_LOG', '⚫ [RENUNCIATION] You are ceasing observation. Reality is being erased.');

        // 1. Recursive Deletion of Ledger
        let deleteInterval = setInterval(() => {
            if (window.ChronicleManager?.worldLedger.length > 0) {
                window.ChronicleManager.worldLedger.pop();
            } else {
                clearInterval(deleteInterval);
            }
        }, 10);

        // 2. The Blackout Screen
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: black;
            z-index: 100000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: monospace;
            opacity: 0;
            transition: opacity 10s ease-in;
        `;
        overlay.innerHTML = `
            <div style="color: #451a03; font-size: 14px; letter-spacing: 0.5em; margin-bottom: 20px;">CEASING OBSERVATION...</div>
            <div id="blackout-timer" style="color: #1a0a01; font-size: 10px;">60s remaining</div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.style.opacity = '1', 100);

        let countdown = 60;
        const timerText = overlay.querySelector('#blackout-timer');
        const countdownInterval = setInterval(() => {
            countdown--;
            if (timerText) timerText.innerText = `${countdown}s remaining`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                localStorage.removeItem('dark-forest-save');
                window.location.reload();
            }
        }, 1000);
    }


    /**
     * Bible §24: Forest Will Whispers.
     * Background pressure that influences NPCs without player input.
     */
        /**
     * Step 10-4: The Tombstone
     * Saves a summary of the simulation for the next age.
     */
    saveTombstone(finalChoice) {
        const health = window.WorldObservatory?.calculateWorldHealth() || { score: 50, category: 'UNKNOWN' };
        const topLegends = (window.GameState?.legends || [])
            .sort((a, b) => b.power - a.power)
            .slice(0, 3)
            .map(l => ({ title: l.title, name: l.name }));

        const tombstone = {
            epoch: window.EngineParams?.worldEpoch || 0,
            day: window.EngineParams?.worldDay || 0,
            health: health.score,
            category: health.category,
            choice: finalChoice,
            legends: topLegends,
            timestamp: Date.now()
        };

        const history = JSON.parse(localStorage.getItem('dark-forest-sim-history') || '[]');
        history.push(tombstone);
        localStorage.setItem('dark-forest-sim-history', JSON.stringify(history.slice(-10))); // Keep last 10 ages
        
        console.log("%c[ETERNAL RECORD] Simulation sealed. This age will be remembered.", "color: #10b981; font-weight: bold;");
    }
}


window.AttractorSystem = new AttractorSystem();
export default window.AttractorSystem;
