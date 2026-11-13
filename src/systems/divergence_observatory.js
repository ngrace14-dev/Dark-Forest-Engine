/**
 * DARK FOREST ENGINE - CIVILIZATIONAL DIVERGENCE OBSERVATORY (CDO)
 * 
 * Analyzes the emergence of distinct cultural identities across 1000-year spans.
 * Determines if variance is structural or merely cosmetic.
 */

class CivilizationalDivergenceObservatory {
    constructor() {
        this.metrics = {
            divergenceIndex: 0,        // Global measure of cultural variance (0-1)
            uniqueCivilizationCount: 0, // Number of clusters exceeding Identity Distance threshold
            cosmeticVarianceRatio: 1.0, // Ratio of entities that remain functionally identical
            historicalForkCount: 0      // Number of significant ideological splits
        };

        this.distanceMatrix = new Map(); // "A-B" -> distanceValue
        this.historicalForks = [];      // Array of { day, cause, entitiesInvolved, divergenceType }
        
        this.THRESHOLDS = {
            IDENTITY_DISTANCE: 0.6,    // Threshold to be considered a "Unique Civilization"
            COSMETIC_LIMIT: 0.15       // Below this, it's just a cosmetic variation
        };

        this.init();
    }

    init() {
        window.EventBus.on('ENGINE_READY', () => {
            window.EventBus.emit('UI_LOG', '📡 [CDO] Civilizational Divergence Observatory Online.');
        });

        // Listen for major divergence triggers
        window.EventBus.on('CULTURAL_SHIFT', (data) => this.recordHistoricalFork(data, 'CULTURE'));
        window.EventBus.on('HOUSE_SCHISM', (data) => this.recordHistoricalFork(data, 'IDEOLOGY'));
        window.EventBus.on('BELIEF_CLUSTERING_UPDATE', () => this.updateDistanceMatrix());
        
        // Deep analysis heartbeat (every season)
        window.EventBus.on('HEARTBEAT_T90D', () => this.performLongitudinalAudit());
    }

    /**
     * Calculates the "Identity Distance" between two entities.
     * Factors: Culture traits, House Ideology, Economic Philosophy, and Folklore.
     */
    calculateIdentityDistance(idA, idB) {
        const entityA = this.getDivergenceProfile(idA);
        const entityB = this.getDivergenceProfile(idB);

        if (!entityA || !entityB) return 1.0;

        let distance = 0;

        // 1. Cultural Trait Distance (0.3 weight)
        distance += this.compareMaps(entityA.culture, entityB.culture) * 0.3;

        // 2. Ideological Distance (0.3 weight)
        distance += this.compareSets(entityA.ideology, entityB.ideology) * 0.3;

        // 3. Economic Philosophy Distance (0.2 weight)
        distance += Math.abs(entityA.prosperityFocus - entityB.prosperityFocus) * 0.2;

        // 4. Folklore/Narrative Divergence (0.2 weight)
        distance += (1.0 - this.calculateMythologicalSimilarity(entityA.folklore, entityB.folklore)) * 0.2;

        return Math.min(1.0, distance);
    }

    getDivergenceProfile(id) {
        if (id.startsWith('village_')) {
            const vIndex = parseInt(id.split('_')[1]);
            const v = window.VillageManager?.villages[vIndex];
            if (!v) return null;

            const houseId = `house_${v.nobleHouse.toLowerCase().replace('house ', '')}`;
            const house = window.DynastyManager?.houses.get(houseId);
            const ideologyKeys = house ? Array.from(house.beliefs.keys()) : [];

            return {
                culture: v.culture.traits,
                ideology: new Set(ideologyKeys),
                prosperityFocus: v.stats.prosperity / 100,
                folklore: window.FolkloreEngine?.getAnthologyFor(id) || []
            };
        }
        return null;
    }

