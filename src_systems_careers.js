/**
 * File: src_systems_careers.js
 * Manages life skill progression, career ranks, and economic influence.
 */

window.CareerManager = {
    careers: {
        'tavern_owner': {
            name: 'Tavern Owner',
            level: 1, xp: 0, nextXp: 100,
            ranks: ['Barkeep', 'Innkeeper', 'Establishment Owner', 'Socialite', 'Legendary Host'],
            description: 'Focuses on social gathering, food service, and information gathering.'
        },
        'property_magnate': {
            name: 'Property Magnate',
            level: 1, xp: 0, nextXp: 200,
            ranks: ['Landlord', 'Estate Manager', 'Urban Developer', 'District Lord', 'Realm Architect'],
            description: 'Focuses on building construction, upgrades, and real estate ownership.'
        },
        'merchant_prince': {
            name: 'Merchant Prince',
            level: 1, xp: 0, nextXp: 150,
            ranks: ['Peddler', 'Trade Factor', 'Guild Master', 'Merchant Prince', 'Economic Sovereign'],
            description: 'Focuses on global trade, resource dominance, and market manipulation.'
        },
        'trade_broker': {
            name: 'Trade Broker',
            level: 1, xp: 0, nextXp: 120,
            ranks: ['Negotiator', 'Contractor', 'Trade Broker', 'Economic Diplomat', 'Master of Coin'],
            description: 'Focuses on contracts, information brokerage, and noble house deals.'
        }
    },

    init: function() {
        // Load careers from GameState if they exist, otherwise initialize
        if (window.GameState.careers) {
            this.careers = window.GameState.careers;
        } else {
            window.GameState.careers = this.careers;
        }
    },

    addXp: function(careerId, amount) {
        const career = this.careers[careerId];
        if (!career) return;

        career.xp += amount;
        while (career.xp >= career.nextXp) {
            career.xp -= career.nextXp;
            career.level++;
            career.nextXp = Math.floor(career.nextXp * 1.5);
            
            const rankIndex = Math.min(career.ranks.length - 1, Math.floor(career.level / 5));
            const newRank = career.ranks[rankIndex];
            
            window.EventBus.emit('UI_LOG', `[CAREER] Level Up! You are now a Level ${career.level} ${newRank} (${career.name}).`);
            window.EventBus.emit('CAREER_LEVEL_UP', { careerId, level: career.level, rank: newRank });
        }
        window.EventBus.emit('UI_UPDATE_STATS');
    },

    getCurrentRank: function(careerId) {
        const career = this.careers[careerId];
        if (!career) return 'None';
        const rankIndex = Math.min(career.ranks.length - 1, Math.floor(career.level / 5));
        return career.ranks[rankIndex];
    }
};

window.CareerManager.init();
