/**
 * File: src_systems_origin.js
 * Phase: The Origin Mystery Engine
 * 
 * Implements the Origin Dossier and Interpretation Engine (Bible Origin Dossier).
 * Tracks the evolution of historical models regarding the Great Fracture.
 */

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
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Origin] The Zero Horizon is Visible');
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

    getDossier() {
        return Object.values(this.categories);
    }
}

window.OriginEngine = new OriginMysterySystem();
export default window.OriginEngine;
