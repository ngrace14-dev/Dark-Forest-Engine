import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

window.WarManager = {
    activeBattles: [],
    
    // --- MONARCH & WAR MASTER AUTHORITY ---
    getAuthorityLimit: function(tier) {
        if (tier === 'monarch') return 10000; // Total Realm Mobilization
        if (tier === 'war_master') return 2500; // Noble House Levies
        if (tier === 'commander') return 15;
        if (tier === 'elite') return 5;
        return 0;
    },

    // --- ENDGAME CRISIS SYSTEM (Stellaris Inspired) ---
    crisis: {
        active: false,
        type: null, // 'civil_war', 'monster_horde', 'void_incursion'
        strength: 0,
        originVillageId: null,
        daysToEruption: 0
    },

    evaluateCrisis: function() {
        if (this.crisis.active || window.EngineParams.worldDay < 30) return;

        const villages = window.VillageManager.villages;
        const totalInfamy = window.GameState.renown.infamy;
        
        // Calculate average unrest across all houses
        const totalTensions = villages.reduce((sum, v) => sum + (v.tensions || 0), 0) / villages.length;

        // Roll for Crisis eruption (low base chance, increases with instability and house tensions)
        if (Math.random() < 0.001 + (totalInfamy / 5000) + (totalTensions / 1000)) {
            const roll = Math.random();
            // Higher tensions make Civil War much more likely
            if (roll < 0.3 + (totalTensions / 200)) this.triggerCivilWar();
            else if (roll < 0.8) this.triggerMonsterHorde();
            else this.triggerVoidIncursion();
        }
    },

    triggerCivilWar: function() {
        this.crisis = { active: true, type: 'civil_war', strength: 1.0, daysToEruption: 3 };
        window.EventBus.emit('UI_LOG', "⚠️ [CRISIS] Whispers of rebellion echo through the taverns. The Noble Houses grow restless...");
    },

    triggerMonsterHorde: function() {
        // --- PRE-CHECK: ARE THE ELITE 300 FALLEN? ---
        const terminusVillage = window.VillageManager.villages.find(v => v.nobleHouse === 'House Terminus');
        const eliteCount = terminusVillage ? (terminusVillage.terminusEliteGuard || 0) : 0;
        
        if (eliteCount > 0) {
            window.EventBus.emit('UI_LOG', "[CRISIS] A Monster Horde attempted to break the pass, but the Terminus Elite 300 held the line.");
            return; // Crisis averted by the AI garrison
        }

        this.crisis = { active: true, type: 'monster_horde', strength: 1.0, daysToEruption: 5 };
        window.EventBus.emit('UI_LOG', "⚠️ [CRISIS] THE PASS HAS FALLEN! The 300 are no more. The Mountain has vomited its horrors into the Kingdom!");
    },

    triggerVoidIncursion: function() {
        this.crisis = { active: true, type: 'void_incursion', strength: 1.0, daysToEruption: 7 };
        window.EventBus.emit('UI_LOG', "⚠️ [CRISIS] The sky turns a bruised purple. The Void is bleeding into our reality.");
    },
    // Shares player's strength with nearby friendly forces
    updateResonance: function(delta) {
        if (!window.GameCore.playerObj) return;
        const playerPos = window.GameCore.playerObj.visual.position;
        const party = window.GameState.party;
        
        // Find all friendly units in war events
        const nearbyAllies = window.GameCore.activeEntities.filter(en => 
            en.def.faction === 'village' && 
            en.visual.position.distanceTo(playerPos) < 25 &&
            en.hp > 0
        );

        if (nearbyAllies.length > 0) {
            // Increase resonance while near allies in combat
            party.resonanceLevel = Math.min(100, party.resonanceLevel + delta * 2);
            
            // Share abilities at a "watered down" level
            const buffStrength = (party.resonanceLevel / 100) * 0.3; // Up to 30% of player stats
            nearbyAllies.forEach(ally => {
                ally.resonanceBuff = {
                    damage: window.GameState.pStats.strength.level * buffStrength,
                    defense: window.GameState.pStats.toughness.level * buffStrength
                };
            });
        } else {
            party.resonanceLevel = Math.max(0, party.resonanceLevel - delta * 5);
        }
    },

    // --- PLAYSTYLE TRACKING (Learning) ---
    trackPlayerPlaystyle: function(delta) {
        if (!window.Input.isMoving || !window.GameCore.playerObj) return;
        const learning = window.GameState.party.tacticalLearning;
        
        // Track Aggression (How often you are close to enemies vs kiting)
        const nearbyHostiles = window.GameCore.SpatialGrid.getNearbyEntities(
            window.GameCore.playerObj.visual.position.x, 
            window.GameCore.playerObj.visual.position.z, 
            30
        ).filter(en => (en.def.faction === 'monster' || en.def.faction === 'forest') && en.hp > 0);

        if (nearbyHostiles.length > 0) {
            const nearest = nearbyHostiles.sort((a,b) => 
                window.GameCore.playerObj.visual.position.distanceTo(a.visual.position) - 
                window.GameCore.playerObj.visual.position.distanceTo(b.visual.position)
            )[0];
            
            const dist = window.GameCore.playerObj.visual.position.distanceTo(nearest.visual.position);
            
            // If player is constantly in melee range, increase aggression
            if (dist < 3) learning.aggression = Math.min(1, learning.aggression + delta * 0.05);
            else if (dist > 10) learning.aggression = Math.max(0, learning.aggression - delta * 0.05);
            
            // Track Flanking (Are you hitting them from the side/back?)
            if (window.Input.isAttacking) {
                const enemyForward = new THREE.Vector3(0,0,1).applyQuaternion(nearest.visual.quaternion);
                const toPlayer = new THREE.Vector3().subVectors(window.GameCore.playerObj.visual.position, nearest.visual.position).normalize();
                const angle = enemyForward.angleTo(toPlayer);
                if (angle > Math.PI * 0.5) learning.flanking = Math.min(1, learning.flanking + 0.1);
            }
        }
    },

    dispatchCommander: function(memberId, targetId) {
        const member = window.GameState.party.members.find(m => m.id === memberId);
        if (!member || member.tier === 'pawn') return;
        
        member.dispatchTarget = targetId;
        window.EventBus.emit('UI_LOG', `[WAR] ${member.name} has been dispatched to lead the defense of target ${targetId}.`);
        
        // Remove their physical entity from the player's local scene
        const entity = window.GameCore.activeEntities.find(en => en.companionId === memberId);
        if (entity) {
            window.GameCore.scene.remove(entity.visual);
            window.GameCore.world.removeRigidBody(entity.body);
            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => en.id !== entity.id);
        }
    },

    update: function(delta) {
        this.updateResonance(delta);
        this.trackPlayerPlaystyle(delta);
        
        // Apply learning to commanders
        window.GameState.party.members.forEach(m => {
            if (m.recruited && m.learningWeights) {
                const global = window.GameState.party.tacticalLearning;
                // Slowly bleed global playstyle into individual weights
                m.learningWeights.aggression += (global.aggression - m.learningWeights.aggression) * delta * 0.1;
                m.learningWeights.flanking += (global.flanking - m.learningWeights.flanking) * delta * 0.1;
            }
        });
    }
};

window.EventBus.on('AI_TICK', ({ delta }) => {
    window.WarManager.update(delta);
    if (Math.random() < 0.0001) window.WarManager.evaluateCrisis();
});



