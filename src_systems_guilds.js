/**
 * File: src_systems_guilds.js
 * System 29: Craft Guilds & Apprenticeship Pipelines
 */

class GuildSystem {
    constructor() {
        this.guilds = new Map(); // Map<guild_id, GuildObject>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Guilds] Trade Secrets & Apprenticeships Active');
    }

    /**
     * 29.1 Trade Secret Protection
     * 29.2 Master-Apprentice Ratios
     */
    registerGuild(name, industry) {
        const dna = window.GCO ? window.GCO.registerEntity(`guild_${name.toLowerCase().replace(/\s+/g, '_')}`, 'GUILD', {
            industry,
            traditions: ['Apprentice Trial', 'The Secret Handshake'],
            culture: [['MERCANTILE', 0.7], ['SECRETIVE', 0.6]]
        }) : null;

        this.guilds.set(name, {
            name,
            industry,
            secrets: new Set(),
            masters: [],
            apprentices: [],
            dna
        });
    }

    /**
     * 29.3 Guild Monopoly Strikes
     */
    triggerStrike(guildName) {
        window.EventBus.emit('UI_LOG', `[UNREST] The ${guildName} has declared a strike! Production halted.`);
    }
}

window.GuildManager = new GuildSystem();
export default window.GuildManager;
