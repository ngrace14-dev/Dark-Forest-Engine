/**
 * FOREST SYSTEMS - Phase 1.5 (Updated)
 * 
 * Implements Multi-Scale Masking (Macro-Density + Micro-Placement)
 * and LOD management for efficient rendering of the 128k sq mile wilderness.
 * Integrated with Aethelgard Capital protection, Road kill-buffers, and Epoch shifts.
 */

class ForestSystem {
    constructor() {
        this.config = {
            tierA: 150, // Full Collision/VAT (100ft Redwoods)
            tierB: 600, // InstancedMesh Undergrowth & Pines
            tierC: 5000 // Billboards / Distant LOD
        };
        
        // ModificationsMap: Tracks harvested trees/changes until next Epoch shift
        this.modificationsMap = new Map();
    }

    /**
     * Fast, deterministic Linear Congruential Generator (LCG)
     * Replaces external seedrandom dependencies for reproducible chunk PRNG.
     */
    createPRNG(seed) {
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function() {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    /**
     * Hierarchical Micro/Macro Distribution Logic
     * @param {number} cx - Chunk X index
     * @param {number} cz - Chunk Z index
     */
    generateChunk(cx, cz) {
        const worldX = cx * 60 + 30;
        const worldZ = cz * 60 + 30;

        // 1. Aethelgard Capital Protection (No wild trees inside 280m city radius)
        if (window.CapitalCityManager?.isInsideCapital(worldX, worldZ)) {
            return { tierA: [], tierB: [], tierC: [] };
        }

        // 2. Macro-Density Check via Noise
        const density = window.WorldGenerator ? window.WorldGenerator.getNoise(worldX * 0.5, worldZ * 0.5) : 0.5;
        if (density < 0.35) return { tierA: [], tierB: [], tierC: [] };

        // 3. Micro-Placement (Poisson Disk Sampling)
        const rawPoints = this.generatePoissonPoints(cx, cz, worldX, worldZ, density);
        
        // 4. Fine-grained filtering against roads, villages, and harvested trees
        const validPoints = rawPoints.filter(p => {
            const instanceId = `${Math.floor(p.x)}_${Math.floor(p.z)}`;
            
            // Check if tree has been harvested
            if (this.modificationsMap.has(instanceId)) {
                const mod = this.modificationsMap.get(instanceId);
                if (mod.scale <= 0.01) return false;
            }

            // Check proximity to roads, villages, and capital
            return !this.isNearProtectedArea(p.x, p.z);
        });

        return {
            tierA: validPoints.filter(p => p.type === 'redwood'),
            tierB: validPoints.filter(p => p.type === 'pine' || p.type === 'bush'),
            tierC: []
        };
    }

    /**
     * Checks if a point is within 280m of Capital, 50m of a Village, or 10m of a Road.
     * @param {number} x - World X position
     * @param {number} z - World Z position
     */
    isNearProtectedArea(x, z) {
        try {
            // 1. Aethelgard Capital City Perimeter (280m)
            if (window.CapitalCityManager?.isInsideCapital(x, z)) {
                return true;
            }

            // 2. Settlement Protection (50m radius)
            if (window.VillageManager?.villages) {
                const nearVillage = window.VillageManager.villages.some(v => Math.hypot(x - v.x, z - v.z) < 50);
                if (nearVillage) return true;
            }

            // 3. Road / Safe Path Clearance Buffer (10m)
            if (window.RoadManager) {
                const cx = Math.floor(x / 60);
                const cz = Math.floor(z / 60);
                const localRoadPoints = window.RoadManager.getRoadPointsNear(cx, cz) || [];
                const nearRoad = localRoadPoints.some(r => Math.hypot(x - r.x, z - r.z) < 10);
                if (nearRoad) return true;
            }

            return false;
        } catch(e) {
            console.error("Forest System: Error checking protected areas", e);
            return false;
        }
    }

    /**
     * Generates points using Epoch seed for deterministic placement.
     */
    generatePoissonPoints(cx, cz, worldX, worldZ, density) {
        const points = [];
        const minRadius = density > 0.75 ? 18 : 7; // Redwoods vs Pine/Bramble spacing

        // Deterministic Seed combining Epoch seed and Chunk coordinates
        const epochSeed = window.EngineParams?.worldSeed ?? 1337;
        const seed = Math.abs(epochSeed * 73856093 ^ cx * 19349663 ^ cz * 83492791);
        const rng = this.createPRNG(seed);

        const candidateCount = Math.floor(15 + density * 20);

        for (let i = 0; i < candidateCount; i++) {
            const px = (worldX - 30) + rng() * 60;
            const pz = (worldZ - 30) + rng() * 60;

            // Check spacing against previously placed points in this chunk
            let valid = true;
            for (let j = 0; j < points.length; j++) {
                const p = points[j];
                if (Math.hypot(px - p.x, pz - p.z) < minRadius) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                const type = density > 0.70 ? 'redwood' : (rng() < 0.3 ? 'bush' : 'pine');
                points.push({ x: px, z: pz, type });
            }
        }

        return points;
    }

    /**
     * Harvesting Logic
     * @param {string} instanceId - Unique identifier formatted as "X_Z"
     */
    harvest(instanceId) {
        this.modificationsMap.set(instanceId, { scale: 0.001, timestamp: Date.now() });
        window.EventBus?.emit('UI_LOG', '[FOREST] Timber harvested from the woods.');
        window.EventBus?.emit('FOREST_TREE_HARVESTED', { instanceId });
    }

    /**
     * Shader Uniform Injection for Environment Effects (Burnt, Corruption, Shift Glow)
     * @param {THREE.Material} material
     * @param {object} uniforms
     */
    applyEnvironmentEffects(material, uniforms = {}) {
        if (!material) return;

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uForestCorruption = uniforms.corruption || { value: 0.0 };
            shader.uniforms.uEpochShiftProgress = uniforms.shiftProgress || { value: 0.0 };

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uForestCorruption;
                 uniform float uEpochShiftProgress;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uForestCorruption;
                 uniform float uEpochShiftProgress;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 vec3 corruptColor = vec3(0.15, 0.02, 0.05);
                 diffuseColor.rgb = mix(diffuseColor.rgb, corruptColor, uForestCorruption);
                 vec3 shiftGlow = vec3(0.9, 0.95, 1.0);
                 diffuseColor.rgb += shiftGlow * uEpochShiftProgress * 0.5;`
            );
        };
    }
}

window.ForestManager = new ForestSystem();
