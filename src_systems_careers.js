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
        hunter: { name: "Hunter", tier: 1, produces: ["Meat", "Hides", "Bones"], ranks: ["Trapper", "Tracker", "Slayer", "Big Game Hunter", "Apex Predator"] },
        gatherer: { name: "Gatherer", tier: 1, produces: ["Herbs", "Reagents"], ranks: ["Forager", "Herbalist", "Botanist", "Master Herbalist", "Forest Sage"] },
        trapper: { name: "Trapper", tier: 1, produces: ["Furs", "Exotic Parts"], ranks: ["Layman", "Snarer", "Trapper", "Trap Lord", "Wilderness Warden"] },
        farmer: { name: "Farmer", tier: 1, produces: ["Crops", "Livestock"], ranks: ["Peasant", "Tiller", "Husbandman", "Yeoman", "Estate Baron"] },
        scribe: { name: "Scribe", tier: 1, produces: ["Records", "Ink"], ranks: ["Copyist", "Ledger-Keeper", "Clerk", "Senior Scribe", "Master Scribe"] },
        teacher: { name: "Teacher", tier: 1, produces: ["Skill Transfer"], ranks: ["Tutor", "Teacher", "Master Instructor", "Professor", "Dean"] },
        lorekeeper: { name: "Lorekeeper", tier: 1, produces: ["Cultural Memory"], ranks: ["Storyteller", "Lorekeeper", "Songkeeper", "Ritual Keeper", "Story Elder"] },
        registrar: { name: "Registrar", tier: 1, produces: ["Legitimacy"], ranks: ["Clerk", "Registrar", "Census Master", "Royal Registrar", "Keeper of Records"] },
        
        // TIER 2: TRADES & CRAFTS
        blacksmith: { name: "Blacksmith", tier: 2, produces: ["Weapons", "Armor"], ranks: ["Apprentice", "Journeyman", "Master Smith", "Noble Armorer", "Legendary Smith"] },
        alchemist: { name: "Alchemist", tier: 2, produces: ["Potions", "Tonics"], ranks: ["Brewer", "Chemist", "Transmuter", "Grand Alchemist", "Philosopher"] },
        rune_scholar: { name: "Rune Scholar", tier: 2, produces: ["Runic Theory"], ranks: ["Student", "Rune Scholar", "Rune Linguist", "Rune Theorist", "Rune Professor"] },
        rune_engineer: { name: "Rune Engineer", tier: 2, produces: ["Barrier Maintenance"], ranks: ["Artificer", "Warden-Builder", "Barrier Master", "Arch-Engineer", "Master Warden Engineer"] },
        chef: { name: "Chef", tier: 2, produces: ["Rations"], ranks: ["Cook", "Caterer", "Culinary Master", "Noble Chef", "Royal Chef"] },
        recorder: { name: "Recorder", tier: 2, produces: ["Fact Persistence"], ranks: ["Messenger", "Chronicler-Adept", "Traveling Scribe", "World Recorder", "Master Recorder"] },

        // TIER 3: COMMERCE & WEALTH
        merchant: { name: "Merchant", tier: 3, produces: ["Gold", "Contracts"], ranks: ["Peddler", "Trader", "Factor", "Guildmaster", "Merchant Prince"] },
        quartermaster: { name: "Quartermaster", tier: 3, produces: ["Logistics"], ranks: ["Stockpiler", "Quartermaster", "Warehouse Keeper", "Logistics Planner", "Grand Quartermaster"] },
        landlord: { name: "Landlord", tier: 3, produces: ["Rent", "Taxes"], ranks: ["Collector", "Property Manager", "Owner", "District Lord", "Property Magnate"] },
        info_broker: { name: "Information Broker", tier: 3, produces: ["Rumors", "Intel"], ranks: ["Listener", "Spy", "Broker", "Shadow Master", "Shadow Chancellor"] },
        historian: { name: "Historian", tier: 3, produces: ["Historical Audit"], ranks: ["Researcher", "Verified Scribe", "Analyst", "Senior Historian", "Grand Historian"] },

        // TIER 4: ARCANE & SOCIAL
        arcane_proprietor: { name: "Arcane Proprietor", tier: 4, produces: ["Influence"], ranks: ["Barkeep", "Host", "Proprietor", "Arcane Steward", "Keeper of Doors"] },
        diplomat: { name: "Diplomat", tier: 4, produces: ["Treaties"], ranks: ["Envoy", "Negotiator", "Arbitrator", "Ambassador", "Grand Diplomat"] },
        matchmaker: { name: "Matchmaker", tier: 4, produces: ["Alliances"], ranks: ["Intermediary", "Contractor", "Alliance Weaver", "House Binder", "Court Architect"] },
        entertainer: { name: "Entertainer", tier: 4, produces: ["Reputation"], ranks: ["Busker", "Bard", "Performer", "Maestro", "Living Legend"] },

        // TIER 5: CIVILIZATION
        warden: { name: "Warden", tier: 5, produces: ["Protection"], ranks: ["Watcher", "Keeper", "Protector", "High Warden", "Guardian of the Forest"] },
        councilor: { name: "Councilor", tier: 5, produces: ["Policy"], ranks: ["Envoy", "Councilor", "Minister", "Regent", "High Chancellor"] },
        levy_commander: { name: "Levy Commander", tier: 5, produces: ["Army Power"], ranks: ["Sergeant", "Lieutenant", "Captain", "Commander", "Grand Marshal"] },
        builder: { name: "Builder", tier: 5, produces: ["Infrastructure"], ranks: ["Mason", "Architect", "Urban Planner", "Master Builder", "Realm Architect"] },
        recon_engineer: { name: "Reconstruction Engineer", tier: 5, produces: ["Resurgence"], ranks: ["Salvager", "Reconstruction Engineer", "Anchor Restorer", "Infrastructure Reconciler", "Master of Resurgence"] },

        // TIER 6: WORLD-SHAPERS
        navigator: { name: "Shift Navigator", tier: 6, produces: ["Safety"], ranks: ["Pathfinder", "Predictor", "Void-Gazer", "Navigator", "Master Navigator"] },
        cartographer: { name: "Shift Cartographer", tier: 6, produces: ["Coordinates"], ranks: ["Void-Watcher", "Shift Cartographer", "Coordinate Auditor", "Entropy Analyst", "Master of the Living Atlas"] },
        archivist: { name: "Archivist", tier: 6, produces: ["Memory Persistence"], ranks: ["Scribe", "Recorder", "Historian", "Epoch Keeper", "Grand Archivist"] },
        chronicler: { name: "Crow Chronicler", tier: 6, produces: ["Legacy"], ranks: ["Observer", "Storyteller", "Narrator", "Voice of the Crow", "Mythic Voice"] },
        noble_founder: { name: "Noble Founder", tier: 6, produces: ["Sovereignty"], ranks: ["Commoner", "Claimant", "Lord", "Great House Patriarch", "Matriarch"] }
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

        // --- DREAM PHASE 1: TRUTH INTEGRATION (Archivist/Historian XP) ---
        // Bible §21: "The player influences probability... dreams amplify ambition."
        let finalAmount = amount;
        if (window.DreamManager && (careerId === 'archivist' || careerId === 'chronicler')) {
            // We use the player's own dream state or a global 'TRUTH' multiplier 
            // since these are often player-driven career gains.
            const mod = window.DreamManager.getNPCDriveModifier('player', 'patience'); 
            if (mod > 1.0) {
                finalAmount *= mod;
                if (Math.random() < 0.05) window.EventBus.emit('UI_LOG', `[DREAM] A vision of TRUTH accelerates your studies.`);
            }
        }

        stats.xp += finalAmount;
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
