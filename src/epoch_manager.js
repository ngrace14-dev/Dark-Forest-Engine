import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

export class EpochManager {
        constructor() {
        this.baseSeed = window.EngineParams.worldSeed || 'dark_forests_1337';
        this.currentEpoch = window.EngineParams.lastCycleDay ? Math.floor(window.EngineParams.lastCycleDay / window.EngineParams.cycleLengthDays) : 0;
        this.currentSeed = this._generateEpochSeed();
        this.prng = alea(this.currentSeed);
        this.noise2D = createNoise2D(this.prng);
        
        // REGIONAL RELATIVITY (Bible §5)
        this.mountainRotation = 0; // Cumulative rotation in radians
        this.duneSeed = this.baseSeed; // Regenerates when abandoned
        this.isDuneOccupied = false;

        // PHASE 1: ORPHIC HYDROLOGY & TECTONIC INVARIANTS (THE IDEAL BLUEPRINT)
        this.tectonicPlateVectors = [
            { id: 'PLATE_NORTH_AETHEL', strikeAngleRad: 0.35, dipAngleRad: 0.78, convergenceMag: 1.15, ridgeFrequency: 0.008 },
            { id: 'PLATE_EAST_TERMINUS', strikeAngleRad: 1.92, dipAngleRad: 0.85, convergenceMag: 1.25, ridgeFrequency: 0.007 },
            { id: 'PLATE_SOUTH_GALLows', strikeAngleRad: 3.49, dipAngleRad: 0.72, convergenceMag: 1.10, ridgeFrequency: 0.009 },
            { id: 'PLATE_WEST_ASHEN', strikeAngleRad: 5.06, dipAngleRad: 0.81, convergenceMag: 1.20, ridgeFrequency: 0.0075 }
        ];
        this.idealBlueprint = this._generateIdealBlueprint();
        
        // ... previous config ...

        // STABILITY: Prefer global config if defined, otherwise use internal defaults
        this.config = window.WorldGenConfig || {
            noiseScale: 0.015,
            darkForestSideMeters: 2000.0,
            mountainRingWidthMeters: 500.0,
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

    /**
     * Phase 1: Orphic Hydrology & Tectonic Invariants (The Ideal Blueprint)
     * Codifies the Mountain Ring as the primary watershed, the Great Lake as the primary sink,
     * directional tectonic lineaments, and extra-dimensional Infinity Feed siphon sources for Dune rivers.
     */
    _generateIdealBlueprint() {
        const halfForestSide = (this.config?.darkForestSideMeters || 1137800.0) / 2;
        const mountainWidth = this.config?.mountainRingWidthMeters || 160934.4;
        const lakeRadius = (this.config?.greatLakeDiameterMeters || 402335.0) / 2;
        const lakeCenterOff = new alea(this.currentSeed + '_lake')();
        const lakeAngle = lakeCenterOff * Math.PI * 2;
        const lakeDistFromCenter = (halfForestSide - lakeRadius) * 0.6;
        const lakeCenterX = Math.cos(lakeAngle) * lakeDistFromCenter;
        const lakeCenterZ = Math.sin(lakeAngle) * lakeDistFromCenter;

        return {
            primaryWatershed: {
                id: 'MOUNTAIN_RING_WATERSHED',
                innerRadiusMeters: halfForestSide,
                outerRadiusMeters: halfForestSide + mountainWidth,
                baseRimElevationMeters: 120.0,
                peakElevationMeters: 2620.0
            },
            primarySink: {
                id: 'GREAT_LAKE_SINK',
                centerX: lakeCenterX,
                centerZ: lakeCenterZ,
                radiusMeters: lakeRadius,
                maxDepthMeters: 80.0,
                sinkElevationMeters: -45.0
            },
            tectonicPlates: this.tectonicPlateVectors,
            duneInfinityFeeds: [
                { id: 'INFINITY_SIPHON_ALPHA', riverName: 'Aethel-Silt Streamline', angleRad: 0.42, sourceRadiusKm: 480, targetHorizonRadiusKm: 285, fluxCubicMetersPerSec: 840, extraDimensionalSignature: 'ORPHIC_RIFT_01' },
                { id: 'INFINITY_SIPHON_BETA', riverName: 'Vellum-Marrow Streamline', angleRad: 1.98, sourceRadiusKm: 520, targetHorizonRadiusKm: 285, fluxCubicMetersPerSec: 920, extraDimensionalSignature: 'ORPHIC_RIFT_02' },
                { id: 'INFINITY_SIPHON_GAMMA', riverName: 'Glass-Choir Streamline', angleRad: 3.55, sourceRadiusKm: 495, targetHorizonRadiusKm: 285, fluxCubicMetersPerSec: 790, extraDimensionalSignature: 'ORPHIC_RIFT_03' },
                { id: 'INFINITY_SIPHON_DELTA', riverName: 'Salt-Cradle Streamline', angleRad: 5.12, sourceRadiusKm: 540, targetHorizonRadiusKm: 285, fluxCubicMetersPerSec: 880, extraDimensionalSignature: 'ORPHIC_RIFT_04' }
            ]
        };
    }

    /**
     * Computes directional mountain elevation along tectonic plate lineament chains
     * rather than purely isotropic random placement.
     */
    computeTectonicLineamentFactor(x, z) {
        const angle = Math.atan2(z, x);
        let maxChainResonance = 0;
        for (const plate of this.tectonicPlateVectors) {
            const nx = x * Math.cos(plate.strikeAngleRad) + z * Math.sin(plate.strikeAngleRad);
            const nz = -x * Math.sin(plate.strikeAngleRad) + z * Math.cos(plate.strikeAngleRad);
            // Directional ridge chain parallel to plate strike vector
            const chainWave = Math.cos(nx * plate.ridgeFrequency + this.noise2D(nx * 0.002, nz * 0.002) * 1.8);
            const ridgeSharpness = Math.pow(Math.max(0, (chainWave + 1) * 0.5), 1.6) * plate.convergenceMag;
            const sectorWeight = 0.55 + 0.45 * Math.cos(angle - plate.strikeAngleRad);
            maxChainResonance = Math.max(maxChainResonance, ridgeSharpness * sectorWeight);
        }
        return Math.max(0.25, Math.min(1.45, maxChainResonance));
    }

        advanceEpoch() {
        // --- PHASE 3: STATIC NODE PERSISTENCE ---
        // Capture positions of all static nodes before the shift
        const staticNodes = this._captureStaticNodes();

        this.currentEpoch++;
        this.currentSeed = this._generateEpochSeed();
        this.prng = alea(this.currentSeed);
        this.noise2D = createNoise2D(this.prng);
        
        // Restore static nodes to their absolute coordinates
        this._restoreStaticNodes(staticNodes);

        // --- STEP 8-2: ROTATE MOUNTAINS ---
        this.rotateMountains();
        
        return this.currentEpoch;
    }



    _captureStaticNodes() {
        if (!window.GameCore?.activeEntities) return [];
        return window.GameCore.activeEntities
            .filter(e => e.is_static_node || e.is_anchored)
            .map(e => ({
                id: e.id,
                pos: { x: e.visual.position.x, z: e.visual.position.z },
                worldState: e.worldState ? { ...e.worldState } : null
            }));
    }

    _restoreStaticNodes(nodes) {
        if (!nodes || nodes.length === 0) return;
        
        nodes.forEach(nodeData => {
            const ent = window.GameCore.activeEntities.find(e => e.id === nodeData.id);
            if (ent) {
                // Force absolute coordinate lock
                ent.visual.position.set(nodeData.pos.x, ent.visual.position.y, nodeData.pos.z);
                if (ent.worldState) ent.worldState = nodeData.worldState;
                
                window.EventBus.emit('UI_LOG_DEBUG', `[EPOCH] Static Node ${ent.id} resisted the scattering loop.`);
            }
        });
    }


        update(dt) {
        // --- THE 7-DAY PERCEPTION SKIP (§5) ---
        // During the 14-day shift, the world rotates, but NPC consciousness "skips".
        // This is simulated by rotating the Mountain Ring strictly when the cycle resets.
    }

        rotateMountains() {
        // Bible §5: Mountain Ring rotates strictly during the 7-day White Void window.
        // We simulate this by applying a large, random rotational offset every Epoch.
        const rotationStep = (this.prng() * 0.5 + 0.5) * Math.PI; 
        this.mountainRotation += rotationStep;
        
        window.EventBus.emit('MOUNTAIN_ROTATED', this.mountainRotation);
        if (window.EngineConfig?.showSystemReasoning) {
            window.EventBus.emit('UI_LOG', '[DEV] Discrepancy detected in star chart baseline (§8).');
        }
    }

    updateDuneState(occupied) {
        // Bible §11: Dunes remain stable while occupied. When abandoned, they regenerate.
        if (!occupied && this.isDuneOccupied) {
            this.duneSeed = `${this.baseSeed}_dune_${Date.now()}`;
            if (window.EngineConfig?.showSystemReasoning) {
                window.EventBus.emit('UI_LOG', '[DEV] Abandoned routes lost to the shifting sands (§11).');
            }
        }
        this.isDuneOccupied = occupied;
    }


    // Mathematical representation of the world given current epoch
    getNoise(x, z) {
        const dist = Math.sqrt(x*x + z*z);
        const halfForestSide = this.config.darkForestSideMeters / 2;
        const mountainWidth = this.config.mountainRingWidthMeters;
        
        // Apply Mountain Rotation (Bible §5)
        if (dist > halfForestSide && dist <= halfForestSide + mountainWidth) {
            const angle = Math.atan2(z, x) + this.mountainRotation;
            const rx = Math.cos(angle) * dist;
            const rz = Math.sin(angle) * dist;
            return this.noise2D(rx * this.config.noiseScale, rz * this.config.noiseScale);
        }

        // Apply Dune Regeneration (Bible §11)
        if (dist > halfForestSide + mountainWidth) {
            const dunePrng = alea(this.duneSeed);
            const duneNoise = createNoise2D(dunePrng);
            return duneNoise(x * this.config.noiseScale, z * this.config.noiseScale);
        }

        return this.noise2D(x * this.config.noiseScale, z * this.config.noiseScale);
    }


    getBiome(x, z) {
        const halfForestSide = this.config.darkForestSideMeters / 2;
        const mountainWidth = this.config.mountainRingWidthMeters;
        const furthestAxisDistance = Math.max(Math.abs(x), Math.abs(z));
        
        // DISC 3: THE ENDLESS DUNES
        if (furthestAxisDistance > halfForestSide + mountainWidth) return 'desert';
        
        // DISC 2: THE MOUNTAIN RING
        if (furthestAxisDistance > halfForestSide) {
            const val = this.getNoise(x, z);
            // Mix high-altitude alpine peaks into the sierra wall
            return val > 0.3 ? 'alpine' : 'sierra';
        }
        
        // DISC 1: THE DARK FOREST
        // Allowed: redwoods, valley, coastal. Forbidden: alpine.
        const val = this.getNoise(x, z);
        if (val < -0.3) return 'coastal';
        if (val >= -0.3 && val < 0.1) return 'valley';
        
        // Remap all high-noise (previously alpine) to redwoods
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
        const halfForestSide = this.config.darkForestSideMeters / 2;
        const mountainWidth = this.config.mountainRingWidthMeters;
        const dist = Math.max(Math.abs(x), Math.abs(z));

        // --- GREAT LAKE CALCULATION (Bible §1, §5) ---
        // 250 Mile Diameter Lake
        const lakeRadius = (this.config.greatLakeDiameterMeters || 402335.0) / 2;
        // The lake is always located relative to the epoch seed (it shifts with the world)
        // We'll use a fixed offset from the world center that varies per epoch
        const lakeCenterOff = new alea(this.currentSeed + '_lake')();
        const lakeAngle = lakeCenterOff * Math.PI * 2;
        const lakeDistFromCenter = (halfForestSide - lakeRadius) * 0.6; // Keep it in the forest
        const lakeCenterX = Math.cos(lakeAngle) * lakeDistFromCenter;
        const lakeCenterZ = Math.sin(lakeAngle) * lakeDistFromCenter;

        const distToLake = Math.hypot(x - lakeCenterX, z - lakeCenterZ);
        
        // Lake Mask
        let isLake = false;
        let lakeDepth = 0;
        if (distToLake < lakeRadius) {
            isLake = true;
            // Smooth bowl shape for lake depth
            const lakeT = distToLake / lakeRadius;
            lakeDepth = (1.0 - Math.pow(lakeT, 2)) * 80.0; // 80m deep center
        }

        // BIOME SPECIFIC HEIGHT MODIFIERS
        const biomeKey = this.getBiome(x, z);


        // 1. THE REDWOOD BASIN (DISC 1)
        // Slowly sloping upwards towards the mountain ring, with smooth rolling hills.
        let height = 0;
        if (dist <= halfForestSide) {
            const basinT = dist / halfForestSide;
            
                        // Basin Base Elevation: Gradual quadratic slope towards the outer rim
            height = Math.pow(basinT, 2.0) * 120.0; 

            // Smooth Rolling Terrain (Flatter than before)
            // Reduce varAmp dramatically so it's mostly flat
            const varAmp = 0.1 + (basinT * 1.5);
            
            // Large-scale geological swells for smooth rolling hills.
            const swell = this.noise2D(x * 0.0002, z * 0.0002); 
            const ripple = this.noise2D(x * 0.001, z * 0.001) * 0.05; // Extremely subtle ripple
            
                        height += (swell + ripple) * varAmp;

            // Apply Lake Depth
            if (isLake) {
                height -= lakeDepth;
            }
        }


        // 2. THE MOUNTAIN RING (100 MILES THICK)
        if (dist > halfForestSide && dist <= halfForestSide + mountainWidth) {
            // Basin Edge Transition (Starts from the 120m basin rim)
            height = 120.0; 

            // Distance from the inner forest edge to the mountain peak
            const mountainT = (dist - halfForestSide) / mountainWidth; 
            
            // Generate directional mountain chains along Tectonic Plate Lineaments (Phase 1 Blueprint)
            // Peaks at the middle of the 100-mile range, aligned to plate vectors
            const profile = Math.sin(mountainT * Math.PI); 
            const lineamentFactor = this.computeTectonicLineamentFactor(x, z);
            const jaggedness = (this.noise2D(x * 0.01, z * 0.01) * 0.25 + 0.75) * lineamentFactor;
            
            // Mountains reach up to 2,500+ meters along active tectonic lineaments
            height += profile * 2500 * jaggedness;

            // THE MOUNTAIN PASS (Terminus Gate)
            // We carve a hole in the mountains near the Terminus Noble House
            if (window.VillageManager) {
                const terminus = window.VillageManager.villages[window.VillageManager.villages.length - 1];
                if (terminus) {
                    const dx = x - terminus.x;
                    const dz = z - terminus.z;
                    const distToPassSq = dx*dx + dz*dz;
                    const passRadius = 800; // 800 meter wide canyon pass
                    
                    if (distToPassSq < passRadius * passRadius) {
                        const passDist = Math.sqrt(distToPassSq);
                        const passMask = Math.pow(passDist / passRadius, 2);
                        // Blend the height down to road level
                        height *= passMask;
                    }
                }
            }
        }

        // 3. THE INFINITE DUNES (PAST THE MOUNTAINS)
        if (dist > halfForestSide + mountainWidth) {
            // High frequency, low amplitude rolling sand dunes
            const duneNoise = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15;
            height = duneNoise + (this.noise2D(x * 0.001, z * 0.001) * 10);
        }

        if (biomeKey === 'alpine' && dist <= halfForestSide) {
            // Fallback for internal alpine biomes if they appear - make them gentle hills
            height += Math.max(0, this.noise2D(x * 0.01, z * 0.01) * 10.0);
        }

        return height;
    }
}
