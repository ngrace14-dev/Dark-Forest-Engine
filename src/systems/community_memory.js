/**
 * DARK FOREST ENGINE - COMMUNITY MEMORY BUREAU (CMB)
 * 
 * Tracks the "Meaning" of commoner lives across 1000 years.
 * Determines if families, tradesmen, and folk heroes influence history.
 */

class CommunityMemoryBureau {
    constructor() {
        this.metrics = {
            communityMeaningIndex: 0,   // Global measure of commoner influence (0-1)
            villageMemoryScore: 0,      // Average retention of non-institutional stories
            familyLegacyCount: 0,       // Number of families reaching Gen 5+
            folkHeroDensity: 0          // Ratio of commoner legends vs. noble legends
        };

        this.familyLines = new Map(); // bloodlineId -> { generations, members, significance, professions }
        this.communityStories = [];   // Array of { day, villageId, description, significance }
        this.folkHeroes = new Map();  // nodeId -> { name, deeds, originVillage, generation }

        this.init();
    }

    init() {
        window.EventBus.on('ENGINE_READY', () => {
            window.EventBus.emit('UI_LOG', '🏠 [CMB] Community Memory Bureau Active.');
        });

        // Listen for commoner events
        window.EventBus.on('ENTITY_DIED', (data) => this.processLegacy(data));
        window.EventBus.on('AMBITION_FULFILLED', (data) => this.trackCommonerAchievement(data));
        window.EventBus.on('POEM_COMPOSED', (poem) => this.scanForCommunityMeaning(poem));
        
        // Longitudinal check every year
        window.EventBus.on('HEARTBEAT_T365D', () => this.generateCommunityReport());
    }

    /**
     * Tracks the growth and professional heritage of family lines.
     */
    processLegacy(data) {
        if (!window.PersonhoodManager) return;
        const profile = window.PersonhoodManager.getProfile(data.id);
        if (!profile) return;

        // Determine Bloodline (Simplified: Parent ID as root)
        const bloodlineId = (profile.ancestry?.parents?.length > 0) ? profile.ancestry.parents[0] : profile.id;
        
        if (!this.familyLines.has(bloodlineId)) {
            this.familyLines.set(bloodlineId, {
                id: bloodlineId,
                generations: 1,
                members: new Set(),
                significance: 0,
                professions: new Set()
            });
        }

        const line = this.familyLines.get(bloodlineId);
        line.members.add(profile.id);
        line.significance += (profile.traits?.credibility || 0) * 10;
        
        // Track Occupational Heritage
        if (profile.career?.id && profile.career.id !== 'COMMONER') {
            line.professions.add(profile.career.id);
        }

        // If child exists, increment generations
        if (profile.ancestry?.children?.length > 0) {
            line.generations = Math.max(line.generations, (profile.ancestry?.parents?.length || 0) + 2);
        }

        // Re-count family legacy metrics
        let legacyCount = 0;
        this.familyLines.forEach(l => {
            if (l.generations >= 5) legacyCount++;
        });
        this.metrics.familyLegacyCount = legacyCount;
    }

    /**
     * Determines if a "nobody" has influenced history.
     */
    trackCommonerAchievement(data) {
        const profile = window.PersonhoodManager?.getProfile(data.actorId);
        if (!profile) return;
        
        // Logic: Ordinary life matters if achievement comes from someone without an Institution or House
        if (profile.houseId || profile.institutionId) return;

        const achievementSignificance = 50; // Threshold for a "Local Legend"
        
        if (data.significance >= achievementSignificance) {
            this.folkHeroes.set(profile.id, {
                id: profile.id,
                name: profile.id,
                deeds: data.detail,
                originVillage: profile.property.homeVillageId,
                generation: (profile.ancestry?.parents?.length || 0) + 1
            });
            
            window.EventBus.emit('UI_LOG_DEBUG', `[CMB] New Folk Hero identified: ${profile.id} of Generation ${(profile.ancestry?.parents?.length || 0) + 1}.`);
        }
    }

    /**
     * Scans folklore for mentions of non-institutional entities.
     */
    scanForCommunityMeaning(poem) {
        if (poem.class === 'OBSERVATIONAL' || poem.class === 'WARNING') {
            this.communityStories.push({
                day: window.EngineParams?.worldDay || 0,
                villageId: poem.originId, // Heuristic
                description: poem.title,
                significance: poem.historicalWeight
            });
        }
    }

    generateCommunityReport() {
        const totalLegends = window.GameState?.legends?.length || 1;
        const folkLegends = Array.from(this.folkHeroes.values()).length;
        
        this.metrics.folkHeroDensity = folkLegends / totalLegends;

        // Village Memory Score = Count of active commoner stories / Villages
        const villageCount = window.VillageManager?.villages.length || 1;
        this.metrics.villageMemoryScore = this.communityStories.length / villageCount;

        // Community Meaning Index = (FolkHeroDensity + (LegacyCount / 100)) / 2
        this.metrics.communityMeaningIndex = (this.metrics.folkHeroDensity + (this.metrics.familyLegacyCount / 100)) / 2;

        window.EventBus.emit('CMB_REPORT', {
            metrics: { ...this.metrics },
            timestamp: Date.now()
        });

        const trend = this.metrics.communityMeaningIndex > 0.4 ? "VIBRANT" : "INSTITUTIONAL_HEGEMONY";
        window.EventBus.emit('UI_LOG', `📊 [CMB] Community Memory Report: Commoner Meaning is ${trend}. (Index: ${this.metrics.communityMeaningIndex.toFixed(2)})`);
    }
}

window.CMB = new CommunityMemoryBureau();
export default window.CMB;
