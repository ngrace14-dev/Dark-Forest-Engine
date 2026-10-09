/**
 * File: src_systems_dune_investigation.js
 * Phase 11: Dune Discovery Framework
 * 
 * Implements Bible §11 (Endless Dunes) and The Origin Dossier.
 * Handles the "Lost Memory" layer of reality.
 * 
 * Law of the Dunes (Bible §5):
 * 1. Remains stable while occupied.
 * 2. Regenerates when abandoned.
 */

class DuneInvestigationSystem {
    constructor() {
        this.lostArchives = [];
        this.recoveredRecords = []; // Array of { id, title, detail, tier, targetHistoryId }
        this.isOccupied = false;
        this.discoveryChance = 0.05;
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.update());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Dunes] Lost Memory Scanning Active');
    }

    update() {
        if (!window.GameCore?.playerObj || !window.WorldGenerator) return;

        const pPos = window.GameCore.playerObj.visual?.position || { x: 0, z: 0 };
        const biome = window.WorldGenerator.getBiome(pPos.x, pPos.z);
        const insideDunes = biome === 'desert';

        // REGURGITATION CHECK (Bible §5)
        if (this.isOccupied && !insideDunes) {
            this.regenerateDunes();
        }
        
        this.isOccupied = insideDunes;

        if (this.isOccupied) {
            this.processDuneScanning();
        }
    }

    /**
     * Simulation of finding buried structures in the sands.
     * Bible §11: "Knowledge survives only through lost records and fragments."
     */
    processDuneScanning() {
        // Only trigger scan if player is moving and in Crow's Eye mode (Bible §26)
        if (window.CrowsEye?.isActive && Math.random() < this.discoveryChance) {
            this.spawnLostArchive();
        }
    }

    spawnLostArchive() {
        const pPos = window.GameCore.playerObj.visual.position;
        const tiers = ['MINOR', 'IMPORTANT', 'LEGENDARY', 'EPOCH'];
        const tier = (Math.random() < 0.1) ? 'EPOCH' : (Math.random() < 0.3) ? 'LEGENDARY' : (Math.random() < 0.6) ? 'IMPORTANT' : 'MINOR';

        const archive = {
            id: 'archive_' + Math.random().toString(36).substr(2, 5),
            x: pPos.x + (Math.random() - 0.5) * 50,
            z: pPos.z + (Math.random() - 0.5) * 50,
            type: Math.random() > 0.5 ? 'LOST_CITY' : 'ORIGIN_VAULT',
            tier: tier
        };

        this.lostArchives.push(archive);
        window.EventBus.emit('UI_LOG', `✨ [DUNES] A ${tier} structure has emerged from the sands.`);
        
        // Recover a fragment
        this.recoverArtifact(archive);
    }

    /**
     * Directly challenges public history with unfiltered data.
     * Bible Addendum BJ: "The player's goal is to understand why folklore exists."
     */
    recoverArtifact(archive) {
        // Find an Official Record to contradict
        const official = window.HistoryOffice?.officialLedger[Math.floor(Math.random() * (window.HistoryOffice.officialLedger.length || 1))];
        
        const record = {
            id: 'rec_' + Math.random().toString(36).substr(2, 9),
            title: `Recovered Record: ${archive.tier}`,
            detail: this.generateFragmentDetail(archive, official),
            tier: archive.tier,
            targetHistoryId: official ? official.id : null,
            day: window.EngineParams?.worldDay || 0
        };

        this.recoveredRecords.push(record);

        // Register as Legendary Intel (Bible §11)
        window.IntelManager?.register({
            type: 'FACT',
            payload: {
                title: record.title,
                description: record.detail,
                tags: ['LOST_MEMORY', archive.tier, 'ORIGIN_DOSSIER']
            },
            significance: { historical: archive.tier === 'EPOCH' ? 1000 : 500 },
            truth_state: 'TRUE',
            certainty: 1.0,
            isAnchored: true // Dune truth is eternal
        });

        // Trigger Investigation Contradiction
        if (official && window.InvestigationManager) {
            window.EventBus.emit('UI_LOG', `⚠️ [CONTRADICTION] Recovered data directly challenges Official Record: ${official.title}`);
        }
    }

    generateFragmentDetail(archive, official) {
        if (archive.tier === 'EPOCH') {
            return "THE CHAMPION DID NOT FLEE. HE WAS PIERCED BY 19 BLADES. THE SEAL IS COMPROMISED.";
        }
        if (official) {
            return `UNFILTERED LOG: The event described as "${official.title}" was actually a systemic failure of House ${official.bias}. Authority records were falsified.`;
        }
        return "Fragment: ...runic master... slaver of light... the void is a skip in time...";
    }

    regenerateDunes() {
        window.EventBus.emit('UI_LOG', '[DUNES] Sector Abandoned. The sands have shifted and memory is lost.');
        this.lostArchives = [];
        // In a full implementation, this would also clear the 3D meshes spawned by DunesSystem
        if (window.DunesSystemInstance?.clearAll) {
            window.DunesSystemInstance.clearAll();
        }
    }

    /**
     * The player solves an endgame mystery in the Dunes.
     * Bible: The Origin Dossier.
     */
    revealOriginTruth(type) {
        const truths = {
            'FOUNDER_BETRAYAL': {
                title: 'The Blood of the Champion',
                desc: 'Proof that the 19 Noble Founders were the traitors who stabbed the Champion.',
                mysteryId: 'founder_betrayal'
            },
            'WENDIGO_ORIGIN': {
                title: 'The Compromised Seal',
                desc: 'The First Wendigo is the Champion himself, broken by betrayal.',
                mysteryId: 'first_wendigo'
            }
        };

        const truth = truths[type];
        if (!truth) return;

        window.IntelManager?.register({
            type: 'FACT',
            payload: { title: truth.title, description: truth.desc },
            significance: { historical: 1000, crow: 500 },
            rarity: 'LEGENDARY',
            truth_state: 'TRUE',
            certainty: 1.0
        });

        window.EventBus.emit('UI_LOG', `🌌 [ORIGIN] A fundamental truth has been recovered: ${truth.title}`);
    }
}

window.DuneInvestigation = new DuneInvestigationSystem();
export default window.DuneInvestigation;
