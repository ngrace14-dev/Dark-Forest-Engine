/**
 * DARK FOREST ENGINE - CIVILIZATION TRAUMA OFFICE (CTO)
 * 
 * "The forest remembers what man forgets, but societies remember what they fear."
 * 
 * Tracks long-term societal scars from specific catastrophes.
 * Determines how historical pain shapes future institutional policy and cultural behavior.
 */

class CivilizationTraumaOffice {
    constructor() {
        this.traumaRegistry = new Map(); // EntityID (Village/House) -> TraumaProfile
        
        this.TRAUMA_TYPES = {
            FAMINE: 'FAMINE',
            WAR: 'WAR',
            FUEL_COLLAPSE: 'FUEL_COLLAPSE',
            MONSTER_ATTACK: 'MONSTER_ATTACK',
            HOUSE_COLLAPSE: 'HOUSE_COLLAPSE'
        };

        this.TRAUMA_DEFAULTS = {
            persistence: 0.98, // Decay rate per month (higher = remembers longer)
            sensitivity: 1.0,  // Multiplier for new trauma
            institutionalAnxiety: 0.0,
            culturalFear: 0.0
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '🏛️ [CTO] Civilization Trauma Office is now observing societal scars.');

        // External Event Listeners
        window.EventBus.on('FAMINE_DECLARED', (data) => this.recordTrauma(data.villageId, this.TRAUMA_TYPES.FAMINE, data.severity));
        window.EventBus.on('WAR_CASUALTIES', (data) => this.recordTrauma(data.houseId, this.TRAUMA_TYPES.WAR, data.amount / 100));
        window.EventBus.on('BARRIER_FAILURE', (data) => this.recordTrauma(data.villageId, this.TRAUMA_TYPES.FUEL_COLLAPSE, 50));
        window.EventBus.on('MONSTER_RAID_SUCCESS', (data) => this.recordTrauma(data.targetId, this.TRAUMA_TYPES.MONSTER_ATTACK, data.damage));
        window.EventBus.on('INSTITUTIONAL_COLLAPSE', (data) => this.recordTrauma(data.parentId || data.entityId, this.TRAUMA_TYPES.HOUSE_COLLAPSE, 100));

        // Longitudinal Decay
        window.EventBus.on('HEARTBEAT_T30D', () => this.processTimeDecay());
    }

    /**
     * Initializes or retrieves the trauma profile for a society.
     */
    getProfile(entityId) {
        if (!this.traumaRegistry.has(entityId)) {
            this.traumaRegistry.set(entityId, {
                id: entityId,
                scars: {
                    [this.TRAUMA_TYPES.FAMINE]: 0,
                    [this.TRAUMA_TYPES.WAR]: 0,
                    [this.TRAUMA_TYPES.FUEL_COLLAPSE]: 0,
                    [this.TRAUMA_TYPES.MONSTER_ATTACK]: 0,
                    [this.TRAUMA_TYPES.HOUSE_COLLAPSE]: 0
                },
                metrics: {
                    traumaPersistence: 0.99, // Villages remember longer than individuals
                    culturalFear: 0,
                    overreactionThreshold: 0.7,
                    institutionalAnxiety: 0,
                    lastMajorEventDay: 0
                },
                policyOverrides: [] // Changes to AI behavior based on trauma
            });
        }
        return this.traumaRegistry.get(entityId);
    }

    /**
     * Records a traumatic event and updates societal metrics.
     */
    recordTrauma(entityId, type, magnitude) {
        if (!entityId || !type) return;
        const profile = this.getProfile(entityId);
        
        const impact = magnitude * profile.metrics.traumaPersistence;
        profile.scars[type] = Math.min(100, profile.scars[type] + impact);
        profile.metrics.lastMajorEventDay = window.EngineParams?.worldDay || 0;

        this.recalculateMetrics(profile);
        
        window.EventBus.emit('UI_LOG_DEBUG', `[CTO] ${entityId} has suffered ${type} trauma. Current Scar: ${profile.scars[type].toFixed(1)}`);
        
        // Trigger Overreaction Cycle if trauma spikes
        if (profile.scars[type] > 50) {
            this.triggerOverreaction(entityId, type);
        }

        // Inform Folklore to crystallize this pain
        window.EventBus.emit('TRAUMA_CRYSTALLIZED', {
            entityId,
            type,
            magnitude,
            scarLevel: profile.scars[type]
        });
    }