    compareMaps(mapA, mapB) {
        // Compare weights of common cultural traits
        let diff = 0;
        const keys = new Set([...mapA.keys(), ...mapB.keys()]);
        keys.forEach(k => {
            const valA = mapA.get(k)?.weight || 0;
            const valB = mapB.get(k)?.weight || 0;
            diff += Math.abs(valA - valB);
        });
        return keys.size > 0 ? diff / keys.size : 0;
    }

    compareSets(setA, setB) {
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return union.size > 0 ? 1.0 - (intersection.size / union.size) : 0;
    }

    calculateMythologicalSimilarity(folkloreA, folkloreB) {
        if (folkloreA.length === 0 || folkloreB.length === 0) return 0.5;

        // Compare thematic overlap in stanzas
        const themesA = new Set(folkloreA.map(p => p.class));
        const themesB = new Set(folkloreB.map(p => p.class));

        return this.compareSets(themesA, themesB);
    }

    recordHistoricalFork(data, type) {
        this.historicalForks.push({
            day: window.EngineParams?.worldDay || 0,
            cause: data.detail || 'Spontaneous Mutation',
            type,
            actor: data.actorId
        });
        this.metrics.historicalForkCount++;
    }

    updateDistanceMatrix() {
        const villages = window.VillageManager?.villages || [];
        for (let i = 0; i < villages.length; i++) {
            for (let j = i + 1; j < villages.length; j++) {
                const dist = this.calculateIdentityDistance(`village_${villages[i].id}`, `village_${villages[j].id}`);
                this.distanceMatrix.set(`${villages[i].id}-${villages[j].id}`, dist);
            }
        }
    }

    performLongitudinalAudit() {
        this.updateDistanceMatrix();
        
        const distances = Array.from(this.distanceMatrix.values());
        if (distances.length === 0) return;

        // 1. Civilization Divergence Index (Average Distance)
        const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
        this.metrics.divergenceIndex = avgDist;

        // 2. Cluster Analysis: Unique Civilizations
        // Count how many pairs exceed the IDENTITY_DISTANCE threshold
        const uniqueClusters = new Set();
        const villages = window.VillageManager?.villages || [];
        
        villages.forEach(v => {
            let isUnique = true;
            villages.forEach(other => {
                if (v.id === other.id) return;
                const dist = this.distanceMatrix.get(v.id < other.id ? `${v.id}-${other.id}` : `${other.id}-${v.id}`);
                if (dist < this.THRESHOLDS.IDENTITY_DISTANCE) {
                    isUnique = false; // Too similar to another village to be a "Unique Civilization"
                }
            });
            if (isUnique) uniqueClusters.add(v.id);
        });

        this.metrics.uniqueCivilizationCount = uniqueClusters.size;

        // 3. Cosmetic Variance Check
        const cosmeticCount = distances.filter(d => d < this.THRESHOLDS.COSMETIC_LIMIT).length;
        this.metrics.cosmeticVarianceRatio = cosmeticCount / distances.length;

        this.generateDivergenceReport();
    }

    generateDivergenceReport() {
        const century = Math.floor((window.EngineParams?.worldDay || 0) / 100);
        const report = {
            century,
            metrics: { ...this.metrics },
            verdict: this.metrics.uniqueCivilizationCount > 2 ? "STRUCTURAL_DIVERGENCE" : "COSMETIC_STAGNATION"
        };

        window.EventBus.emit('CDO_DIVERGENCE_REPORT', report);
        
        const summary = `📊 [CDO] Century ${century} Audit: ${this.metrics.uniqueCivilizationCount} Unique Civilizations emerged. Divergence Index: ${this.metrics.divergenceIndex.toFixed(2)}.`;
        window.EventBus.emit('UI_LOG', summary);
        
        if (this.metrics.cosmeticVarianceRatio > 0.8) {
            window.EventBus.emit('UI_LOG_DEBUG', "[CDO] Warning: High Cosmetic Variance. Regional traditions are failing to anchor.");
        }
    }
}

window.CDO = new CivilizationalDivergenceObservatory();
export default window.CDO;
