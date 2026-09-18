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

        if (window.EngineParams.worldDay < 3) return; // Give player some breathing room
        if (this.interventionCooldown > 0) return;
        
        // Only monitor if player is in real danger
        if (window.GameState.pStats.hp > 0 && window.GameState.pStats.hp < (window.GameState.pStats.maxHp * 0.4)) {
            this.evaluateDanger();
        }
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



