// ============================================================================
// Dark Forest Engine - Calibrated Hero Redwood Geometry Worker Thread
// File: src/workers/tree_worker.js
// ============================================================================

class FastRandom {
    constructor(seed = 1337) {
        this.s = Math.abs(seed) || 1337;
    }
    next() {
        this.s = (this.s * 9301 + 49297) % 233280;
        return this.s / 233280;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
}

class SimplexNoise3D {
    constructor(prng) {
        this.p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.p[i] = Math.floor(prng.next() * 256);
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    noise(xin, yin, zin) {
        const G3 = 1.0 / 6.0;
        const F3 = 1.0 / 3.0;
        let s = (xin + yin + zin) * F3;
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);
        let k = Math.floor(zin + s);
        let t = (i + j + k) * G3;
        let X0 = i - t;
        let Y0 = j - t;
        let Z0 = k - t;
        let x0 = xin - X0;
        let y0 = yin - Y0;
        let z0 = zin - Z0;

        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
            else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
            else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
        } else {
            if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
            else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
            else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        }

        let x1 = x0 - i1 + G3;
        let y1 = y0 - j1 + G3;
        let z1 = z0 - k1 + G3;
        let x2 = x0 - i2 + 2.0 * G3;
        let y2 = y0 - j2 + 2.0 * G3;
        let z2 = z0 - k2 + 2.0 * G3;
        let x3 = x0 - 1.0 + 3.0 * G3;
        let y3 = y0 - 1.0 + 3.0 * G3;
        let z3 = z0 - 1.0 + 3.0 * G3;

        let ii = i & 255;
        let jj = j & 255;
        let kk = k & 255;

        let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
        let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 > 0) {
            t0 *= t0;
            n0 = t0 * t0 * this.grad(this.permMod12[ii + this.perm[jj + this.perm[kk]]], x0, y0, z0);
        }
        let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 > 0) {
            t1 *= t1;
            n1 = t1 * t1 * this.grad(this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]], x1, y1, z1);
        }
        let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 > 0) {
            t2 *= t2;
            n2 = t2 * t2 * this.grad(this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]], x2, y2, z2);
        }
        let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 > 0) {
            t3 *= t3;
            n3 = t3 * t3 * this.grad(this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]], x3, y3, z3);
        }
        return 32.0 * (n0 + n1 + n2 + n3);
    }

    grad(hash, x, y, z) {
        let h = hash & 15;
        let u = h < 8 ? x : y;
        let v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
}

self.onmessage = function (e) {
    try {
        const { archetypesToGenerate } = e.data || {};
        if (!archetypesToGenerate || !Array.isArray(archetypesToGenerate)) return;

        const generatedBuffers = {};
        const transferables = [];

                archetypesToGenerate.forEach(task => {
            const { key, ageState, seed, type } = task;
            const meshData = type === 'Fern_Cluster' 
                ? buildFernMesh(seed || 1337) 
                : buildRedwoodMesh(ageState || 'ANCIENT', seed || 1337);
            generatedBuffers[key] = meshData;

            if (meshData.positions?.buffer) transferables.push(meshData.positions.buffer);
            if (meshData.normals?.buffer) transferables.push(meshData.normals.buffer);
            if (meshData.uvs?.buffer) transferables.push(meshData.uvs.buffer);
            if (meshData.colors?.buffer) transferables.push(meshData.colors.buffer);
            if (meshData.indices?.buffer) transferables.push(meshData.indices.buffer);
        
        if (meshData.trunkIndexCount !== undefined) {
            generatedBuffers[key].trunkIndexCount = meshData.trunkIndexCount;
            generatedBuffers[key].foliageIndexCount = meshData.foliageIndexCount;
        }
        });

        return { result: { action: String.fromCharCode(99,111,109,112,108,101,116,101), buffers: generatedBuffers }, transfer: transferables };
    } catch (err) {
        throw err;
    }
};

