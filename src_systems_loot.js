// File: src_systems_loot.js
/**
 * Procedural Runic Loot Engine
 * Bridges the gap for Diablo 4/DD2 style progression.
 * Features: Procedural affixes, Link Skill Runes, and War Master unique gear.
 */

window.LootEngine = {
    affixes: {
        prefix: [
            { name: 'Searing', stats: { fireDamage: 5 }, color: 'text-orange-400' },
            { name: 'Frozen', stats: { frostDamage: 5 }, color: 'text-cyan-400' },
            { name: 'Thundering', stats: { shockDamage: 5 }, color: 'text-yellow-400' },
            { name: 'Vampiric', stats: { lifeSteal: 0.02 }, color: 'text-red-600' },
            { name: 'Reinforced', stats: { defense: 10 }, color: 'text-gray-400' },
            { name: 'Weightless', stats: { athletics: 5 }, color: 'text-green-300' }
        ],
        suffix: [
            { name: 'of the Bear', stats: { toughness: 3 } },
            { name: 'of the Hawk', stats: { meleeAtt: 3 } },
            { name: 'of the Turtle', stats: { meleeDef: 3 } },
            { name: 'of Ruin', stats: { damage: 8 } },
            { name: 'of the Aegis', stats: { poise: 20 } }
        ]
    },

    linkRunes: {
        'link_fire': { id: 'link_fire', name: 'Link Rune: Fireball', element: 'fire', icon: '🔥', description: 'Nearby allies deal fire damage.' },
        'link_frost': { id: 'link_frost', name: 'Link Rune: Frost Nova', element: 'frost', icon: '❄️', description: 'Nearby allies slow enemies.' },
        'link_void': { id: 'link_void', name: 'Link Rune: Void Warp', element: 'void', icon: '⚛️', description: 'Nearby allies gain dodge chance.' }
    },

    generateProceduralItem: function(baseId, level = 1) {
        const base = window.ItemDatabase[baseId];
        if (!base) return null;

        const item = JSON.parse(JSON.stringify(base));
        const prefix = this.affixes.prefix[Math.floor(Math.random() * this.affixes.prefix.length)];
        const suffix = this.affixes.suffix[Math.floor(Math.random() * this.affixes.suffix.length)];

        item.id = `${baseId}_${Math.random().toString(36).substr(2, 9)}`;
        item.name = `${prefix.name} ${base.name} ${suffix.name}`;
        item.stats = { ...item.stats, ...prefix.stats, ...suffix.stats };
        
        // Scale stats by level
        for (let stat in item.stats) {
            if (typeof item.stats[stat] === 'number') {
                item.stats[stat] = Math.ceil(item.stats[stat] * (1 + level * 0.1));
            }
        }

        item.rarity = 'Procedural';
        item.color = prefix.color;
        item.isProcedural = true;
        
        // Register in volatile database
        window.ItemDatabase[item.id] = item;
        return item.id;
    },

    equipWarMaster: function(member) {
        if (member.tier !== 'war_master') return;
        
        const gear = this.generateWarMasterGear(10);
        member.equipment = { ...member.equipment, ...gear };
        window.EventBus.emit('UI_LOG', `[GEAR] ${member.name} has been outfitted with War Master unique gear.`);
        
        // Refresh visual if entity exists
        const entity = window.GameCore.activeEntities.find(en => en.companionId === member.id);
        if (entity) {
            // In a real implementation, this would trigger a model part swap
            window.EventBus.emit('SPAWN_HIT_VFX', { type: 'Nature', pos: entity.visual.position });
        }
    },
        const slots = ['weapon', 'chest', 'head'];
        const gear = {};
        slots.forEach(slot => {
            const baseIds = {
                'weapon': ['iron_sword', 'rusty_sword'],
                'chest': ['leather_armor', 'dark_steel_torso'],
                'head': ['dark_steel_helm_cloak']
            };
            const possible = baseIds[slot];
            const baseId = possible[Math.floor(Math.random() * possible.length)];
            gear[slot] = this.generateProceduralItem(baseId, 10); // High level for War Masters
        });
        return gear;
    },

    applyLinkSkills: function(delta) {
        if (!window.GameCore.playerObj) return;
        const playerPos = window.GameCore.playerObj.visual.position;
        
        // Check equipped link runes
        const activeRunes = Object.values(window.GameState.inventory.runes)
            .filter(id => id && this.linkRunes[id])
            .map(id => this.linkRunes[id]);

        if (activeRunes.length === 0) return;

        // "Walking Calamity" power scaling (Renown > 500)
        const isWalkingCalamity = window.GameState.renown.score > 500;
        const radius = isWalkingCalamity ? 50 : 20;
        const powerMult = isWalkingCalamity ? 2.0 : 1.0;

        const nearbyAllies = window.GameCore.activeEntities.filter(en => 
            en.def.faction === 'village' && 
            en.visual.position.distanceTo(playerPos) < radius &&
            en.hp > 0
        );

        activeRunes.forEach(rune => {
            nearbyAllies.forEach(ally => {
                ally.linkBuffs ??= {};
                ally.linkBuffs[rune.element] = {
                    power: 10 * powerMult,
                    duration: 1.0
                };
                
                // Visual indicator for link skill
                if (Math.random() < 0.005) {
                    window.EventBus.emit('SPAWN_HIT_VFX', { 
                        type: rune.element === 'fire' ? 'Fire' : (rune.element === 'void' ? 'Void' : 'Nature'), 
                        pos: ally.visual.position 
                    });
                }
            });
        });

        if (isWalkingCalamity && nearbyAllies.length > 0) {
            // Walking Calamity shares a portion of their core stats too
            nearbyAllies.forEach(ally => {
                ally.calamityBuff = {
                    damage: window.GameState.derivedStats.weaponDamage * 0.2,
                    defense: window.GameState.derivedStats.armor * 0.2
                };
            });
        }
    }
};

// Register Link Runes in ItemDatabase
Object.keys(window.LootEngine.linkRunes).forEach(id => {
    const rune = window.LootEngine.linkRunes[id];
    window.ItemDatabase[id] = {
        ...rune,
        type: 'rune',
        slot: 'socket',
        stats: { linkSkill: true },
        color: 'text-purple-400'
    };
});

window.EventBus.on('AI_TICK', ({ delta }) => {
    window.LootEngine.applyLinkSkills(delta);
});

console.log("⚔️ Loot Engine: Procedural Runic Loot Engine Initialized");