    recalculateMetrics(profile) {
        const totalTrauma = Object.values(profile.scars).reduce((a, b) => a + b, 0);
        const avgTrauma = totalTrauma / Object.keys(this.TRAUMA_TYPES).length;

        // Cultural Fear: Direct result of recent/high scars
        profile.metrics.culturalFear = Math.min(1.0, totalTrauma / 150);

        // Institutional Anxiety: High fear + low persistence (panic) or high fear + high persistence (paranoia)
        profile.metrics.institutionalAnxiety = (profile.metrics.culturalFear * 0.8) + (avgTrauma / 100 * 0.2);

        // Update GCO metrics if available
        if (window.GCO) {
            // Normalize ID for GCO lookup (GCO uses village_N or house_name)
            const lookupId = typeof profile.id === 'number' ? `village_${profile.id}` : profile.id;
            const dna = window.GCO.entityDNA.get(lookupId);
            if (dna) {
                dna.metrics.collapseRisk = Math.min(1.0, dna.metrics.collapseRisk + (profile.metrics.institutionalAnxiety * 0.05));
            }
        }
    }

    /**
     * Overreaction Cycles:
     * When a society's fear is high, small events trigger massive policy shifts or panics.
     */
    triggerOverreaction(entityId, type) {
        const profile = this.getProfile(entityId);
        window.EventBus.emit('UI_LOG', `⚠️ [CTO] Overreaction Cycle triggered in ${entityId} due to ${type} trauma.`);

        const overreactionMap = {
            [this.TRAUMA_TYPES.FAMINE]: 'HOARDING_PROTOCOL',
            [this.TRAUMA_TYPES.WAR]: 'MILITARY_PARANOIA',
            [this.TRAUMA_TYPES.FUEL_COLLAPSE]: 'ESSENCE_RATIONING',
            [this.TRAUMA_TYPES.MONSTER_ATTACK]: 'XENOPHOBIC_ISOLATION',
            [this.TRAUMA_TYPES.HOUSE_COLLAPSE]: 'AUTOCRATIC_CONSOLIDATION'
        };

        const policy = overreactionMap[type];
        if (policy && !profile.policyOverrides.includes(policy)) {
            profile.policyOverrides.push(policy);
            window.EventBus.emit('SOCIETAL_POLICY_SHIFT', { entityId, policy, duration: 365 });
        }
    }

    /**
     * Longitudinal Decay: Trauma fades over generations.
     */
    processTimeDecay() {
        this.traumaRegistry.forEach((profile, id) => {
            let changed = false;
            for (let type in profile.scars) {
                if (profile.scars[type] > 0) {
                    profile.scars[type] *= profile.metrics.traumaPersistence;
                    if (profile.scars[type] < 0.1) profile.scars[type] = 0;
                    changed = true;
                }
            }

            if (changed) {
                this.recalculateMetrics(profile);
            }

            // Policy expiry
            if (profile.policyOverrides.length > 0 && Math.random() < 0.05) {
                const removed = profile.policyOverrides.pop();
                window.EventBus.emit('UI_LOG_DEBUG', `[CTO] ${id} has abandoned the policy: ${removed}`);
            }
        });
    }

    /**
     * How long do societies remember pain?
     * Returns the estimated days until a scar reaches "Legacy" status (under 5%).
     */
    getMemoryHorizon(entityId, type) {
        const profile = this.getProfile(entityId);
        const currentScar = profile.scars[type];
        if (currentScar <= 5) return 0;

        // Monthly decay math: current * (persistence ^ months) = 5
        // log(5/current) / log(persistence) = months
        const months = Math.log(5 / currentScar) / Math.log(profile.metrics.traumaPersistence);
        return Math.floor(months * 30);
    }

    /**
     * Output: Long-term societal trauma specification.
     */
    getSocietalSpecification(entityId) {
        const profile = this.getProfile(entityId);
        return {
            id: entityId,
            dominantTrauma: this._getDominantTrauma(profile),
            memoryDepth: profile.metrics.traumaPersistence > 0.99 ? 'ANCESTRAL' : 'GENERATIONAL',
            fearLevel: profile.metrics.culturalFear > 0.7 ? 'CRIPPLING' : (profile.metrics.culturalFear > 0.3 ? 'VIGILANT' : 'STABLE'),
            institutionalStance: profile.metrics.institutionalAnxiety > 0.6 ? 'PARANOID' : 'CAUTIOUS',
            activePolicies: [...profile.policyOverrides]
        };
    }

    _getDominantTrauma(profile) {
        let maxType = 'NONE';
        let maxVal = 0;
        for (let type in profile.scars) {
            if (profile.scars[type] > maxVal) {
                maxVal = profile.scars[type];
                maxType = type;
            }
        }
        return maxType;
    }
}

window.CTO = new CivilizationTraumaOffice();
export default window.CTO;
