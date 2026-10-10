/**
 * File: src_systems_dynasty.js
 * Phase 8: House History & Institutional Memory
 * 
 * Implements Bible §19 (The Monopoly Bottleneck) and §36 (Civilizational Institutions).
 * Manages the 19 Noble Houses, their lineages, feuds, and claims to Blessed Spots.
 */

class DynastyManagerSystem {
    constructor() {
        this.houses = new Map(); // Map<house_id, HouseObject>
        this.feuds = []; // Array of { houseA, houseB, reason, intensity, startDate }
        
        window.EventBus.on('ENGINE_READY', () => this.init());
                window.EventBus.on('ENTITY_DIED', (data) => this.handleDeath(data));
        window.EventBus.on('LEGACY_HARVESTED', (data) => this.handleLegacyHarvest(data));
        window.EventBus.on('HISTORY_PUBLISHED', (narrative) => this.processNarrative(narrative));
    }

    init() {
        // Initialize the 19 Noble Houses (Bible §19)
        const houseNames = [
            'Terminus', 'Oakhaven', 'Ironspire', 'Silverrun', 'Blackwood',
            'Stonehelm', 'Goldleaf', 'Ravenwatch', 'Deepdell', 'Highcrag',
            'Windward', 'Stormfront', 'Mistmantle', 'Thornrose', 'Brightvale',
            'Duskmoor', 'Frostpeak', 'Shadowfell', 'Sunstride'
        ];

        houseNames.forEach((name, index) => {
            const id = `house_${name.toLowerCase()}`;
            this.houses.set(id, {
                id: id,
                name: `House ${name}`,
                founder: `Founder ${name}`,
                currentLeader: `lord_${name.toLowerCase()}_0`,
                lineage: [],
                claims: [],
                monopolies: [], // "Blessed Spots"
                prestige: 100,
                isBlessed: index < 9, // First 9 are "Blessed" (Bible §19)
                archives: [],
                // --- PHASE: HOUSE HISTORY ADDITIONS ---
                beliefs: {
                    crown: Math.random() > 0.5 ? 'LOYAL' : 'SKEPTICAL',
                    huntsman: 'FEARFUL',
                    orb: 'OBSERVANT',
                    shift: 'NECESSARY_EVIL'
                },
                secrets: new Set(), // Set of intel_id
                chronicle: [], // Array of event objects
                legacy: 0, // Total significance score
                contribution: 0 // Contribution to civilization
            });

            // Register House as a Bloodline in LegacyManager
            if (window.LegacyManager) {
                window.LegacyManager.getOrCreateBloodline(id);
            }
        });

        window.EventBus.emit('UI_LOG', '[Dynasty] Institutional Memory Engaged');
    }

    handleLegacyHarvest(data) {
        const house = this.houses.get(data.bloodlineId);
        if (house) {
            house.legacy += data.significance;
            house.prestige += Math.floor(data.significance / 100);
            window.EventBus.emit('UI_LOG', `[DYNASTY] ${house.name} legacy strengthened by Generation ${data.generation}.`);
        }
    }


    /**
     * Records an event specifically into a House's institutional memory.
     * Bible §36: "Institutions persist to carry knowledge forward."
     */
    recordHouseEvent(houseId, event) {
        const house = this.houses.get(houseId);
        if (!house) return;

        house.chronicle.push({
            id: event.id || `he_${Math.random().toString(36).substr(2, 5)}`,
            type: event.type,
            detail: event.detail,
            day: window.EngineParams?.worldDay || 0,
            significance: event.significance || 10
        });

        house.legacy += event.historicalWeight || 1;
        house.prestige += Math.floor((event.significance || 10) / 10);
    }

    /**
     * Add a secret that only this house knows.
     * Bible: "House Secrets Category"
     */
    addHouseSecret(houseId, intelId) {
        const house = this.houses.get(houseId);
        if (house) {
            house.secrets.add(intelId);
            window.IntelManager?.shareToInstitution(intelId, houseId);
        }
    }

    /**
     * Handles the death of a notable NPC.
     * Bible §36: "Individuals die; institutions persist."
     */
    handleDeath(entity) {
        if (!entity.houseId) return;

        const house = this.houses.get(entity.houseId);
        if (!house) return;

        // If the leader died, trigger succession
        if (house.currentLeader === entity.id) {
            this.triggerSuccession(house);
        }

        // If killed by a member of another house, start/intensify a feud
        if (entity.lastAttacker?.houseId && entity.lastAttacker.houseId !== entity.houseId) {
            this.recordFeudEvent(entity.houseId, entity.lastAttacker.houseId, 'BLOODSHED');
        }
    }

