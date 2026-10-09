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
     */
    processDuneScanning() {
        // Only trigger scan if player is moving and in Crow's Eye mode (Bible §26)
        if (window.CrowsEye?.isActive && Math.random() < this.discoveryChance) {
            this.spawnLostArchive();
        }
    }

    spawnLostArchive() {
        const pPos = window.GameCore.playerObj.visual.position;
        const archive = {
            id: 'archive_' + Math.random().toString(36).substr(2, 5),
            x: pPos.x + (Math.random() - 0.5) * 50,
            z: pPos.z + (Math.random() - 0.5) * 50,
            type: Math.random() > 0.5 ? 'LOST_CITY' : 'ORIGIN_VAULT'
        };

        this.lostArchives.push(archive);
        window.EventBus.emit('UI_LOG', `✨ [DUNES] A shimmering structure has emerged from the sands: ${archive.type.replace('_', ' ')}`);
        
        // Register an Intel Record immediately so the player can investigate
        window.IntelManager?.register({
            type: 'RUMOR',
            payload: {
                title: `Uncovered: ${archive.type}`,
                description: `A structural anomaly detected in the Endless Dunes at [${Math.round(archive.x)}, ${Math.round(archive.z)}].`,
                target_coord: { x: archive.x, z: archive.z }
            },
            significance: { historical: 400 },
            rarity: 'LEGENDARY'
        });
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
