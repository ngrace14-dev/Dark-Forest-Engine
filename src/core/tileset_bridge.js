// ============================================================================
// Dark Forest Engine - Canonical Tileset Source-of-Truth Bridge
// File: src/core/tileset_bridge.js
// Reads directly from assets/tileset.json for both Browser & Headless Node.js
// ============================================================================

const rootScope = typeof window !== 'undefined' ? window : globalThis;

let _loadedTileset = null;

if (typeof process !== 'undefined' && process.versions?.node) {
    try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const jsonPath = path.resolve(__dirname, '../../assets/tileset.json');
        _loadedTileset = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
        console.warn('[TilesetBridge] Node fs load warning:', e?.message);
    }
} else if (typeof fetch === 'function') {
    try {
        const res = await fetch('./assets/tileset.json');
        if (res.ok) _loadedTileset = await res.json();
    } catch (e) {
        console.warn('[TilesetBridge] Browser fetch warning:', e?.message);
    }
}

export const TILESET = _loadedTileset;

const _materialCache = new Map();

/**
 * Resolves a material definition from assets/tileset.json into a THREE.MeshStandardMaterial
 * (or a headless material spec when running in pure Node.js).
 */
export function getTilesetMaterial(materialKey) {
    const matDef = TILESET?.artDirection?.materials?.[materialKey];
    if (!matDef) return null;

    const THREE = rootScope.THREE;
    if (!THREE) {
        return { materialKey, ...matDef };
    }

    if (_materialCache.has(materialKey)) {
        return _materialCache.get(materialKey);
    }

    const params = {
        color: new THREE.Color(matDef.baseColor),
        roughness: matDef.roughness ?? 0.8,
        metalness: matDef.metalness ?? 0.1
    };

    if (matDef.emissive) {
        params.emissive = new THREE.Color(matDef.emissive);
        params.emissiveIntensity = matDef.emissiveIntensity ?? 1.0;
    }

    const mat = new THREE.MeshStandardMaterial(params);
    mat.name = `tileset_mat_${materialKey}`;
    _materialCache.set(materialKey, mat);
    return mat;
}

export function getTilesetStructureSpec(tilesetId) {
    return TILESET?.structures?.[tilesetId] || null;
}

export function getTilesetActorSpec(actorId) {
    return TILESET?.actors?.[actorId] || null;
}

export function getTilesetStatusVisual(statusKey) {
    return TILESET?.statusVisuals?.[statusKey] || null;
}

/**
 * Applies either 'normalCycle' or 'whiteVoidShift' lighting & fog parameters directly from assets/tileset.json
 */
export function applyTilesetLightingState(cycleKey = 'normalCycle') {
    const lightSpec = TILESET?.artDirection?.lighting?.[cycleKey]
        || TILESET?.artDirection?.lighting?.normalCycle;
    if (!lightSpec) return null;

    if (rootScope.EngineParams) {
        rootScope.EngineParams.activeLightingCycle = cycleKey;
        rootScope.EngineParams.fogDensity = lightSpec.fogDensity;
    }

    if (rootScope.VolumetricFogSystem?.fogUniforms) {
        const fu = rootScope.VolumetricFogSystem.fogUniforms;
        if (fu.uFogDensity) fu.uFogDensity.value = lightSpec.fogDensity;
        if (fu.uFogColor?.value?.set) fu.uFogColor.value.set(lightSpec.fogHex);
        if (fu.uSunColor?.value?.set) fu.uSunColor.value.set(lightSpec.directionalHex);
    }

    if (rootScope.ForestImpostorSystem?.uniforms) {
        const iu = rootScope.ForestImpostorSystem.uniforms;
        if (iu.uFogDensity) iu.uFogDensity.value = lightSpec.fogDensity;
        if (iu.uFogColor?.value?.set) iu.uFogColor.value.set(lightSpec.fogHex);
    }

    if (rootScope.RenderPipeline) {
        if (rootScope.RenderPipeline.ambientLight?.color?.set) {
            rootScope.RenderPipeline.ambientLight.color.set(lightSpec.ambientHex);
        }
        if (rootScope.RenderPipeline.dirLight?.color?.set) {
            rootScope.RenderPipeline.dirLight.color.set(lightSpec.directionalHex);
        }
    }

    rootScope.EventBus?.emit?.('TILESET_LIGHTING_CHANGED', { cycleKey, lightSpec });
    return lightSpec;
}

rootScope.TilesetBridge = {
    TILESET,
    getTilesetMaterial,
    getTilesetStructureSpec,
    getTilesetActorSpec,
    getTilesetStatusVisual,
    applyTilesetLightingState
};

export default rootScope.TilesetBridge;