function buildFernMesh(seed) {
    const prng = new FastRandom(seed);
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    const frondCount = Math.floor(prng.range(5, 9));
    let vertexOffset = 0;

    for (let i = 0; i < frondCount; i++) {
        const angle = (i / frondCount) * Math.PI * 2.0 + prng.range(-0.3, 0.3);
        const length = prng.range(1.2, 1.8);
        const height = prng.range(0.6, 1.0);
        const wBase = 0.05;
        const wMid = prng.range(0.2, 0.4);
        const wTip = 0.02;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const pCos = Math.cos(angle + Math.PI / 2);
        const pSin = Math.sin(angle + Math.PI / 2);

        // V0, V1 (Base)
        positions.push(
            pCos * wBase, 0, pSin * wBase,
            -pCos * wBase, 0, -pSin * wBase
        );
        normals.push(0, 1, 0, 0, 1, 0);
        uvs.push(0, 0, 1, 0);
        colors.push(0, 1.0, 0, 0, 1.0, 0);

        // V2, V3 (Mid)
        const mDist = length * 0.5;
        positions.push(
            cosA * mDist + pCos * wMid, height, sinA * mDist + pSin * wMid,
            cosA * mDist - pCos * wMid, height, sinA * mDist - pSin * wMid
        );
        const nx = cosA * 0.5; const ny = 0.8; const nz = sinA * 0.5;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
        normals.push(nx/len, ny/len, nz/len, nx/len, ny/len, nz/len);
        uvs.push(0, 0.5, 1, 0.5);
        colors.push(0.5, 1.0, 0, 0.5, 1.0, 0);

        // V4, V5 (Tip)
        const tDist = length;
        const tHeight = height * 0.2;
        positions.push(
            cosA * tDist + pCos * wTip, tHeight, sinA * tDist + pSin * wTip,
            cosA * tDist - pCos * wTip, tHeight, sinA * tDist - pSin * wTip
        );
        normals.push(0, 1, 0, 0, 1, 0);
        uvs.push(0, 1, 1, 1);
        colors.push(1.0, 1.0, 0, 1.0, 1.0, 0);

        // Front faces
        indices.push(
            vertexOffset, vertexOffset + 2, vertexOffset + 1,
            vertexOffset + 1, vertexOffset + 2, vertexOffset + 3,
            vertexOffset + 2, vertexOffset + 4, vertexOffset + 3,
            vertexOffset + 3, vertexOffset + 4, vertexOffset + 5
        );
        
        // Back faces
        indices.push(
            vertexOffset, vertexOffset + 1, vertexOffset + 2,
            vertexOffset + 1, vertexOffset + 3, vertexOffset + 2,
            vertexOffset + 2, vertexOffset + 3, vertexOffset + 4,
            vertexOffset + 3, vertexOffset + 5, vertexOffset + 4
        );

        vertexOffset += 6;
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        colors: new Float32Array(colors),
        indices: new Uint32Array(indices)
    };
}

