/**
 * File: src_systems_archives.js
 * Phase: Mountain Ring & Recorded Memory
 * 
 * Implements Bible §5 (Mountain Ring) and §8 (House Terminus).
 * Handles the persistent recording of longitudinal data.
 */

class MountainArchiveSystem {
    constructor() {
        this.measurements = []; // Array of { epoch, rotation, starPos, distanceToCapital }
        this.activeTheories = new Map(); // theoryId -> { name, description, accuracy }
        
        // --- PHASE 3: PHYSICAL HISTORY ---
                this.records = new Map(); // record_id -> HistoricalRecord object
        this.archiveContainers = new Map(); // building_id -> { records: Set<record_id>, access_level: 0 }
        this.monuments = new Map(); // monument_id -> { record_id, radius: 5 }
        this.itemHistory = new Map(); // item_instance_id -> anchoredHistory: Set<intel_id>

        window.EventBus.on('ENGINE_READY', () => this.init());

        window.EventBus.on('SHIFT_COMPLETE', () => this.recordLongitudinalData());
        
        // Monument Proximity Tick
        window.EventBus.on('AI_TICK', ({ delta }) => this.updateMonuments(delta));
    }

    /**
     * Creates a new physical record from a subjective memory.
     * Bible §Information Ownership: Transcription converts RAM data to a physical item.
     */
    createRecord(intel_id, scribe_id, accuracy = 1.0) {
        const intel = window.IntelManager?.lookup(intel_id);
        if (!intel) return null;

        const recordId = `record_${Math.random().toString(36).substr(2, 9)}`;
        const record = {
            id: recordId,
            intel_id: intel_id,
            scribe_id: scribe_id,
            creation_day: window.EngineParams?.worldDay || 0,
            accuracy: accuracy,
            integrity: 100, // Physical condition
            version: intel.version,
            title: intel.payload.title,
            isAnchored: intel.isAnchored || false
        };

        this.records.set(recordId, record);
        
        // Create the physical document item
        if (window.ItemDatabase) {
            window.ItemDatabase[recordId] = {
                id: recordId,
                name: `Record: ${record.title}`,
                type: 'document',
                weight: 0.5,
                metadata: { record_id: recordId },
                description: `A physical transcription of ${record.title}. Created on Day ${record.creation_day}.`
            };
        }

        window.EventBus.emit('UI_LOG_DEBUG', `[HISTORY] New record created: ${record.title}`);
        return recordId;
    }

    /**
     * Links an archive building to the storage system.
     */
    registerArchiveBuilding(building_id, access_level = 0) {
        this.archiveContainers.set(building_id, {
            records: new Set(),
            access_level: access_level
        });
    }

    storeRecordInArchive(building_id, record_id) {
        const container = this.archiveContainers.get(building_id);
        if (container && this.records.has(record_id)) {
            container.records.add(record_id);
            
            // Sync with Institutional Silo
            const record = this.records.get(record_id);
            const building = window.GameCore?.activeEntities.find(e => e.id === building_id);
            if (building && building.villageId) {
                window.IntelManager?.shareToInstitution(record.intel_id, `house_${building.nobleHouse?.toLowerCase() || 'neutral'}`);
            }
        }
    }

    /**
     * Monuments act as permanent witnesses.
     * Bible §5: Monuments preserve memory beyond the life of witnesses.
     */
    registerMonument(entity_id, record_id, radius = 10) {
        this.monuments.set(entity_id, {
            record_id: record_id,
            radius: radius
        });
    }

    updateMonuments(delta) {
        if (!window.GameCore?.playerObj) return;
        const pPos = window.GameCore.playerObj.visual.position;

        this.monuments.forEach((data, entity_id) => {
            const monumentEnt = window.GameCore.activeEntities.find(e => e.id === entity_id);
            if (!monumentEnt) return;

            const dist = monumentEnt.visual.position.distanceTo(pPos);
            if (dist < data.radius) {
                const record = this.records.get(data.record_id);
                if (record && window.IntelManager) {
                    // Player (and NPCs in future) "witnesses" the monument's truth
                    if (!window.IntelManager.ownershipRegistry.get(record.intel_id)?.has('player')) {
                        window.IntelManager.grantOwnership(record.intel_id, 'player');
                        window.EventBus.emit('UI_LOG', `[HISTORY] You read the inscriptions on the ${monumentEnt.name}. A forgotten truth is revealed.`);
                    }
                }
            }
        });
    }

        /**
     * The Steel Strand: Physical Item Provenance.
     * Bible §Power: "History is physically attached to the tool of the history."
     */
    anchorIntelToItem(itemInstanceId, intel_id) {
        if (!this.itemHistory.has(itemInstanceId)) {
            this.itemHistory.set(itemInstanceId, new Set());
        }
        this.itemHistory.get(itemInstanceId).add(intel_id);
        window.EventBus.emit('UI_LOG_DEBUG', `[STEEL] Item ${itemInstanceId} has witnessed a new truth.`);
    }

    readItemProvenance(itemInstanceId, readerId) {
        const history = this.itemHistory.get(itemInstanceId);
        if (history && window.IntelManager) {
            history.forEach(intelId => {
                window.IntelManager.grantOwnership(intelId, readerId);
            });
            window.EventBus.emit('UI_LOG', `[HISTORY] You study the markings on the artifact. It speaks of the past.`);
        }
    }

    init() {


        // Initialize Terminus Theories (Bible §8)
        this.activeTheories.set('static_mountain_theory', {
            name: 'The Fixed Bedrock',
            description: 'The belief that the Mountain Ring is the unmoving anchor of reality.',
            isOfficial: true,
            flaw: 'Ignores the 5% absolute reference frame of the Dunes.'
        });

        window.EventBus.emit('UI_LOG', '[Archives] Mountain Observation Post Active');
    }

    /**
     * Captures long-term data impossible to find in the Forest.
     * Bible §12: Preserving continuity and measurement.
     */
    recordLongitudinalData() {
        const epoch = window.EngineParams?.worldEpoch || 0;
        const rotation = window.EngineParams?.mountainRotation || 0;
        
        // Star Chart logic: Simulated "Strands of Light"
        const starChart = {
            id: `stars_e${epoch}`,
            observedRotation: rotation,
            constellationDelta: rotation * 2.0 // Simulated displacement
        };

        const measurement = {
            epoch: epoch,
            rotation: rotation,
            starChart: starChart,
            timestamp: window.EngineParams?.worldDay || 0
        };

        this.measurements.push(measurement);

        // Register as Institutional Intel for Terminus and Guardians
        window.IntelManager?.register({
            type: 'FACT',
            payload: {
                title: `Longitudinal Record: Epoch ${epoch}`,
                description: `Star chart displacement recorded at ${rotation.toFixed(2)} radians.`,
                tags: ['MOUNTAIN_ARCHIVE', 'LONGITUDINAL']
            },
            significance: { historical: 150 },
            isAnchored: true // Survives Shifts
        });
        
        window.IntelManager?.shareToInstitution(`stars_e${epoch}`, 'house_terminus');
        window.IntelManager?.shareToInstitution(`stars_e${epoch}`, 'guardians_300');
    }

    getMeasurements() {
        return this.measurements;
    }
}

window.MountainArchives = new MountainArchiveSystem();
export default window.MountainArchives;
