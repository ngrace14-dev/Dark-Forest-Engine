import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/**
 * File: src_systems_encounters.js
 * Encounter Director: Monitors combat odds and manages "The Huntsman" intervention logic.
 */

window.EncounterDirector = {
    huntsmanActive: false,
    interventionCooldown: 0, // Days until next possible intervention
    
    // --- HUNTSMAN MARK (DEBUFF) ---
    // 12 hour status effect
    huntsmanMarkTimer: 0,

    update: function(delta) {
        if (this.huntsmanMarkTimer > 0) {
            this.huntsmanMarkTimer -= delta;
            if (this.huntsmanMarkTimer <= 0) {
                window.EventBus.emit('UI_LOG', `[STATUS] The Huntsman's mark has faded. The world notices you again.`);
            }
        }

        // --- PHASE 1: COLLISION SYSTEM ---
        this.processTaskCollisions();

        if (window.EngineParams.worldDay < 3) return; // Give player some breathing room
        if (this.interventionCooldown > 0) return;
        
        // Only monitor if player is in real danger
        if (window.GameState.pStats.hp > 0 && window.GameState.pStats.hp < (window.GameState.pStats.maxHp * 0.4)) {
            this.evaluateDanger();
        }
    },

    // --- PHASE 1: COLLISION SYSTEM ---
    processTaskCollisions: function() {
        if (!window.GameCore?.activeEntities) return;
        
        // We throttle this to prevent frame drops
        const now = performance.now();
        if (this.lastCollisionCheck && now - this.lastCollisionCheck < 500) return;
        this.lastCollisionCheck = now;

        const entities = window.GameCore.activeEntities;
        
        for (let i = 0; i < entities.length; i++) {
            const a = entities[i];
            if (!a.currentTask || a.hp <= 0) continue;

            for (let j = i + 1; j < entities.length; j++) {
                const b = entities[j];
                if (!b.currentTask || b.hp <= 0) continue;

                // Check distance
                const distSq = a.visual.position.distanceToSquared(b.visual.position);
                if (distSq < 225) { // 15 meters
                    this.evaluateIntersection(a, b);
                }
            }
        }
    },

    evaluateIntersection: function(a, b) {
        const intersectionKey = [a.currentTask, b.currentTask].sort().join('+');
        
        // Avoid spamming the same intersection
        a.intersections ??= new Map();
        if (a.intersections.has(b.id) && Date.now() - a.intersections.get(b.id) < 60000) return;
        a.intersections.set(b.id, Date.now());

        let eventType = null;
        let significance = 10;
        let detail = "";

        // Interaction Matrix
        switch (intersectionKey) {
            case 'Prowling+Trading': // Monster meets Caravan
                eventType = 'ROBBERY_EVENT';
                significance = 60;
                detail = `A ${a.name} intercepted a merchant caravan near ${b.taskTarget || 'the road'}.`;
                break;
            case 'Hunting+Stalking': // Hunter meets Wendigo/Stalker
                eventType = 'ENCOUNTER_EVENT';
                significance = 80;
                detail = `A hunt turned into a deadly encounter between a ${a.name} and a ${b.name}.`;
                break;
            case 'Defense Event+Monster Presence':
            case 'Patrolling+Prowling':
                eventType = 'DEFENSE_EVENT';
                significance = 40;
                detail = `Guard patrol engaged hostile forces.`;
                break;
            case 'Trading+Trading':
                eventType = 'COMMERCE_EVENT';
                significance = 20;
                detail = `Caravans crossed paths, exchanging news of the road.`;
                break;
        }

        if (eventType) {
            this.generateChronicleAndIntel(eventType, detail, significance, [a, b]);
        }
    },

    generateChronicleAndIntel: function(type, detail, significance, actors) {
        // 1. Record in Chronicle
        if (window.ChronicleManager) {
            window.ChronicleManager.recordEvent({
                actorId: actors[0].id,
                type: type,
                detail: detail,
                significance: significance,
                historicalWeight: significance * 0.5
            });
        }

        // 2. Generate Intel (Phase 2)
        // Find witnesses (other nearby entities)
        const p1 = actors[0].visual.position;
        const nearby = window.GameCore.SpatialGrid.getNearbyEntities(p1.x, p1.z, 30);
        const witnesses = nearby.filter(en => !actors.includes(en) && en.hp > 0);

        const intelId = window.IntelManager.register({
            type: window.IntelEnums.TYPES.RUMOR,
            payload: {
                title: type.replace('_', ' '),
                description: detail,
                tags: [type.toLowerCase(), 'event'],
                target_coord: { x: p1.x, z: p1.z }
            },
            certainty: 0.7,
            truth_state: window.IntelEnums.TRUTH_STATE.TRUE,
            significance: { survival: significance, crow: significance * 0.2 },
            rarity: significance > 70 ? window.IntelEnums.RARITY.UNCOMMON : window.IntelEnums.RARITY.COMMON,
            provenance: [{ node_id: 'world_director', timestamp: window.EngineParams?.worldDay || 0 }]
        });

        // Witnesses "hear" or "see" it and now carry the intel
        witnesses.forEach(w => {
            window.IntelManager.grantOwnership(intelId, w.id);
            // If the witness is a courier or caravan, they'll spread it at the next stop
        });

        window.EventBus.emit('UI_LOG_DEBUG', `[COLLISION] Generated ${type} with ${witnesses.length} witnesses.`);
    },

    evaluateDanger: function() {
        if (!window.GameCore.playerObj) return;
        const pPos = window.GameCore.playerObj.visual.position;
        
        // --- PHASE 4: SMART SPAWN CHECK ---
        // Ensure the Huntsman isn't spawning in the void or a mountain
        if (window.Navigation && !window.Navigation.isWalkableAt(pPos.x, pPos.z)) return;

        // 1. Calculate Combined Power of Hostiles nearby
        const nearby = window.GameCore.SpatialGrid.getNearbyEntities(pPos.x, pPos.z, 20);
        let hostilePower = 0;
        let hostiles = [];

        nearby.forEach(en => {
            if (en.hp > 0 && (en.def.faction === 'monster' || en.def.faction === 'forest') && en.name !== 'Huntsman') {
                // Initialize Task Data for Monsters
                en.currentTask ??= 'Prowling';
                en.taskTarget ??= 'None';
                en.taskReason ??= 'Following primal instinct.';
                en.taskTimestamp ??= Date.now();

                // Power formula: HP + (Damage * 5)
                const power = (en.hp || 50) + ((en.def.attackDamage || 15) * 5);
                hostilePower += power;
                hostiles.push(en);
            }
        });

        // 2. Calculate Player Side Power
        const playerPower = window.GameState.pStats.hp + (window.GameState.derivedStats.weaponDamage * 10);
        
        // 3. Check for "Certain Death" Odds (3:1 or worse)
        if (hostilePower > playerPower * 3 && hostiles.length >= 2) {
            this.triggerHuntsmanIntervention(pPos, hostiles);
        }
        
        // --- INTEL HOOK (Encounter Director Monitoring) ---
        // If a major threat is detected, inject a rumor into the IntelManager
        if (hostilePower > 500 && window.IntelManager && Math.random() < 0.2) {
            window.IntelManager.register({
                type: window.IntelEnums.TYPES.WARNING,
                payload: {
                    title: "Massive Hostile Gathering",
                    description: "A terrifying concentration of corrupted beasts was witnessed.",
                    tags: ['monster', 'horde', 'danger'],
                    target_coord: { x: pPos.x, z: pPos.z }
                },
                certainty: 0.8,
                truth_state: window.IntelEnums.TRUTH_STATE.TRUE,
                significance: { survival: 70, political: 10 },
                rarity: window.IntelEnums.RARITY.UNCOMMON,
                provenance: [{ node_id: 'world_director', timestamp: window.EngineParams?.worldDay || 0 }]
            });
            window.EventBus.emit('UI_LOG_DEBUG', `[INTEL] Encounter Director logged a Horde Warning.`);
        }
    },

    triggerHuntsmanIntervention: function(pos, hostiles) {
        window.EventBus.emit('UI_LOG', `[STALKER] A heavy, metallic clank echoes through the woods...`);
        
        // Spawn Huntsman behind the player
        const angle = Math.random() * Math.PI * 2;
        const hX = pos.x + Math.cos(angle) * 10;
        const hZ = pos.z + Math.sin(angle) * 10;
        
        const huntsman = window.GameCore.instantiatePrefab('Huntsman', hX, window.WorldGenerator.getTerrainHeight(hX, hZ), hZ, 'persistent');
        
        if (huntsman) {
            huntsman.isIntervening = true;
            huntsman.interventionPhase = 'clearing'; // Phase 1: Kill the "pests"
            this.interventionCooldown = 2; // Don't show up again for 2 days
            
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'INTERVENTION', pos: huntsman.visual.position, color: '#ff0000' });
            
            // Log the "Strange Savior" vibe
            setTimeout(() => {
                window.EventBus.emit('UI_LOG', `[HUNTSMAN] "These vermin are not fit to claim this kill."`);
            }, 2000);

            // --- INTEL HOOK (Huntsman Sighting) ---
            if (window.IntelManager) {
                window.IntelManager.register({
                    type: window.IntelEnums.TYPES.WARNING,
                    payload: {
                        title: "The Huntsman Strikes",
                        description: "The metallic stalker of the woods was seen intervening in a battle.",
                        tags: ['huntsman', 'stalker', 'legend'],
                        target_coord: { x: hX, z: hZ }
                    },
                    certainty: 1.0,
                    truth_state: window.IntelEnums.TRUTH_STATE.TRUE,
                    significance: { survival: 90, crow: 50 },
                    rarity: window.IntelEnums.RARITY.LEGENDARY,
                    provenance: [{ node_id: 'world_director', timestamp: window.EngineParams?.worldDay || 0 }]
                });
            }
        }
    },

    applyHuntsmanMark: function() {
        // 12 hours in game time (seconds = 12 * (dayLength / 24))
        // With 12h IRL day, this is 6h IRL. We will keep it long but allow clearing.
        const duration = (window.EngineParams.dayLengthSeconds / 24) * 12;
        this.huntsmanMarkTimer = duration;
        window.EventBus.emit('UI_LOG', `[DEBUFF] You bear the 'Huntsman's Scorn'. Monsters fear you, but civilization shuns you.`);
        window.EventBus.emit('UI_LOG', `[STATUS] Perform a 'Noteworthy Deed' to prove your worth and clear the mark.`);
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: "HUNTSMAN'S SCORN", pos: window.GameCore.playerObj.visual.position, color: '#4b5563' });
    },

    clearHuntsmanMark: function() {
        if (this.huntsmanMarkTimer > 0) {
            this.huntsmanMarkTimer = 0;
            window.EventBus.emit('UI_LOG', `[STATUS] Your deed has reached the Huntsman's ears. The mark is lifted.`);
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: "SCORN LIFTED", pos: window.GameCore.playerObj.visual.position, color: '#fcd34d' });
        }
    }
};