    triggerSuccession(house) {
        const oldLeader = house.currentLeader;
        // Simple succession: find highest level member of house or generate new heir
        const newLeaderId = `lord_${house.id.split('_')[1]}_${house.lineage.length + 1}`;
        
        // --- LEGACY TRANSFER PIVOT (Bible §36) ---
        if (oldLeader) {
            this.transferGenerationalLegacy(oldLeader, newLeaderId);
        }

        house.lineage.push(oldLeader);
        house.currentLeader = newLeaderId;

        const event = {
            actorId: house.id,
            type: 'SUCCESSION',
            detail: `${house.name}: Succession from ${oldLeader} to ${newLeaderId}.`,
            significance: 120,
            historicalWeight: 80
        };

        window.ChronicleManager?.recordEvent(event);
        window.EventBus.emit('UI_LOG', `[DYNASTY] ${house.name} has a new leader: ${newLeaderId}`);
    }

    /**
     * Transfers power, reputation, and beliefs from one generation to the next.
     * Bible §1: Action -> Legend -> History.
     */
    transferGenerationalLegacy(parentID, childId) {
        if (!window.PersonhoodManager) return;

        const parent = window.PersonhoodManager.getProfile(parentID);
        const child = window.PersonhoodManager.getProfile(childId);

        // 1. ANCESTRY LINK
        child.ancestry.parents.push(parentID);
        parent.ancestry.children.push(childId);

                // 2. BELIEF INHERITANCE WITH DRIFT (Bible §17)
        Object.keys(parent.traits).forEach(t => {
            const drift = (Math.random() * 0.2 - 0.1); // +/- 10% drift
            child.traits[t] = Math.max(0, Math.min(1.0, parent.traits[t] + drift));
        });

        // 2.5 LEGACY INHERITANCE (Bible §BN)
        if (window.LegacyManager) {
            const parentLegacy = window.LegacyManager.activeLegacies.get(parentID);
            if (parentLegacy) {
                const childLegacy = window.LegacyManager.registerEntity(childId, parentLegacy.bloodlineId);
                // Inherit a portion of the parent's story density as "Starting Renown"
                childLegacy.storyDensity = parentLegacy.storyDensity * 0.1;
            }
        }

        // 3. REPUTATION & FEUD INHERITANCE

        parent.relationships.forEach((rel, targetId) => {
            if (rel.type === 'RIVALRY' || rel.type === 'DISTRUST') {
                // Feuds pass down but slightly diluted
                window.PersonhoodManager.setRelationship(childId, targetId, rel.type, rel.weight * 0.7);
            } else if (rel.type === 'LOYALTY' || rel.type === 'FRIENDSHIP') {
                // Alliances pass down
                window.PersonhoodManager.setRelationship(childId, targetId, rel.type, rel.weight * 0.6);
            }
        });

        // 4. SECRET INHERITANCE
        if (window.IntelManager) {
            const inheritedIntel = window.IntelManager.getIntelForNode(parentID);
            inheritedIntel.forEach(intel => {
                window.IntelManager.grantOwnership(intel.intel_id, childId);
            });
        }
    }

    recordFeudEvent(houseA, houseB, reason) {
        let feud = this.feuds.find(f => 
            (f.houseA === houseA && f.houseB === houseB) || 
            (f.houseA === houseB && f.houseB === houseA)
        );

        if (!feud) {
            feud = { houseA, houseB, reason, intensity: 1, startDate: window.EngineParams?.worldDay || 0 };
            this.feuds.push(feud);
            window.EventBus.emit('UI_LOG', `[FEUD] A blood-feud has begun between ${houseA} and ${houseB}!`);
        } else {
            feud.intensity += 1;
            feud.reason = reason;
        }

        // Feuds influence NPC cognition (Phase 5)
        // This is handled by ReputationManager.isRival() which we will hook into
    }

    processNarrative(narrative) {
        // Record official history into house archives
        const house = this.houses.get(narrative.bias);
        if (house) {
            house.archives.push(narrative.id);
        }
    }

    getHouse(id) {
        return this.houses.get(id);
    }

    getFeuds() {
        return this.feuds;
    }
}

window.DynastyManager = new DynastyManagerSystem();
export default window.DynastyManager;
