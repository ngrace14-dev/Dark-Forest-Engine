import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

export class EpochManager {
    constructor() {
        this.baseSeed = window.EngineParams.worldSeed || 'dark_forests_1337';
        this.currentEpoch = window.EngineParams.lastCycleDay ? Math.floor(window.EngineParams.lastCycleDay / window.EngineParams.cycleLengthDays) : 0;
        this.currentSeed = this._generateEpochSeed();
        this.prng = alea(this.currentSeed);
        this.noise2D = createNoise2D(this.prng);
        
        // Configuration for the World's scale and biomes
        this.config = {
            noiseScale: 0.003,
            darkForestSideMeters: 575843.2,
            mountainRingWidthMeters: 160934.4,
            biomes: {
                'redwoods': { name: 'NorCal Redwoods', color: 0x1a2f21, prefab: 'Oak Tree', density: 12 },
                'alpine': { name: 'Shasta Alpine', color: 0x363a40, prefab: 'Razor Rock Monolith', density: 6 },
                'valley': { name: 'Central Valley', color: 0x453f2c, prefab: 'Bramble Bush', density: 10 },
                'coastal': { name: 'Lost Coast', color: 0x22303d, prefab: 'Moss-Covered Log', density: 8 },
                'sierra': { name: 'Sierra Nevada Wall', color: 0x4a4a4a, prefab: 'Razor Rock Monolith', density: 4 },
                'desert': { name: 'Deep Desert', color: 0xc2b280, prefab: 'Stone Path', density: 5 }
            }
        };
    }

    _generateEpochSeed() {
        return `${this.baseSeed}_epoch_${this.currentEpoch}`;
    }

    advanceEpoch() {
        this.currentEpoch++;
        this.currentSeed = this._generateEpochSeed();
        this.prng = alea(this.currentSeed);
        this.noise2D = createNoise2D(this.prng);
        return this.currentEpoch;
    }

    // Mathematical representation of the world given current epoch
    getNoise(x, z) {
        return this.noise2D(x * this.config.noiseScale, z * this.config.noiseScale);
    }

    getBiome(x, z) {
        const halfForestSide = this.config.darkForestSideMeters / 2;
        const furthestAxisDistance = Math.max(Math.abs(x), Math.abs(z));
        
        // World Borders
        if (furthestAxisDistance > halfForestSide + this.config.mountainRingWidthMeters) return 'desert';
        if (furthestAxisDistance > halfForestSide) return 'sierra';
        
        // Procedural Forest Biomes
        const val = this.getNoise(x, z);
        if (val > 0.45) return 'alpine';
        if (val < -0.3) return 'coastal';
        if (val > -0.3 && val < 0.1) return 'valley';
        return 'redwoods';
    }

    getTerrainHeight(x, z, shieldedPOIs = []) {
        // 1. Check if this coordinate is inside a Shielded POI (Village/Base)
        // If it is, flatten the terrain to the POI's fixed height.
        for (const poi of shieldedPOIs) {
            const dx = x - poi.x;
            const dz = z - poi.z;
            const distSq = dx*dx + dz*dz;
            if (distSq < poi.radius * poi.radius) {
                // Apply a smooth falloff mask around the edge of the POI
                const dist = Math.sqrt(distSq);
                const falloffRange = 20; // 20 meters of blending
                if (poi.radius - dist < falloffRange) {
                    const blend = (poi.radius - dist) / falloffRange;
                    const naturalHeight = this._calculateNaturalHeight(x, z);
                    return (poi.y * blend) + (naturalHeight * (1 - blend));
                }
                return poi.y; // Perfectly flat inside the shield
            }
        }
        
        return this._calculateNaturalHeight(x, z);
    }

    _calculateNaturalHeight(x, z) {
        let height = this.noise2D(x * 0.005, z * 0.005) * 8; 
        const biomeKey = this.getBiome(x, z);
        
        if (biomeKey === 'alpine' || biomeKey === 'sierra') {
            height += Math.max(0, this.noise2D(x * 0.01, z * 0.01) * 20);
        }
        
        // Add Micro-noise (Roughness)
        height += this.noise2D(x * 0.05, z * 0.05) * 1.5;

        return height;
    }
}
