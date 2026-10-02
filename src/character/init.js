import { CharacterManager } from './CharacterManager.js';
import { CoreCharacter } from './CoreCharacter.js';
import { PlayerController } from './PlayerController.js';
import { CameraRig } from './CameraRig.js';
import { CharacterVisual } from './CharacterVisual.js';

// Setup global for Integration Test hook inside engine.js
window.CharacterManager = CharacterManager;
window.CoreCharacter = CoreCharacter;
window.PlayerController = PlayerController;
window.CameraRig = CameraRig;
window.CharacterVisual = CharacterVisual;

// Export everything so other modules can use them if needed.
export {
    CharacterManager,
    CoreCharacter,
    PlayerController,
    CameraRig,
    CharacterVisual
};
