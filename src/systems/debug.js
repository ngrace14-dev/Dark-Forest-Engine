// ============================================================================
// Dark Forest Engine - Scene & Forest Inspection Debug System
// File: src/systems/debug.js
// ============================================================================

export class ForestDebugSystem {
    constructor() {
        this.activeMode = 0;
        this.rawRenderEnabled = false;

        this.debugModes = {
            NORMAL: 0,
            TREES_ONLY: 1,
            CANOPIES_ONLY: 2,
            GROUND_ONLY: 3,
            GRASS_ONLY: 4,
            FOREST_FLOOR_ONLY: 5,
            LIGHTING_ONLY: 6,
            FOG_ONLY: 7
        };

        this.bindKeyListeners();
    }

    bindKeyListeners() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F8') {
                this.toggleRawRenderMode();
            }
            if (e.key === 'F9') {
                this.cycleDebugMode();
            }
        });
    }

    toggleRawRenderMode() {
        this.rawRenderEnabled = !this.rawRenderEnabled;
        console.log(`[ForestDebug] Raw Neutral Render Mode: ${this.rawRenderEnabled ? 'ENABLED' : 'DISABLED'}`);

        if (window.VolumetricFogSystem) {
            window.VolumetricFogSystem.enabled = !this.rawRenderEnabled;
        }

        if (window.ForestRenderer) {
            window.ForestRenderer.sharedUniforms.uRawDebugMode.value = this.rawRenderEnabled ? 1.0 : 0.0;
        }

        if (window.GameCore?.renderer) {
            const renderer = window.GameCore.renderer;
            if (this.rawRenderEnabled) {
                renderer.toneMapping = 0;
                renderer.toneMappingExposure = 1.0;
            } else {
                renderer.toneMapping = 4;
                renderer.toneMappingExposure = 0.88;
            }
        }
    }

    cycleDebugMode() {
        this.activeMode = (this.activeMode + 1) % 8;
        const modeName = Object.keys(this.debugModes).find(k => this.debugModes[k] === this.activeMode);
        console.log(`[ForestDebug] Active Render Inspection Mode: [${this.activeMode}] ${modeName}`);

        const scene = window.GameCore?.scene;
        if (!scene) return;

        scene.traverse((obj) => {
            if (!obj.isMesh && !obj.isInstancedMesh) return;

            switch (this.activeMode) {
                case 1:
                    obj.visible = obj.name.includes('Redwood') || obj.name.includes('Trunk');
                    break;
                case 2:
                    obj.visible = obj.name.includes('Foliage') || obj.name.includes('Canopy');
                    break;
                case 3:
                    obj.visible = obj.name.includes('Terrain') || obj.name.includes('Ground');
                    break;
                case 4:
                    obj.visible = obj.name.includes('Grass');
                    break;
                case 5:
                    obj.visible = obj.name.includes('Duff') || obj.name.includes('Floor');
                    break;
                default:
                    obj.visible = true;
                    break;
            }
        });
    }
}

if (typeof window !== 'undefined') {
    window.ForestDebugSystem = new ForestDebugSystem();
}
export default window.ForestDebugSystem;
