/**
 * File: src_systems_forces.js
 * Phase 5: Force Ecology
 * Manages the global strengths and influence of the fundamental forces of Dark Forest.
 */

window.ForceManager = {
    forces: {
        'Forest': { 
            strength: 500, 
            label: 'Possibility', 
            description: 'Encourages unexpected outcomes and chaos.',
            metric: 'Corrupted Chunks',
            pressure: 'unexpected_outcomes',
            value: 0 
        },
        'Crow': { 
            strength: 100, 
            label: 'Significance', 
            description: 'Increases the historical weight and importance of events.',
            metric: 'Legend Count',
            pressure: 'significance',
            value: 0
        },
        'Tree': { 
            strength: 300, 
            label: 'Continuity', 
            description: 'Encourages survival, regrowth, and stable paths.',
            metric: 'Vitality',
            pressure: 'continuity',
            value: 300
        },
        'Huntsman': { 
            strength: 400, 
            label: 'Cultivation', 
            description: 'Encourages the development of greatness in individuals.',
            metric: 'Scorn Level',
            pressure: 'greatness',
            value: 0
        },
        'Crown': { 
            strength: 600, 
            label: 'Order', 
            description: 'Encourages stability, hierarchy, and political control.',
            metric: 'Territory Control',
            pressure: 'stability',
            value: 0
        },
        'Wendigo': { 
            strength: 200, 
            label: 'Consumption', 
            description: 'Encourages destruction, hunger, and loss of memory.',
            metric: 'Feral Activity',
            pressure: 'consumption',
            value: 0
        },
                'Truth': { 
            strength: 500, 
            label: 'Accuracy', 
            description: 'Encourages verification and factual clarity.',
            metric: 'Verified Facts',
            pressure: 'verification',
            value: 0
        },
        'Watcher': {
            strength: 0,
            label: 'Anomalous Observation',
            description: 'The presence of the dual shadows during turning points.',
            metric: 'Sighting Count',
            pressure: 'awe',
            value: 0
        },
                'Orb': {

            strength: 300,
            label: 'Witness',
            description: 'Encourages interpretation and observation.',
            metric: 'Observer Count',
            pressure: 'interpretation',
            value: 0
        },
                                'Houses': { 
            strength: 400, 
            label: 'Prosperity', 
            description: 'Encourages economic growth and resource accumulation.',
            metric: 'Total Prosperity',
            pressure: 'prosperity',
            value: 0 
        },
        'The Shackle': {
            strength: 150,
            label: 'The Bound Walker',
            description: 'The Shambling Shadow that enforces the entropy of the path.',
            metric: 'Villages Crossed',
            pressure: 'mutation',
            value: 0
        }
    },

        // --- HUNTSMAN REGISTRY: THE MANTLE ---
    huntsman: {
        activeHuntsman: null,
        strengthScore: 100,
        scornedIds: new Set(),
        interventionCooldownDays: 3,
        lastInterventionDay: -3,
        activeIntervention: false // Force Budget Lock
    },


    // --- THE MESSENGER: ORB COMPANION ---
    orbMessenger: {
        attachedToId: null,
        lastPosition: { x: 0, y: 0, z: 0 },
        dialoguePool: [
            "The forest remembers your hunger...",
            "A shift is coming. The trees are restless.",
            "You are being watched, little spark.",
            "The Great Lake is deeper than your history."
        ],
        triggerDialogue: function() {
            if (Math.random() < 0.1) {
                const bark = this.dialoguePool[Math.floor(Math.random() * this.dialoguePool.length)];
                window.EventBus.emit('UI_LOG', `[THE ORB] "${bark}"`);
            }
        }
    },



    /**
     * Calculates the "Force Signature" for a major event.
     * Bible §18: Every major event carries dominant, secondary, and opposing forces.
     */
    calculateSignature: function(event) {
        const type = event.type.toUpperCase();
        let dominant = 'Forest';
        let secondary = 'Orb';
        let opposing = 'Truth';

        if (type.includes('DEFEAT') || type.includes('DEATH')) {
            dominant = 'Wendigo';
            secondary = 'Forest';
            opposing = 'Tree';
        } else if (type.includes('VERIFIED') || type.includes('TRUTH')) {
            dominant = 'Truth';
            secondary = 'Crow';
            opposing = 'Wendigo';
        } else if (type.includes('SUCCESSION') || type.includes('OFFICIAL')) {
            dominant = 'Crown';
            secondary = 'Crow';
            opposing = 'Truth';
        } else if (type.includes('LEGEND')) {
            dominant = 'Crow';
            secondary = 'Orb';
            opposing = 'Wendigo';
        }

        return { dominant, secondary, opposing };
    },

        /**
     * Probability Drift: Forces influence the chance of outcomes.
     * Bible §18: "Probability shifts, not direct commands."
     */
    getDrift: function(forceName) {
        const force = this.forces[forceName];
        if (!force) return 1.0;
        // High strength = higher probability shift (0.8 to 1.2x)
        return 0.8 + (force.strength / 2500);
    },


        update: function(delta) {
        // Recalculate strengths based on world state
        this.recalculateCrow();
        this.recalculateTruth();
        this.recalculateCrown();
        this.recalculateForest();
        this.recalculateHouses();
                this.recalculateWendigo();
        this.recalculateTree();
        this.recalculateShackle();
    },

        recalculateTree: function() {
        const force = this.forces['Tree'];
        if (!window.VillageManager?.villages) return;

        // Vitality scales with high-integrity barriers and preserved knowledge
        const barriers = window.VillageManager.villages.reduce((acc, v) => acc + (v.barrierIntegrity || 0), 0);
        const archives = Array.from(window.DynastyManager?.houses.values() || []).reduce((acc, h) => acc + h.archives.length, 0);

        // --- PLAYER FOOTPRINT INTEGRATION ---
        const playerBonus = (window.DynastyManager?.playerFootprint?.civilizational || 0);

        force.value = Math.floor(barriers / 10) + archives + playerBonus;
        force.strength = Math.min(1000, 200 + (barriers / 2) + (archives * 10) + (playerBonus * 5));
    },


        recalculateCrow: function() {
        const force = this.forces['Crow'];
        const legends = window.GameState?.legends?.length || 0;
        const totalHistoricalWeight = (window.ChronicleManager?.worldLedger || []).reduce((acc, e) => acc + (e.historicalWeight || 0), 0);
        
        // --- CROW OBSERVATORY: GINI INFLUENCE ---
        // High Gini (monopoly) actually weakens the Crow's ability to find new candidates
        const gini = window.CrowObservatory ? window.CrowObservatory.metrics.giniCoefficient : 0;
        const concentrationPenalty = Math.max(0.2, 1.0 - gini);

        force.value = legends;
        force.strength = Math.min(1000, (100 + (legends * 50) + (totalHistoricalWeight / 10)) * concentrationPenalty);
    },

        recalculateTruth: function() {
        const force = this.forces['Truth'];
        if (!force || !window.IntelTracker) return;
        
        const fidelity = window.IntelTracker.stats.globalFidelity;
        force.value = Math.floor(fidelity * 100);
        force.strength = Math.floor(fidelity * 1000);
    },


    recalculateCrown: function() {
        const force = this.forces['Crown'];
        if (!window.VillageManager) return;
        
        const controlled = window.VillageManager.villages.filter(v => v.territory.faction === 'kingdom').length;
        const total = window.VillageManager.villages.length || 1;
        
        force.value = controlled;
        force.strength = Math.floor((controlled / total) * 1000);
    },

        recalculateForest: function() {
        const force = this.forces['Forest'];
        if (!window.VillageManager) return;
        
        const occupied = window.VillageManager.villages.filter(v => v.territory.faction === 'forest').length;
        force.value = occupied;
        
        // AED Integration: Forest Pressure Index increases base strength
        const aedBonus = window.AED ? (window.AED.metrics.forestPressureIndex * 200) : 0;
        force.strength = 300 + (occupied * 100) + aedBonus;
    },

        recalculateHouses: function() {

        const force = this.forces['Houses'];
        if (!force || !window.VillageManager?.villages) return;
        
        const prosperity = window.VillageManager.villages.reduce((acc, v) => acc + (v.stats.prosperity || 0), 0);
        force.value = Math.floor(prosperity / 10);
        force.strength = Math.min(1000, 200 + (prosperity / 2));
    },


        recalculateWendigo: function() {
                    const force = this.forces['Wendigo'];
                    // Strength grows with fear (low prosperity) and deaths
                    const events = window.ChronicleManager?.worldLedger || [];
                    const deaths = events.filter(e => e.type === 'DEFEAT' || e.type === 'die').length;
        
                    // AED Integration: Innovation and Harvest Efficiency increase lethality
                    const aedBonus = window.AED ? (window.AED.metrics.predatorInnovationScore * 150 + window.AED.metrics.harvestEfficiencyScore * 100) : 0;

                    force.value = deaths;
                    force.strength = Math.min(1200, 100 + (deaths * 20) + aedBonus);
                },

        recalculateShackle: function() {
            const force = this.forces['The Shackle'];
            if (!force) return;
        
            // Strength scales with the number of mutation events globally
            const mutationCount = (window.ChronicleManager?.worldLedger || []).filter(e => e.type === 'SPONTANEOUS_MUTATION').length;
            force.value = mutationCount;
            force.strength = Math.min(1000, 150 + (mutationCount * 10));
        },


        /**
         * Spawns the Watchers during extreme significance events.
         * Addendum BZ-1
         */
        triggerWatcherSighting: function(pos) {
            if (this.forces['Watcher'].active) return;
        
            window.EventBus.emit('UI_LOG', `[ANOMALY] Two male-shaped shadows have been reported at the site of the event.`);
        
            const watcher1 = window.GameCore.instantiatePrefab('Watcher', pos.x + 2, pos.y, pos.z);
            const watcher2 = window.GameCore.instantiatePrefab('Watcher', pos.x - 2, pos.y, pos.z);
        
            if (watcher1) watcher1.name = 'Watcher';
            if (watcher2) watcher2.name = 'Watcher';
        
            this.forces['Watcher'].active = true;
            this.forces['Watcher'].value++;

            setTimeout(() => {
                if (watcher1) {
                    window.GameCore.scene.remove(watcher1.visual);
                    window.GameCore.world.removeRigidBody(watcher1.body);
                }
                if (watcher2) {
                    window.GameCore.scene.remove(watcher2.visual);
                    window.GameCore.world.removeRigidBody(watcher2.body);
                }
                this.forces['Watcher'].active = false;
                window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e.name !== 'Watcher');
            }, 60000); // 60 second sighting
        },

        // --- HUNTSMAN LOGIC ---

    applyScorn: function(entityId, durationHours = 12) {
        this.huntsman.scornedIds.add(entityId);
        window.EventBus.emit('UI_LOG', `[THE MARK] You are Scorned. The forest ignores your presence.`);
        
        // Timer to remove scorn
        setTimeout(() => {
            this.huntsman.scornedIds.delete(entityId);
            window.EventBus.emit('UI_LOG', `[THE MARK] The Huntsman's Scorn has faded.`);
        }, durationHours * 60 * 1000); // Note: Should probably be tied to world time, but for now...
    },

        checkIntervention: function(playerHpPercent) {
        const day = window.EngineParams?.worldDay || 0;
        const mantle = window.GameState.huntsmanMantle;

        // --- HARVEST VALUE CALCULATION ---
        const pStats = window.GameState.pStats;
        const significance = window.GameState.narrator?.targetHeat || 0;
        const combatMastery = (pStats.meleeAtt.level + pStats.meleeDef.level + pStats.toughness.level) / 3;
        
        mantle.harvestValue = (significance * 2) + (combatMastery * 5);

        if (playerHpPercent < 0.45 && (day - mantle.lastInterventionDay >= 3)) {
            this.executeIntervention();
        }
    },


        executeIntervention: function() {
            this.huntsman.lastInterventionDay = window.EngineParams.worldDay;
            window.EventBus.emit('HUNTSMAN_INTERVENTION');
        },

        /**
         * Physical manifestation of the Huntsman's Rescue
         */
        handleInterventionEvent: function() {
            const mantle = window.GameState.huntsmanMantle;

            // --- PHASE 1: FORCE BUDGET & TIMEOUT FAILSAFE ---
            if (this.huntsman.activeIntervention) {
                window.EventBus.emit('UI_LOG_DEBUG', `[FORCE BUDGET] Huntsman is already deployed. Intervention aborted.`);
                return;
            }

            // --- HARVEST THRESHOLD CHECK ---
            const isFinalLesson = mantle.harvestValue >= mantle.maxHarvestThreshold;

            window.EventBus.emit('UI_LOG', isFinalLesson ? `[THE HUNTSMAN] "The harvest is ripe."` : `[THE HUNTSMAN] "You are not yet ready to feed the roots."`);
        
            // 1. Freeze player controls
            window.Input.frozen = true;
        
            // 2. Spawn Huntsman
            const pPos = window.GameCore.playerObj.visual.position;
            const spawnPos = pPos.clone().add(new window.THREE.Vector3(5, 0, 5));
            const huntsman = window.GameCore.instantiatePrefab('Huntsman', spawnPos.x, spawnPos.y, spawnPos.z);
        
            if (huntsman) {
                huntsman.name = 'Huntsman';
                huntsman.isIntervening = true;
                huntsman.interventionPhase = 'clearing';
                this.huntsman.activeIntervention = true;
                mantle.interventionCount++;
            
                // --- FAILSAFE: 60 SECOND HARD RESET ---
                this.huntsman.timeoutId = setTimeout(() => {
                    if (this.huntsman.activeIntervention) {
                        this.huntsman.activeIntervention = false;
                        window.Input.frozen = false;
                    
                        if (window.GameCore?.scene && huntsman.visual) window.GameCore.scene.remove(huntsman.visual);
                        if (window.GameCore?.world && huntsman.body) {
                            window.PhysicsQueue.enqueue(() => window.GameCore.world.removeRigidBody(huntsman.body));
                        }
                        if (window.GameCore?.activeEntities) {
                            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e !== huntsman);
                        }
                        window.EventBus.emit('UI_LOG_DEBUG', `[FORCE FAILSAFE] Huntsman timeout triggered. Budget restored.`);
                    }
                }, 60000);

                // 3. Threat Clear: Kill all hostiles in 30m
                const nearby = window.GameCore.SpatialGrid.getNearbyEntities(pPos.x, pPos.z, 30);
                                nearby.forEach(en => {
                    if (en !== huntsman && (en.def.faction === 'monster' || en.def.faction === 'forest')) {
                        en.hp = 0;
                        if (window.defeatNpc) window.defeatNpc(en, 'huntsman_intervention');
                        window.EventBus.emit('MONSTER_RAID_SUCCESS', { targetId: 'player', damage: 100 }); // Count as a trauma event if monster would have killed
                    }
                });

                // 4. Execute "Lesson" after a delay
                setTimeout(() => {
                    if (!this.huntsman.activeIntervention) return; // Abort if timeout hit

                    if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(huntsman, 'attack');
                
                    // Set player HP to 5%
                    const limbs = window.playerHealth.limbs;
                    Object.values(limbs).forEach(l => {
                        l.hp = l.max * 0.05;
                    });
                    window.playerHealth.updateUI();
                
                    if (isFinalLesson) {
                        window.EventBus.emit('UI_LOG', `[THE HUNTSMAN] "My task is finished. The Sovereign awaits."`);
                        this.executeHuntsmanSacrifice(huntsman);
                    } else {
                        window.EventBus.emit('UI_LOG', `[THE HUNTSMAN] "Learn from your weakness."`);

                        // 5. Give the Orb
                        this.orbMessenger.attachedToId = 'player';
                        window.EventBus.emit('UI_LOG', `[THE HUNTSMAN] "The Messenger will watch your struggle."`);

                        // 6. Apply Scorn (12h)
                        this.applyScorn('player', 12);

                        // Cleanup
                        window.Input.frozen = false;
                        setTimeout(() => {
                            clearTimeout(this.huntsman.timeoutId);
                            this.huntsman.activeIntervention = false;

                            if (window.GameCore?.scene && huntsman.visual) window.GameCore.scene.remove(huntsman.visual);
                            if (window.GameCore?.world && huntsman.body) {
                                window.PhysicsQueue.enqueue(() => window.GameCore.world.removeRigidBody(huntsman.body));
                            }
                            if (window.GameCore?.activeEntities) {
                                window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e !== huntsman);
                            }
                        }, 5000);
                    }
                }, 3000);
            }
        },

                /**
     * Mandatory succession (Target becomes the NEXT Huntsman)
     * Bible: Most recent victim inherits the Mantle.
     */
    executeHuntsmanSuccession: function(victorId, deadHuntsman) {
        const mantle = window.GameState.huntsmanMantle;
        const sov = window.GameState.paleSovereign;
        
        mantle.lastVictimId = victorId;
        mantle.currentHuntsmanId = victorId;
        mantle.isCultivationComplete = false; 

        // Orb leaves to inform the Pale Wendigo (Sovereign)
        this.orbMessenger.attachedToId = null;
        window.EventBus.emit('UI_LOG', `👁️ [ORB] ".......I tried to warn you."`);
        
        // --- SOVEREIGN HARVEST (The Growth Step) ---
        // The Sovereign doesn't fight the target yet; he eats the 'Yield' of the succession
        const significance = window.ChronicleManager?.calculateSignificance(victorId) || 0;
        
        // Permanent Growth for Sovereign
        sov.significance += (significance * 0.2); 
        sov.highestConsumedSignificance = Math.max(sov.highestConsumedSignificance, significance);
        sov.harvestHistory.push({ targetId: victorId, yield: significance, day: window.EngineParams.worldDay });

        window.EventBus.emit('UI_LOG', `🩸 [SOVEREIGN] A worthy seed has been sown. The First Wendigo grows stronger.`);
        window.EventBus.emit('UI_LOG', `💀 [SUCCESSION] ${victorId} has inherited the Mantle. The shepherd's debt is paid.`);
        
        this.cleanupPhysicalEntity(deadHuntsman);
    },

    /**
     * VOLUNTARY TERMINATION: The Huntsman's Limit
     * If the target grows too strong, the Huntsman removes themselves to force the Sovereign's focus.
     */
    checkHuntsmanVoluntaryEnd: function(huntsman, targetId) {
        const significance = window.ChronicleManager?.calculateSignificance(targetId) || 0;
        const sovLimit = window.GameState.paleSovereign?.significance || 1000;

        if (significance >= sovLimit * 0.85) {
            window.EventBus.emit('UI_LOG', `[THE HUNTSMAN] "The light is too bright. I must return to the root."`);
            
            // Suicide/Dissolve logic
            this.executeHuntsmanSuccession(targetId, huntsman);
            return true;
        }
        return false;
    },





    getForceStrength: function(name) {


        return this.forces[name]?.strength || 0;
    }
};

window.ForceManager.update(0);

window.EventBus.on('HUNTSMAN_INTERVENTION', () => {
    window.ForceManager.handleInterventionEvent();
});