function buildRedwoodMesh(ageState, seed) {
    const prng = new FastRandom(seed);
    const noiseGen = new SimplexNoise3D(prng);

    let height, baseRadius, topRadius, flareAggression, bareTrunkRatio, branchCount, reitProbability;

    switch (ageState) {
        case 'COLOSSAL_ANCIENT':
            height = prng.range(118.0, 132.0);
            baseRadius = prng.range(6.8, 8.8);
            topRadius = 0.80;
            flareAggression = 7.5;
            bareTrunkRatio = 0.48;
            branchCount = 120;
            reitProbability = 0.85;
            break;

        case 'ANCIENT':
            height = prng.range(95.0, 115.0);
            baseRadius = prng.range(5.8, 7.5);
            topRadius = 0.60;
            flareAggression = 6.2;
            bareTrunkRatio = 0.52;
            branchCount = 95;
            reitProbability = 0.65;
            break;

        case 'MATURE':
            height = prng.range(70.0, 90.0);
            baseRadius = prng.range(3.2, 4.5);
            topRadius = 0.35;
            flareAggression = 3.8;
            bareTrunkRatio = 0.42;
            branchCount = 50;
            reitProbability = 0.25;
            break;

        case 'DYING':
            height = prng.range(85.0, 100.0);
            baseRadius = prng.range(4.5, 6.0);
            topRadius = 0.20;
            flareAggression = 5.0;
            bareTrunkRatio = 0.68;
            branchCount = 24;
            reitProbability = 0.30;
            break;

        case 'YOUNG':
        default:
            height = prng.range(38.0, 55.0);
            baseRadius = prng.range(1.5, 2.2);
            topRadius = 0.20;
            flareAggression = 2.0;
            bareTrunkRatio = 0.22;
            branchCount = 32;
            reitProbability = 0.05;
            break;
    }

        const hasBrokenCrown = (ageState === 'ANCIENT' || ageState === 'COLOSSAL_ANCIENT' || ageState === 'DYING') && (prng.next() < 0.45); // Increased probability for massive visual impact
    const effectiveHeight = hasBrokenCrown ? height * prng.range(0.72, 0.85) : height;

        const leanAngleX = (prng.range(-0.05, 0.05)) * (ageState.includes('ANCIENT') ? 1.5 : 0.8);
    const leanAngleZ = (prng.range(-0.05, 0.05)) * (ageState.includes('ANCIENT') ? 1.5 : 0.8);
    const trunkTwistRate = prng.range(-0.15, 0.15);

    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const trunkIndices = [];
    const foliageIndices = [];

    const radialSegs = 64;
    const heightSegs = 64;

    for (let y = 0; y <= heightSegs; y++) {
        const v = y / heightSegs;
        const currentY = v * effectiveHeight;

        const driftX = Math.sin(v * Math.PI * 0.5) * (effectiveHeight * leanAngleX);
        const driftZ = Math.sin(v * Math.PI * 0.5) * (effectiveHeight * leanAngleZ);

        const taperPower = 3.0;
        let radius = baseRadius * (1.0 - Math.pow(v, taperPower)) + topRadius;

        if (hasBrokenCrown && v > 0.88) {
            radius *= (1.0 + (v - 0.88) * 2.5);
        }

                const flareIntensity = v < 0.28 ? Math.pow(1.0 - (v / 0.28), 1.8) : 0.0;

        for (let r = 0; r <= radialSegs; r++) {
            const u = r / radialSegs;
            const theta = u * Math.PI * 2.0 + (v * trunkTwistRate);

            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

                        // --- 1. Bark Fluting (Redwood-style vertical ribs) ---
            // Large facets to match storybook gothic style
            const fluteCount = 12.0; 
            const fluteWave = Math.sin(u * Math.PI * 2.0 * fluteCount + v * 5.0);
            const fluting = (Math.pow(abs(fluteWave), 0.7) - 0.5) * (radius * 0.15);

                        // --- 2. Enhanced Root Flare ---
            let burlDisplacement = 0.0;
            let n1 = 0.0;
            if (flareIntensity > 0.0) {
                // Primary buttress lobes
                const buttressCount = 6.0;
                const buttressWave = Math.sin(u * Math.PI * 2.0 * buttressCount + v * 2.0);
                const buttress = Math.max(0.0, buttressWave) * flareAggression * 1.5;
                
                n1 = Math.max(0.0, noiseGen.noise(cosT * 2.0, sinT * 2.0, v * 4.0));
                burlDisplacement = (buttress + n1 * flareAggression) * flareIntensity;
            }

                        const phaseShift = v * 8.0 + n1 * 2.0;
            const waveA = Math.sin(u * Math.PI * 24.0 + phaseShift);
                        const waveB = Math.sin(u * Math.PI * 14.0 - phaseShift * 0.4);
                        const interference = (waveA + waveB) * 0.5;
            
                        // Soften terracing: Restore continuous curvature to prevent faceted polygons
                        const plateShape = 1.0 - Math.pow(Math.abs(interference), 0.7);
            
                                                // Recover Ancient Character: 0.25 depth allows bark to carve deep, twisting tendons around the burls
                        const ridgeNoise = (plateShape - 0.5) * (radius * 0.25) * (1.0 - v * 0.8);

                        const currentRadius = radius + burlDisplacement + ridgeNoise + fluting;

            const px = cosT * currentRadius + driftX;
            const py = currentY;
            const pz = sinT * currentRadius + driftZ;

            positions.push(px, py, pz);

            const nx = cosT;
            const ny = 0.04 * (1.0 - v);
            const nz = sinT;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
            normals.push(nx / len, ny / len, nz / len);

            uvs.push(u * 8.0, v * (effectiveHeight / 2.5));

                        const northBias = pz < -0.1 ? Math.abs(pz / currentRadius) : 0.0;
            const baseMoss = flareIntensity * 0.25;
            const mossWeight = Math.min(1.0, northBias * 0.7 * (1.0 - v * 0.7) + baseMoss);

            colors.push(0.0, 0.0, mossWeight);
        }
    }

        for (let y = 0; y < heightSegs; y++) {
        for (let r = 0; r < radialSegs; r++) {
            const i1 = (y * (radialSegs + 1)) + r;
            const i2 = i1 + radialSegs + 1;

            trunkIndices.push(i1, i2, i1 + 1);
            trunkIndices.push(i2, i2 + 1, i1 + 1);
        }
    }

    let vertexOffset = positions.length / 3;

    const addBranchTube = (startX, startY, startZ, endX, endY, endZ, startRad, endRad, bV, useCylinder = false) => {
        const segs = 6;
        if (useCylinder) {
            const sides = 6;
            for (let s = 0; s <= segs; s++) {
                const t = s / segs;
                const cx = startX + (endX - startX) * t;
                const cy = startY + (endY - startY) * t;
                const cz = startZ + (endZ - startZ) * t;
                const cr = startRad * (1.0 - t) + endRad * t;

                for (let side = 0; side <= sides; side++) {
                    const angle = (side / sides) * Math.PI * 2.0;
                    const px = cx + Math.cos(angle) * cr;
                    const py = cy + Math.sin(angle) * cr;
                    const pz = cz;

                    positions.push(px, py, pz);
                    normals.push(Math.cos(angle), Math.sin(angle), 0);
                    uvs.push(side / sides, t);

                    const sway = Math.pow(t, 1.5) * (bV * 0.9);
                    colors.push(sway, 0.0, 0.0);
                }
            }

                        for (let s = 0; s < segs; s++) {
                for (let side = 0; side < sides; side++) {
                    const i1 = vertexOffset + (s * (sides + 1)) + side;
                    const i2 = i1 + sides + 1;
                    trunkIndices.push(i1, i2, i1 + 1);
                    trunkIndices.push(i2, i2 + 1, i1 + 1);
                }
            }
            vertexOffset += (segs + 1) * (sides + 1);
        } else {
            for (let s = 0; s <= segs; s++) {
                const t = s / segs;
                const cx = startX + (endX - startX) * t;
                const cy = startY + (endY - startY) * t;
                const cz = startZ + (endZ - startZ) * t;
                const cr = startRad * (1.0 - t) + endRad * t;

                positions.push(cx - cr, cy, cz);
                positions.push(cx + cr, cy, cz);
                positions.push(cx + cr, cy + cr * 2.0, cz);
                positions.push(cx - cr, cy + cr * 2.0, cz);

                normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

                const sway = Math.pow(t, 1.5) * (bV * 0.9);
                colors.push(sway, 0.0, 0.0);
                colors.push(sway, 0.0, 0.0);
                                colors.push(sway, 0.0, 0.0);
                colors.push(sway, 0.0, 0.0);

                trunkIndices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
                trunkIndices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
                vertexOffset += 4;
            }
        }
    };

        const addFoliageClusterGroup = (originX, originY, originZ, radius, bV, clusterDensityMult, isCandelabra = false) => {
        // Upper Canopy Mass Expansion: Drastically multiply sub-clusters for upper crown / candelabras
        let finalDensity = clusterDensityMult;
        if (isCandelabra) finalDensity *= 2.5;
        
        const subClusterCount = Math.floor(prng.range(3, 7) * finalDensity);

        for (let sc = 0; sc < subClusterCount; sc++) {
            const scOffsetR = (sc / subClusterCount) * radius * 0.7;
            const scAngle = prng.range(0, Math.PI * 2);

            const cX = originX + Math.cos(scAngle) * scOffsetR;
            const cY = originY + prng.range(-1.2, 1.8);
            const cZ = originZ + Math.sin(scAngle) * scOffsetR;

            // Upper Canopy Mass Expansion: Sub-clusters are significantly larger on candelabras
            const subSizeMult = isCandelabra ? prng.range(1.2, 1.8) : prng.range(0.50, 0.80);
            const subSize = radius * subSizeMult;
            
            // Upper Canopy Mass Expansion: More cards per cluster on massive trees
            let numCards = (ageState === 'COLOSSAL_ANCIENT') ? 8 : (ageState === 'ANCIENT') ? 6 : 4;
            if (isCandelabra) numCards += 2;

            for (let c = 0; c < numCards; c++) {
                const cAngle = (c / numCards) * Math.PI + prng.range(-0.25, 0.25);
                const cCos = Math.cos(cAngle) * subSize;
                const cSin = Math.sin(cAngle) * subSize;

                positions.push(cX - cCos, cY - subSize * 0.3, cZ - cSin);
                positions.push(cX + cCos, cY - subSize * 0.3, cZ + cSin);
                positions.push(cX + cCos, cY + subSize * 0.9, cZ + cSin);
                positions.push(cX - cCos, cY + subSize * 0.9, cZ - cSin);

                normals.push(cCos, 0.6, cSin);
                normals.push(-cCos, 0.6, -cSin);
                normals.push(-cCos, 0.8, -cSin);
                normals.push(cCos, 0.8, cSin);

                uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

                const branchSway = bV * 0.85;
                colors.push(branchSway, 1.0, 0.0);
                colors.push(branchSway, 1.0, 0.0);
                                colors.push(branchSway, 1.0, 0.0);
                colors.push(branchSway, 1.0, 0.0);

                foliageIndices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
                foliageIndices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
                vertexOffset += 4;
            }
        }
    };

        const effectiveBranchCount = hasBrokenCrown ? Math.floor(branchCount * 0.70) : branchCount;

    // --- REWRITE: CHEESE FOLK STYLIZED CANOPY TIERS ---
    // Instead of generating 120+ procedural branches, we generate 3-5 massive low-poly frustums (tiers)
    
    // We determine the number of tiers based on age and height
    let numTiers = 3;
    if (ageState === 'COLOSSAL_ANCIENT' || ageState === 'ANCIENT') numTiers = 5;
    if (ageState === 'MATURE') numTiers = 4;
    
    // Calculate the total height available for the canopy
    const canopyStartHeight = bareTrunkRatio * effectiveHeight;
    const canopyAvailableHeight = effectiveHeight - canopyStartHeight;
    
    // Calculate base parameters for tiers
    const tierHeightBase = canopyAvailableHeight / numTiers;
    // We want the bottom tier to be the widest, tapering up
    let currentTierRadius = baseRadius * 3.5; // Massive overhang
    
    if (ageState === 'DYING') {
        currentTierRadius *= 0.6; // Dying trees are thinner
    }

    // Build massive volumetric tiers
    for (let t = 0; t < numTiers; t++) {
        const tierProgress = t / numTiers; // 0.0 (bottom) to 1.0 (top)
        
        // Add some variation based on deterministic seed
        const tierHeightOffset = prng.range(-tierHeightBase * 0.15, tierHeightBase * 0.25);
        let tierYStart = canopyStartHeight + (t * tierHeightBase) - (tierHeightBase * 0.3) + tierHeightOffset;
        
        // Top tier extends to the top of the tree
        let tierYEnd = tierYStart + tierHeightBase * 1.5;
        if (t === numTiers - 1 && !hasBrokenCrown) {
            tierYEnd = effectiveHeight;
        }

        // Taper the radius as we go up
        const tierRadiusScale = 1.0 - Math.pow(tierProgress, 1.2); 
        let tierRadius = currentTierRadius * tierRadiusScale;
        
        // Ensure minimum radius
        tierRadius = Math.max(tierRadius, baseRadius * 1.5);
        
        // Add random variation to the tier radius to break perfection
        tierRadius *= prng.range(0.9, 1.1);

        // Low-Poly Geometry: 8-sided massive chunky frustums
        const sides = 8;
        
        // Random rotation offset per tier
        const angleOffset = prng.range(0, Math.PI * 2);
        
        // We slope the bottom of the tier inwards towards the trunk
        const bottomRadius = tierRadius * 0.85; 
        // The top of the tier tapers sharply
        const topRadius = tierRadius * 0.25;

        // Calculate wind sway modifier based on height (bV equivalent)
        const bV = tierYStart / effectiveHeight;
        const sway = bV * 0.85; // Wind sway increases with height
        
        // Build the faceted frustum for this tier
        for (let side = 0; side < sides; side++) {
            const angle1 = angleOffset + (side / sides) * Math.PI * 2.0;
            const angle2 = angleOffset + ((side + 1) / sides) * Math.PI * 2.0;

            // X, Z for the two bottom points
            const bx1 = Math.cos(angle1) * bottomRadius;
            const bz1 = Math.sin(angle1) * bottomRadius;
            const bx2 = Math.cos(angle2) * bottomRadius;
            const bz2 = Math.sin(angle2) * bottomRadius;

            // X, Z for the two top points
            const tx1 = Math.cos(angle1) * topRadius;
            const tz1 = Math.sin(angle1) * topRadius;
            const tx2 = Math.cos(angle2) * topRadius;
            const tz2 = Math.sin(angle2) * topRadius;

            // Introduce some vertex jitter (±5%) for organic asymmetry (Requirement 5)
            const jitterBottom = prng.range(0.95, 1.05);
            const jitterTop = prng.range(0.95, 1.05);
            
            const jbx1 = bx1 * jitterBottom; const jbz1 = bz1 * jitterBottom;
            const jbx2 = bx2 * jitterBottom; const jbz2 = bz2 * jitterBottom;
            const jtx1 = tx1 * jitterTop;    const jtz1 = tz1 * jitterTop;
            const jtx2 = tx2 * jitterTop;    const jtz2 = tz2 * jitterTop;

            // To enforce FLAT SHADING (Requirement 6), we must not share vertices between faces.
            // Every quad face needs 4 distinct vertices (2 triangles = 6 indices pointing to 4 vertices).
            
            // Push Vertices
            // V0: Bottom Left
            positions.push(jbx1, tierYStart, jbz1);
            // V1: Bottom Right
            positions.push(jbx2, tierYStart, jbz2);
            // V2: Top Right
            positions.push(jtx2, tierYEnd, jtz2);
            // V3: Top Left
            positions.push(jtx1, tierYEnd, jtz1);

            // Calculate Flat Normal for the face
            // Using cross product of (V1-V0) and (V3-V0)
            const vec1 = [jbx2 - jbx1, 0, jbz2 - jbz1];
            const vec2 = [jtx1 - jbx1, tierYEnd - tierYStart, jtz1 - jbz1];
            const nx = vec1[1]*vec2[2] - vec1[2]*vec2[1];
            const ny = vec1[2]*vec2[0] - vec1[0]*vec2[2];
            const nz = vec1[0]*vec2[1] - vec1[1]*vec2[0];
            const nLen = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
            
            const fnx = nx / nLen;
            const fny = ny / nLen;
            const fnz = nz / nLen;

            // Push same normal for all 4 vertices
            normals.push(fnx, fny, fnz);
            normals.push(fnx, fny, fnz);
            normals.push(fnx, fny, fnz);
            normals.push(fnx, fny, fnz);

            // UVs
            uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

            // Colors (Red channel is used for wind sway)
            colors.push(sway, 1.0, 0.0);
            colors.push(sway, 1.0, 0.0);
            colors.push(sway, 1.0, 0.0);
            colors.push(sway, 1.0, 0.0);

            // Push Indices (2 triangles per face)
            foliageIndices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2); // V0, V1, V2
            foliageIndices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3); // V0, V2, V3
            
            vertexOffset += 4;
        }
    }

    const indices = trunkIndices.concat(foliageIndices);

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        colors: new Float32Array(colors),
        indices: new Uint32Array(indices),
        trunkIndexCount: trunkIndices.length,
        foliageIndexCount: foliageIndices.length
    };
}
