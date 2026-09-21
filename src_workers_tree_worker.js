// ============================================================================
// Dark Forest Engine - AAA Hero Redwood Geometry Worker
// File: src_workers_tree_worker.js
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
            const { key, ageState, seed } = task;
            const meshData = buildRedwoodMesh(ageState || 'ANCIENT', seed || 1337);
            generatedBuffers[key] = meshData;

            if (meshData.positions?.buffer) transferables.push(meshData.positions.buffer);
            if (meshData.normals?.buffer) transferables.push(meshData.normals.buffer);
            if (meshData.uvs?.buffer) transferables.push(meshData.uvs.buffer);
            if (meshData.colors?.buffer) transferables.push(meshData.colors.buffer);
            if (meshData.indices?.buffer) transferables.push(meshData.indices.buffer);
        });

        self.postMessage({ generatedBuffers }, transferables);
    } catch (err) {
        self.postMessage({ error: err.message || 'Hero Redwood Generator Exception' });
    }
};

function buildRedwoodMesh(ageState, seed) {
    const prng = new FastRandom(seed);
    const noiseGen = new SimplexNoise3D(prng);

    let height, baseRadius, topRadius, flareAggression, bareTrunkRatio, branchCount;

    switch (ageState) {
        case 'ANCIENT':
            height = prng.range(90.0, 105.0);    // Massive ~300ft Hero Redwood
            baseRadius = prng.range(4.5, 6.0);    // 30ft+ base diameter
            topRadius = 0.55;
            flareAggression = 5.5;
            bareTrunkRatio = 0.55;
            branchCount = 55;
            break;
        case 'MATURE':
            height = prng.range(65.0, 85.0);
            baseRadius = prng.range(2.8, 3.8);
            topRadius = 0.30;
            flareAggression = 3.2;
            bareTrunkRatio = 0.45;
            branchCount = 42;
            break;
        case 'DYING':
            height = prng.range(80.0, 95.0);
            baseRadius = prng.range(3.8, 5.0);
            topRadius = 0.20;
            flareAggression = 4.5;
            bareTrunkRatio = 0.70;
            branchCount = 20;
            break;
        case 'YOUNG':
        default:
            height = prng.range(35.0, 50.0);
            baseRadius = prng.range(1.2, 1.8);
            topRadius = 0.18;
            flareAggression = 1.8;
            bareTrunkRatio = 0.25;
            branchCount = 30;
            break;
    }

    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    const radialSegs = 28; // Increased radial resolution for smooth trunks
    const heightSegs = 60;

    // --- 1. HERO TRUNK MESH (WITH BASAL BURLS & ROOT BUTTRESSES) ---
    for (let y = 0; y <= heightSegs; y++) {
        const v = y / heightSegs;
        const currentY = v * height;

        const taperPower = 3.2;
        let radius = baseRadius * (1.0 - Math.pow(v, taperPower)) + topRadius;

        // Root Flare & Basal Burl Swells (Lower 22% of trunk)
        const flareIntensity = v < 0.22 ? Math.pow(1.0 - (v / 0.22), 2.5) : 0.0;

        for (let r = 0; r <= radialSegs; r++) {
            const u = r / radialSegs;
            const theta = u * Math.PI * 2.0;

            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            // Multi-frequency organic burl displacement
            let burlDisplacement = 0.0;
            if (flareIntensity > 0.0) {
                const n1 = Math.max(0.0, noiseGen.noise(cosT * 2.5, sinT * 2.5, v * 6.0));
                const n2 = Math.sin(theta * 6.0) * 0.4 + Math.cos(theta * 4.0) * 0.3;
                burlDisplacement = (n1 * 0.7 + n2 * 0.3) * flareIntensity * flareAggression;
            }

            // Mid-trunk bark ridge noise
            const ridgeNoise = noiseGen.noise(cosT * 8.0, v * 25.0, sinT * 8.0) * 0.25 * (1.0 - v);

            const currentRadius = radius + burlDisplacement + ridgeNoise;
            const px = cosT * currentRadius;
            const py = currentY;
            const pz = sinT * currentRadius;

            positions.push(px, py, pz);

            const nx = cosT;
            const ny = 0.05 * (1.0 - v);
            const nz = sinT;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
            normals.push(nx / len, ny / len, nz / len);

            uvs.push(u * 8.0, v * (height / 2.5));

            // Moss accumulation mask on North side (-Z) and lower basal burls
            const northBias = pz < -0.1 ? Math.abs(pz / currentRadius) : 0.0;
            const baseMoss = flareIntensity * 0.85;
            const mossWeight = Math.min(1.0, northBias * (1.0 - v * 0.7) + baseMoss);

            colors.push(0.0, 0.0, mossWeight);
        }
    }

    // Trunk Triangles
    for (let y = 0; y < heightSegs; y++) {
        for (let r = 0; r < radialSegs; r++) {
            const i1 = (y * (radialSegs + 1)) + r;
            const i2 = i1 + radialSegs + 1;

            indices.push(i1, i2, i1 + 1);
            indices.push(i2, i2 + 1, i1 + 1);
        }
    }

    let vertexOffset = positions.length / 3;

    // Helper to generate branch wood tubes
    const addBranchTube = (startX, startY, startZ, endX, endY, endZ, startRad, endRad, bV) => {
        const segs = 6;
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

            indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
            indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
            vertexOffset += 4;
        }
    };

    // Helper to generate dense foliage needle sprays
    const addFoliageSpray = (tipX, tipY, tipZ, clusterSize, bV) => {
        const numCards = 4; // Crossed 3D spray
        for (let c = 0; c < numCards; c++) {
            const cAngle = (c / numCards) * Math.PI;
            const cCos = Math.cos(cAngle) * clusterSize;
            const cSin = Math.sin(cAngle) * clusterSize;

            positions.push(tipX - cCos, tipY - clusterSize * 0.3, tipZ - cSin);
            positions.push(tipX + cCos, tipY - clusterSize * 0.3, tipZ + cSin);
            positions.push(tipX + cCos, tipY + clusterSize * 0.9, tipZ + cSin);
            positions.push(tipX - cCos, tipY + clusterSize * 0.9, tipZ - cSin);

            // Outward spherical normals for soft volumetric lighting
            normals.push(cCos, 0.6, cSin);
            normals.push(-cCos, 0.6, -cSin);
            normals.push(-cCos, 0.8, -cSin);
            normals.push(cCos, 0.8, cSin);

            uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

            const branchSway = bV * 0.85;
            colors.push(branchSway, 1.0, 0.0); // G = 1.0 enables leaf flutter & SSS translucency
            colors.push(branchSway, 1.0, 0.0);
            colors.push(branchSway, 1.0, 0.0);
            colors.push(branchSway, 1.0, 0.0);

            indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
            indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
            vertexOffset += 4;
        }
    };

    // --- 2. PRIMARY BRANCHES & EPICORMIC REITERATIONS ---
    for (let b = 0; b < branchCount; b++) {
        const bProgress = b / branchCount;
        const bV = bareTrunkRatio + bProgress * (1.0 - bareTrunkRatio);
        const bY = bV * height;

        const bAngle = b * 2.39996 + prng.range(-0.15, 0.15);
        const maxLen = (1.0 - (bV - bareTrunkRatio) / (1.0 - bareTrunkRatio)) * 16.0 + 4.0;
        const bLength = maxLen * prng.range(0.8, 1.15);

        const tRadius = baseRadius * (1.0 - Math.pow(bV, 3.2)) + topRadius;
        const rootX = Math.cos(bAngle) * tRadius;
        const rootZ = Math.sin(bAngle) * tRadius;

        const tipX = rootX + Math.cos(bAngle) * bLength;
        const droopAmount = prng.range(2.5, 5.0);
        const tipY = bY - droopAmount + (bProgress * 2.5);
        const tipZ = rootZ + Math.sin(bAngle) * bLength;

        // Build main branch tube
        addBranchTube(rootX, bY, rootZ, tipX, tipY, tipZ, Math.max(0.12, (1.0 - bV) * 0.5), 0.05, bV);

        // Ancient Epicormic Reiterations (Vertical secondary trunks growing off limbs)
        const isAncient = ageState === 'ANCIENT' || ageState === 'DYING';
        if (isAncient && bV > 0.60 && bV < 0.88 && prng.next() < 0.35) {
            const reitHeight = prng.range(12.0, 22.0);
            const reitRad = prng.range(0.3, 0.6);

            // Reit grows vertically upward out of mid-branch
            const reitStartX = rootX + (tipX - rootX) * 0.5;
            const reitStartY = bY - droopAmount * 0.5;
            const reitStartZ = rootZ + (tipZ - rootZ) * 0.5;

            const reitEndX = reitStartX + prng.range(-1.5, 1.5);
            const reitEndY = reitStartY + reitHeight;
            const reitEndZ = reitStartZ + prng.range(-1.5, 1.5);

            addBranchTube(reitStartX, reitStartY, reitStartZ, reitEndX, reitEndY, reitEndZ, reitRad, 0.08, bV);
            addFoliageSpray(reitEndX, reitEndY, reitEndZ, 6.0, bV);
        }

        // Standard foliage spray at branch tip
        if (ageState !== 'DYING' || prng.next() > 0.55) {
            addFoliageSpray(tipX, tipY, tipZ, prng.range(5.0, 8.0), bV);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        colors: new Float32Array(colors),
        indices: new Uint32Array(indices)
    };
}
