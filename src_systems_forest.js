/**
 * FOREST SYSTEMS - Phase 1.5 (Updated)
 * 
 * Implements Multi-Scale Masking (Macro-Density + Micro-Placement)
 * and LOD management for efficient rendering of the 128k sq mile wilderness.
 */

class ForestSystem {
    constructor() {
        this.config = {
            tierA: 150, // Full Collision/VAT (100ft Redwoods)
            tierB: 600, // InstancedMesh Undergrowth & Pines
            tierC: 5000 // Billboards / Distant LOD
        };
        
        this.modificationsMap = new Map();
    }

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
     */
    generateChunk(cx, cz) {
        const worldX = cx * 60 + 30;
        const worldZ = cz * 60 + 30;

        // 1. Aethelgard Capital Protection (No wild trees inside 280m city radius)
        if (window.CapitalCityManager?.isInsideCapital(worldX, worldZ)) {
            return { tierA: [], tierB: [], tierC: [] };
        }

        // 2. Calibrated Macro-Density Check via Noise (0.003 frequency for vast forest patches)
        const density = window.WorldGenerator ? window.WorldGenerator.getNoise(worldX * 0.003, worldZ * 0.003) : 0.6;
        if (density < 0.20) return { tierA: [], tierB: [], tierC: [] };

        // 3. Micro-Placement (Poisson Disk Sampling)
        const rawPoints = this.generatePoissonPoints(cx, cz, worldX, worldZ, density);
        
        // 4. Fine-grained filtering against roads, villages, and harvested trees
        const validPoints = rawPoints.filter(p => {
            const instanceId = `${Math.floor(p.x)}_${Math.floor(p.z)}`;
            
            if (this.modificationsMap.has(instanceId)) {
                const mod = this.modificationsMap.get(instanceId);
                if (mod.scale <= 0.01) return false;
            }

            return !this.isNearProtectedArea(p.x, p.z);
        });

        return {
            tierA: validPoints.filter(p => p.type === 'redwood'),
            tierB: validPoints.filter(p => p.type === 'bush'),
            tierC: []
        };
    }

    isNearProtectedArea(x, z) {
        try {
            if (window.CapitalCityManager?.isInsideCapital(x, z)) {
                return true;
            }

            if (window.VillageManager?.villages) {
                const nearVillage = window.VillageManager.villages.some(v => Math.hypot(x - v.x, z - v.z) < 50);
                if (nearVillage) return true;
            }

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

    generatePoissonPoints(cx, cz, worldX, worldZ, density) {
        const points = [];
        const minRadius = 12; // Balanced spacing for 100ft Redwoods

        const epochSeed = window.EngineParams?.worldSeed ?? 1337;
        const seed = Math.abs(epochSeed * 73856093 ^ cx * 19349663 ^ cz * 83492791);
        const rng = this.createPRNG(seed);

        const candidateCount = Math.floor(12 + density * 18);

        for (let i = 0; i < candidateCount; i++) {
            const px = (worldX - 30) + rng() * 60;
            const pz = (worldZ - 30) + rng() * 60;

            let valid = true;
            for (let j = 0; j < points.length; j++) {
                const p = points[j];
                if (Math.hypot(px - p.x, pz - p.z) < minRadius) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                // 60% Redwoods, 40% Undergrowth Bushes
                const type = (rng() < 0.65) ? 'redwood' : 'bush';
                points.push({ x: px, z: pz, type });
            }
        }

        return points;
    }

    harvest(instanceId) {
        this.modificationsMap.set(instanceId, { scale: 0.001, timestamp: Date.now() });
        window.EventBus?.emit('UI_LOG', '[FOREST] Timber harvested from the woods.');
        window.EventBus?.emit('FOREST_TREE_HARVESTED', { instanceId });
    }

    applyEnvironmentEffects(material, uniforms = {}) {
        if (!material) return;

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uForestCorruption = uniforms.corruption || { value: 0.0 };
            shader.uniforms.uEpochShiftProgress = uniforms.shiftProgress || { value: 0.0 };

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>\nuniform float uForestCorruption;\nuniform float uEpochShiftProgress;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>\nuniform float uForestCorruption;\nuniform float uEpochShiftProgress;`
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
