/**
 * File: src_systems_careers.js
 * Manages life skill progression, career ranks, and economic influence.
 */

window.CareerManager = {
    // Current Active Ranks/XP for the Player
    stats: {},
    
    // Career Definitions
    definitions: {
        // TIER 1: FOUNDATIONS
        hunter: { name: "Hunter", tier: 1, produces: ["Meat", "Hides", "Bones", "Antlers"], ranks: ["Trapper", "Tracker", "Slayer", "Big Game Hunter", "Apex Predator"] },
        gatherer: { name: "Gatherer", tier: 1, produces: ["Herbs", "Ingredients", "Reagents"], ranks: ["Forager", "Herbalist", "Botanist", "Master Herbalist", "Forest Sage"] },
        trapper: { name: "Trapper", tier: 1, produces: ["Furs", "Exotic Parts"], ranks: ["Layman", "Snarer", "Trapper", "Trap Lord", "Wilderness Warden"] },
        farmer: { name: "Farmer", tier: 1, produces: ["Crops", "Livestock"], ranks: ["Peasant", "Tiller", "Husbandman", "Yeoman", "Estate Baron"] },
        
        // TIER 2: TRADES & CRAFTS
        blacksmith: { name: "Blacksmith", tier: 2, produces: ["Weapons", "Armor", "Prosthetics"], ranks: ["Apprentice", "Journeyman", "Master Smith", "Noble Armorer", "Legendary Smith"] },
        alchemist: { name: "Alchemist", tier: 2, produces: ["Potions", "Tonics", "Poisons"], ranks: ["Brewer", "Chemist", "Transmuter", "Grand Alchemist", "Philosopher"] },
        rune_engineer: { name: "Rune Engineer", tier: 2, produces: ["Barrier Modules", "Rune Stones"], ranks: ["Artificer", "Warden-Builder", "Barrier Master", "Arch-Engineer", "Master Warden Engineer"] },
        chef: { name: "Chef", tier: 2, produces: ["Travel Rations", "Banquets"], ranks: ["Cook", "Caterer", "Culinary Master", "Noble Chef", "Royal Chef"] },

        // TIER 3: COMMERCE & WEALTH
        merchant: { name: "Merchant", tier: 3, produces: ["Gold", "Contracts"], ranks: ["Peddler", "Trader", "Factor", "Guildmaster", "Merchant Prince"] },
        caravan_master: { name: "Caravan Master", tier: 3, produces: ["Prosperity", "Routes"], ranks: ["Guard", "Wagoner", "Convoy Leader", "Route Master", "Trade King"] },
        landlord: { name: "Landlord", tier: 3, produces: ["Rent", "Taxes"], ranks: ["Collector", "Property Manager", "Owner", "District Lord", "Property Magnate"] },
        info_broker: { name: "Information Broker", tier: 3, produces: ["Rumors", "Intel"], ranks: ["Listener", "Spy", "Broker", "Shadow Master", "Shadow Chancellor"] },

        // TIER 4: ARCANE & SOCIAL
        arcane_proprietor: { name: "Arcane Proprietor", tier: 4, produces: ["Influence", "Establishment"], ranks: ["Barkeep", "Host", "Proprietor", "Arcane Steward", "Keeper of Doors"] },
        diplomat: { name: "Diplomat", tier: 4, produces: ["Treaties", "Peace"], ranks: ["Envoy", "Negotiator", "Arbitrator", "Ambassador", "Grand Diplomat"] },
        matchmaker: { name: "Matchmaker", tier: 4, produces: ["Alliances", "Marriages"], ranks: ["Intermediary", "Contractor", "Alliance Weaver", "House Binder", "Court Architect"] },
        entertainer: { name: "Entertainer", tier: 4, produces: ["Reputation", "Patronage"], ranks: ["Busker", "Bard", "Performer", "Maestro", "Living Legend"] },

        // TIER 5: CIVILIZATION
        warden: { name: "Warden", tier: 5, produces: ["Barrier Stability", "Protection"], ranks: ["Watcher", "Keeper", "Protector", "High Warden", "Guardian of the Forest"] },
        noble_retainer: { name: "Noble Retainer", tier: 5, produces: ["Trust", "Authority"], ranks: ["Servant", "Squire", "Steward", "Castellan", "House Steward"] },
        levy_commander: { name: "Levy Commander", tier: 5, produces: ["Army Power", "Militia"], ranks: ["Sergeant", "Lieutenant", "Captain", "Commander", "Grand Marshal"] },
        builder: { name: "Builder", tier: 5, produces: ["Infrastructure", "Upgrades"], ranks: ["Mason", "Architect", "Urban Planner", "Master Builder", "Realm Architect"] },

        // TIER 6: WORLD-SHAPERS
        navigator: { name: "Shift Navigator", tier: 6, produces: ["Epoch Predictions", "Safety"], ranks: ["Pathfinder", "Predictor", "Void-Gazer", "Navigator", "Master Navigator"] },
        archivist: { name: "Archivist", tier: 6, produces: ["Historical Records", "Truth"], ranks: ["Scribe", "Recorder", "Historian", "Epoch Keeper", "Grand Archivist"] },
        chronicler: { name: "Crow Chronicler", tier: 6, produces: ["Legacy", "Reputation"], ranks: ["Observer", "Storyteller", "Narrator", "Voice of the Crow", "Mythic Voice"] },
        noble_founder: { name: "Noble Founder", tier: 6, produces: ["Land", "Sovereignty"], ranks: ["Commoner", "Claimant", "Lord", "Great House Patriarch", "Matriarch"] }
    },

    init: function() {
        if (window.GameState.careerStats) {
            this.stats = window.GameState.careerStats;
        } else {
            this.stats = {};
            Object.keys(this.definitions).forEach(key => {
                this.stats[key] = { xp: 0, level: 1 };
            });
            window.GameState.careerStats = this.stats;
        }
    },

    addXP: function(careerId, amount) {
        const stats = this.stats[careerId];
        const def = this.definitions[careerId];
        if (!stats || !def) return;

        stats.xp += amount;
        const nextLevelXP = stats.level * 100 * (def.tier || 1);
        
        if (stats.xp >= nextLevelXP) {
            stats.xp -= nextLevelXP;
            stats.level++;
            const rank = this.getRank(careerId);
            window.EventBus.emit('UI_LOG', `[CAREER] You have leveled up in ${def.name}! New Rank: ${rank}`);
            window.EventBus.emit('UI_UPDATE_STATS');
        }
    },

    getRank: function(careerId) {
        const stats = this.stats[careerId];
        const def = this.definitions[careerId];
        if (!stats || !def) return "Unknown";
        
        const rankIndex = Math.min(def.ranks.length - 1, Math.floor((stats.level - 1) / 5));
        return def.ranks[rankIndex];
    }
};

window.CareerManager.init();
