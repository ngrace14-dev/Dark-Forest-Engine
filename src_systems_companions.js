import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

window.CompanionManager = {
    chatCooldowns: {},
    
    // Dragon's Dogma style banter lines
    lines: {
        discovery: [
            "Look! A treasure chest, master!",
            "There are materials to be found here.",
            "I've spotted something of interest.",
            "A curious find, indeed."
        ],
        combat_start: [
            "To arms! Foes approach!",
            "They won't stand a chance against us.",
            "Steel yourself, master!",
            "I'll handle this!"
        ],
        combat_victory: [
            "A decisive victory!",
            "We are a formidable team.",
            "Is everyone unharmed?",
            "The path is clear once more."
        ],
        low_hp: [
            "I-I'm struggling... care for me!",
            "Master, I require aid!",
            "My wounds are deep..."
        ],
        idle: [
            "The air is thick with tension today.",
            "I wonder what lies beyond the next ridge.",
            "Your leadership is inspiring, master.",
            "I've learned much from our travels."
        ],
        knowledge_spot: [
            "I know of this place! Watch your step.",
            "This creature is weak to fire, I recall.",
            "A rare herb grows nearby, I'm certain of it."
        ],
        taunt: [
            "Over here, you foul beast!",
            "Your fight is with me now!",
            "Focus your rage on my shield!",
            "Come and get some!"
        ]
    },

    say: function(entity, category) {
        const now = performance.now();
        const lastChat = this.chatCooldowns[entity.id] || 0;
        if (now - lastChat < 8000) return; // 8 second chatter cooldown

        const member = window.GameState.party.members.find(m => m.id === entity.companionId);
        if (!member) return;

        const pool = this.lines[category] || this.lines.idle;
        const line = pool[Math.floor(Math.random() * pool.length)];
        
        this.chatCooldowns[entity.id] = now;

        // Visual feedback
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
            text: `[${member.name}]: ${line}`, 
            pos: entity.visual.position.clone().add(new THREE.Vector3(0, 2.5, 0)), 
            color: '#67e8f9' 
        });

        // Optional: Voice pitch could be simulated here if we had audio
        console.log(`[COMPANION] ${member.name} says: ${line}`);
    },

    update: function(delta) {
        if (!window.GameCore || !window.GameCore.playerObj) return;

        const pPos = window.GameCore.playerObj.visual.position;
        
        window.GameCore.activeEntities.forEach(en => {
            if (!en.companionId || en.hp <= 0) return;
            const member = window.GameState.party.members.find(m => m.id === en.companionId);
            if (!member || member.downed) return;

            // --- AUTONOMOUS ACTIONS (DD2 Style) ---
            
            // 1. Gathering (Gatherer Specialization)
            if (member.specialization === 'Gatherer' && (!en.groupCommand || en.groupCommand === 'follow')) {
                const nearbyLoot = window.GameCore.groundLoot.find(loot => 
                    en.visual.position.distanceTo(loot.visual.position) < 8
                );
                
                if (nearbyLoot && !en.isGathering) {
                    en.isGathering = true;
                    en.gatheringTarget = nearbyLoot;
                    this.say(en, 'discovery');
                }

                if (en.isGathering && en.gatheringTarget) {
                    const dist = en.visual.position.distanceTo(en.gatheringTarget.visual.position);
                    if (dist < 1.5) {
                        // Pick up
                        member.inventory ??= [];
                        member.inventory.push(en.gatheringTarget.itemId);
                        window.EventBus.emit('UI_LOG', `${member.name} gathered ${en.gatheringTarget.itemId}.`);
                        
                        // Remove loot from world
                        const idx = window.GameCore.groundLoot.indexOf(en.gatheringTarget);
                        if (idx >= 0) window.GameCore.groundLoot.splice(idx, 1);
                        window.GameCore.scene.remove(en.gatheringTarget.visual);
                        
                        en.isGathering = false;
                        en.gatheringTarget = null;
                    } else {
                        // Move to loot (uses the moveCompanion logic from AI system indirectly by setting target)
                        // Note: AI_TICK will override this if we aren't careful.
                        // We'll mark the entity so AI_TICK knows it's busy.
                    }
                }
            }

            // 2. Helping Player (Medic Specialization)
            if (member.specialization === 'Medic' && window.GameState.pStats.hp < window.GameState.pStats.maxHp * 0.4) {
                if (en.visual.position.distanceTo(pPos) < 15 && !en.isHealerBusy) {
                    // Look for healing item in inventory
                    const foodIdx = member.inventory.indexOf('food');
                    if (foodIdx >= 0) {
                        this.say(en, 'knowledge_spot'); // "I'll aid you!"
                        member.inventory.splice(foodIdx, 1);
                        window.GameState.pStats.hp = Math.min(window.GameState.pStats.maxHp, window.GameState.pStats.hp + 20);
                        window.EventBus.emit('UI_LOG', `${member.name} used a ration on you!`);
                        window.EventBus.emit('SPAWN_HIT_VFX', { type: 'Nature', pos: pPos });
                        en.isHealerBusy = true;
                        setTimeout(() => en.isHealerBusy = false, 10000); // Healing cooldown
                    }
                }
            }

            // 3. Taunting (Challenger Specialization)
            if (member.specialization === 'Challenger' && !member.downed) {
                const nearbyEnemies = window.GameCore.SpatialGrid.getNearbyEntities(en.visual.position.x, en.visual.position.z, 15)
                    .filter(other => other.def.type === 'npc' && (other.def.faction === 'monster' || other.def.faction === 'forest') && other.hp > 0);
                
                nearbyEnemies.forEach(enemy => {
                    // Force enemy to target the companion if they are targeting the player
                    const distToPlayer = enemy.visual.position.distanceTo(pPos);
                    if (distToPlayer < 5 && Math.random() < 0.02) {
                        this.say(en, 'taunt');
                        enemy.forcedTarget = en;
                        enemy.aiTimer = 5.0; // Stay focused for 5 seconds
                        window.EventBus.emit('UI_LOG', `${member.name} taunted the ${enemy.name}!`);
                    }
                });
            }

            // 4. Knowledge Remarking
            if (Math.random() < 0.001) { // Occasional random banter
                this.say(en, 'idle');
            }

            // Check for nearby known locations or enemies
            const nearbyEntities = window.GameCore.SpatialGrid.getNearbyEntities(en.visual.position.x, en.visual.position.z, 20);
            nearbyEntities.forEach(other => {
                if (other.def.type === 'npc' && (other.def.faction === 'monster' || other.def.faction === 'forest')) {
                    if (member.knowledge.enemies.includes(other.name)) {
                        if (Math.random() < 0.01) this.say(en, 'knowledge_spot');
                    }
                }
            });
        });
    }
};

window.EventBus.on('AI_TICK', ({ delta }) => {
    window.CompanionManager.update(delta);
});


