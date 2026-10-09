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
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_COMPLETE', () => this.recordLongitudinalData());
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
