// File: src_systems_blacksmith.js
/**
 * Runic Blacksmithing System (Diablo 4 / Kenshi Hybrid)
 * Allows modifying "locked" gear via Tempering, Socketing, and Masterworking.
 */

window.BlacksmithManager = {
        temperingRecipes: {
        'warrior_focus': { name: 'Warrior Temper', stat: 'strength', possibleRolls: [2, 5, 8], cost: { beast_bones: 5 } },
        'survival_focus': { name: 'Survival Temper', stat: 'toughness', possibleRolls: [2, 5, 8], cost: { corrupted_resin: 5 } },
        'void_resistance': { name: 'Void Temper', stat: 'resistances.void', possibleRolls: [5, 10, 15], cost: { corrupted_resin: 10 } },
        'prosthetic_integrity': { name: 'Runic Integrity', stat: 'hpBonus', possibleRolls: [10, 20, 30], cost: { beast_bones: 10, stone: 5 } }
    },

    forgeProsthetic: function(type, side) {
        const costs = {
            'clockwork': { gold: 250, wood: 10, stone: 5 },
            'void': { gold: 1000, corrupted_resin: 15, beast_bones: 10 }
        };

        const cost = costs[type];
        if (!cost) return;

        // Check Gold
        if (window.GameState.inventory.gold < cost.gold) {
            window.EventBus.emit('UI_LOG', `Forging a ${type} prosthetic requires ${cost.gold} gold.`);
            return;
        }

        // Check Materials
        const pack = window.GameState.inventory.backpack;
        for (let [res, amt] of Object.entries(cost)) {
            if (res === 'gold') continue;
            const count = pack.filter(id => id === res).length;
            if (count < amt) {
                window.EventBus.emit('UI_LOG', `Missing materials: ${amt}x ${res}`);
                return;
            }
        }

        // Check inventory space
        if (pack.length >= 25) {
            window.EventBus.emit('UI_LOG', "Backpack is full!");
            return;
        }

        // Consume Resources
        window.GameState.inventory.gold -= cost.gold;
        for (let [res, amt] of Object.entries(cost)) {
            if (res === 'gold') continue;
            for (let i = 0; i < amt; i++) {
                const idx = pack.indexOf(res);
                pack.splice(idx, 1);
            }
        }

        const itemId = `${type}_${side === 'left' ? 'arm' : 'leg'}`; // This logic might need refinement based on exact ItemDatabase IDs
        // Actually, let's just use the specific IDs from ItemDatabase
        let finalId = '';
        if (type === 'clockwork') {
            finalId = side.includes('Arm') ? 'clockwork_arm' : 'clockwork_leg';
        } else {
            finalId = side.includes('Arm') ? 'void_arm' : 'void_leg';
        }

        pack.push(finalId);
        window.EventBus.emit('UI_LOG', `🔨 Forged a ${window.ItemDatabase[finalId].name}!`);
        window.EventBus.emit('UI_UPDATE_HUD');
        window.EventBus.emit('RENDER_INVENTORY');
        window.EventBus.emit('PLAY_SOUND', { url: 'https://tonejs.github.io/audio/drum-samples/conga-analog.mp3', vol: 15 });
    },

    temperItem: function(itemId, recipeKey) {
        const item = window.ItemDatabase[itemId];
        const recipe = this.temperingRecipes[recipeKey];
        if (!item || !recipe) return;

        // Check Costs
        for (let [res, amt] of Object.entries(recipe.cost)) {
            const count = window.GameState.inventory.backpack.filter(id => id === res).length;
            if (count < amt) {
                window.EventBus.emit('UI_LOG', `Missing materials: ${amt}x ${res}`);
                return;
            }
        }

        // Consume Materials
        for (let [res, amt] of Object.entries(recipe.cost)) {
            for (let i = 0; i < amt; i++) {
                const idx = window.GameState.inventory.backpack.indexOf(res);
                window.GameState.inventory.backpack.splice(idx, 1);
            }
        }

        // Apply Temper
        const roll = recipe.possibleRolls[Math.floor(Math.random() * recipe.possibleRolls.length)];
        item.stats ??= {};
        
        // Handle nested stats (like resistances)
        if (recipe.stat.includes('.')) {
            const [cat, sub] = recipe.stat.split('.');
            item.stats[cat] ??= {};
            item.stats[cat][sub] = (item.stats[cat][sub] || 0) + roll;
        } else {
            item.stats[recipe.stat] = (item.stats[recipe.stat] || 0) + roll;
        }

        item.temperedCount = (item.temperedCount || 0) + 1;
        item.name = `Reforged ${item.name}`;
        
        window.EventBus.emit('UI_LOG', `Forged ${recipe.name} (+${roll} ${recipe.stat}) onto ${item.name}`);
        window.EventBus.emit('RECALCULATE_STATS');
        window.EventBus.emit('RENDER_INVENTORY');
    },

        masterwork: function(itemId) {
        const item = window.ItemDatabase[itemId];
        if (!item) return;

        const cost = (item.masterworkLevel || 0) * 100 + 100;
        if (window.GameState.inventory.gold < cost) {
            window.EventBus.emit('UI_LOG', `Masterworking requires ${cost} gold.`);
            return;
        }

        window.GameState.inventory.gold -= cost;
        item.masterworkLevel = (item.masterworkLevel || 0) + 1;

        // Scale all numeric stats by 10%
        for (let stat in item.stats) {
            if (typeof item.stats[stat] === 'number') {
                item.stats[stat] = Math.ceil(item.stats[stat] * 1.10);
            }
        }

        window.EventBus.emit('UI_LOG', `Masterworked ${item.name} to Rank ${item.masterworkLevel}.`);
        window.EventBus.emit('RECALCULATE_STATS');
        window.EventBus.emit('RENDER_INVENTORY');
        window.EventBus.emit('PLAY_SOUND', { url: 'https://tonejs.github.io/audio/drum-samples/conga-analog.mp3', vol: 5 });
    }
};

// --- NPC REACTIVITY HOOK ---
window.EventBus.on('AI_TICK', () => {
    if (!window.GameCore.playerObj || Math.random() > 0.002) return;
    
    const pPos = window.GameCore.playerObj.visual.position;
    const nearbyNpcs = window.GameCore.SpatialGrid.getNearbyEntities(pPos.x, pPos.z, 5).filter(en => 
        en.def.faction === 'village' && 
        en.hp > 0
    );

    if (nearbyNpcs.length > 0) {
        const npc = nearbyNpcs[0];
        const eq = window.GameState.inventory.equipment;
        const renown = window.GameState.renown;

        let comment = "";
        if (renown.score > 500) {
            comment = "Is it true? The Walking Calamity is here in the flesh...";
        } else if (eq.weapon && window.ItemDatabase[eq.weapon]?.masterworkLevel > 0) {
            comment = "That steel... the runic forging is exquisite.";
        } else if (eq.chest === 'dark_steel_torso') {
            comment = "Terminus plate. You've walked the mountain pass, haven't you?";
        }

        if (comment) {
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                text: `[NPC]: ${comment}`, 
                pos: npc.visual.position.clone().add(new THREE.Vector3(0, 2.5, 0)), 
                color: '#9ca3af' 
            });
        }
    }
});

