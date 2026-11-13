/**
 * File: src_systems_origin.js
 * Phase: The Origin Mystery Engine
 * 
 * Implements the Origin Dossier and Interpretation Engine (Bible Origin Dossier).
 * Tracks the evolution of historical models regarding the Great Fracture.
 */

export const birthright_pool = [
    { id: 'STORM_BORN', title: 'Storm-Born', description: 'Born during the Great Static. Affinity for atmospheric shifts.', logic: 'RESIST_FOG' },
    { id: 'HOUSE_REMNANT', title: 'House Remnant', description: 'The last of a shattered lineage. Social capital floor is higher.', logic: 'NOBLE_BLOOD' },
    { id: 'CHAMPION_KIN', title: 'Champion’s Kin', description: 'A distant echo of the one who broke the world.', logic: 'RUNE_SENSITIVE' },
    { id: 'ECHO_OF_SEAL', title: 'Echo of the Seal', description: 'Your heartbeat is synced to the world-grid.', logic: 'GRID_AWARE' },
    { id: 'VOID_DRIFTER', title: 'Void Drifter', description: 'Partially phased during the Fracture.', logic: 'PHASE_SHIFT' }
];

class OriginMysterySystem {
    constructor() {
        this.categories = {
            CHAMPION: { title: 'The Champion', model: 'THE_MONSTER', confidence: 1.0, evidence: [] },
            FOUNDERS: { title: 'The Founders', model: 'THE_SAVIORS', confidence: 1.0, evidence: [] },
            SEAL: { title: 'The Compromised Seal', model: 'THE_LOST_RITUAL', confidence: 1.0, evidence: [] },
            WENDIGO: { title: 'The First Wendigo', model: 'THE_STALKER', confidence: 1.0, evidence: [] },
            FRACTURE: { title: 'The Great Fracture', model: 'NATURAL_DISASTER', confidence: 1.0, evidence: [] }
        };

        // Theoretical models for interpretation (Bible Origin Dossier)
        this.models = {
            CHAMPION: {
                'THE_MONSTER': 'A slave who mastered forbidden runes to break the world.',
                'THE_LIBERATOR': 'A hero whoMastered runes to free his people from slavery.',
                'THE_VICTIM': 'A master of runes betrayed by his closest companions.',
                'THE_CONDUIT': 'A vessel for a containment ritual that partially succeeded.'
            },
            FOUNDERS: {
                'THE_SAVIORS': 'Those who fled the catastrophe to preserve the seed of life.',
                'THE_SURVIVORS': 'Opportunists who took control in the wake of the fracture.',
                'THE_TRAITORS': 'Companions who stabbed the Champion mid-ritual.'
            },
            SEAL: {
                'THE_LOST_RITUAL': 'An ancient rite forgotten by time.',
                'THE_PARTIAL_FAILURE': 'A containment attempt broken by emotional trauma.',
                'THE_COMPROMISED_GRID': 'A reality grid severed by a shattered focus.'
            }
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('DUNE_FRAGMENT_RECOVERED', (fragment) => this.processFragment(fragment));
        
        // Listen for entity initialization to inject birthrights
        window.EventBus.on('ENTITY_INITIALIZED', (entity) => this.injectBirthright(entity));
    }

        init() {
        window.EventBus.emit('UI_LOG', '[Origin] The Zero Horizon is Visible');
        
        // Inject player birthright if not already set
        if (window.GameCore?.playerObj && !window.GameCore.playerObj.birthright) {
            this.injectBirthright(window.GameCore.playerObj);
        }
    }

    /**
     * Updates the current historical model based on new evidence.
     * Bible: "Discoveries should not reveal answers. They should update models."
     */
    processFragment(fragment) {

        const category = this.categories[fragment.originCategory];
        if (!category) return;

        category.evidence.push(fragment);

        // Interpretation Logic: Confidence shifts and model pivots
        if (fragment.tier === 'EPOCH' || fragment.tier === 'LEGENDARY') {
            this.pivotModel(category, fragment);
        } else {
            this.refineModel(category, fragment);
        }

        window.EventBus.emit('UI_LOG', `[ORIGIN] Historical model updated: ${category.title}`);
        window.EventBus.emit('ORIGIN_MODEL_UPDATED', category);
    }

    /**
     * Assigns a birthright to an entity at t=0.
     * Bible §2: "Circumstances, not destiny."
     */
    injectBirthright(entity) {
        if (!entity || entity.birthright) return;

        const roll = Math.floor(Math.random() * birthright_pool.length);
        entity.birthright = birthright_pool[roll];
        
        if (entity.id === 'player' || entity.isPlayer) {
            window.EventBus.emit('UI_LOG', `🧬 [BIRTHRIGHT] You are ${entity.birthright.title}: ${entity.birthright.description}`);
            window.EventBus.emit('PLAYER_BIRTHRIGHT_ASSIGNED', entity.birthright);
        }
    }

    pivotModel(category, fragment) {
        // Logic to shift to a more complex model based on contradictory evidence
        if (category.title === 'The Founders' && fragment.detail.includes('stabbing')) {
            category.model = 'THE_TRAITORS';
            category.confidence = 0.4; // Drastic pivot reduces certainty
        }
        if (category.title === 'The Champion' && fragment.detail.includes('containment')) {
            category.model = 'THE_CONDUIT';
            category.confidence = 0.5;
        }
    }

    refineModel(category, fragment) {
        // Simple refinement increases confidence in current model
        category.confidence = Math.min(1.0, category.confidence + 0.05);
    }

        /**
     * FINAL EPOCH RESOLUTION: The Renunciation Choice
     * Bible Addendum BM: Facing the Trinity of Choice at Year 1000.
     */
    resolveMillennium() {
        const dossier = this.getDossier();
        const champion = dossier.find(d => d.title === 'The Champion');
        const founders = dossier.find(d => d.title === 'The Founders');
        
        const isBetrayalProven = champion.model === 'THE_VICTIM' && founders.model === 'THE_TRAITORS';
        const truthFidelity = window.WorldObservatory?.metrics?.globalFidelity || 0.5;

        window.EventBus.emit('UI_LOG', '🌌 [ORIGIN] The simulation has reached the Zero Horizon.');

        if (isBetrayalProven && truthFidelity > 0.8) {
            this.triggerTrinityChoice();
        } else {
            this.triggerOuroborosLoop();
        }
    }

    triggerTrinityChoice() {
        window.EventBus.emit('OPEN_TRINITY_DIALOG', {
            choices: [
                { id: 'CLAIM_THRONE', title: 'Claim the Throne', desc: 'Become the Sovereign. Restart the harvest.' },
                { id: 'REFUSE_THRONE', title: 'Refuse the Throne', desc: 'Become the Custodian. Break the loop.' },
                { id: 'WALK_AWAY', title: 'Walk Away', desc: 'Cease the observation. Free the world.' }
            ]
        });
    }

    triggerOuroborosLoop() {
        window.EventBus.emit('UI_LOG', '🌀 [OUROBOROS] The truth remains obscured. The cycle begins again.');
        setTimeout(() => {
            window.location.reload(); // The loop hard-reset
        }, 5000);
    }


window.OriginEngine = new OriginMysterySystem();
export default window.OriginEngine;
