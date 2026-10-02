// File: src/character/CharacterManager.js

/**
 * CharacterManager
 * 
 * Orchestrates the lifecycle and updates for all characters (Player, NPCs, etc.)
 * Provides centralized control over update budgets and future LOD assignments.
 */
export class CharacterManager {
    constructor() {
        this.characters = [];
        this.player = null;
        
        // Very rough budget tracking (conceptual for now)
        this.budgets = {
            maxCharacterMs: 0.50, // ms budget for character logic per frame
        };
    }

    registerPlayer(character) {
        this.player = character;
        this.registerCharacter(character);
    }

    registerCharacter(character) {
        if (!this.characters.includes(character)) {
            this.characters.push(character);
        }
    }

    unregisterCharacter(character) {
        const index = this.characters.indexOf(character);
        if (index > -1) {
            this.characters.splice(index, 1);
        }
        if (this.player === character) {
            this.player = null;
        }
    }

    update(delta) {
        // Enforce update order:
        // 1. Logic/Intent -> 2. Physics/Movement -> 3. Animation/Visual Sync
        
        // Currently, physics stepping happens at the engine level (GameCore.world.step()),
        // so CharacterManager updates intents BEFORE the engine physics step,
        // and syncs visuals AFTER the physics step.
        // For now, we'll keep a single unified update loop for characters that handles their internal logic.
        // We will separate the "Pre-Physics" and "Post-Physics" phases.

        for (let i = 0; i < this.characters.length; i++) {
            this.characters[i].prePhysicsUpdate(delta);
        }
    }

    postPhysicsUpdate(delta) {
        for (let i = 0; i < this.characters.length; i++) {
            this.characters[i].postPhysicsUpdate(delta);
        }
    }
}
