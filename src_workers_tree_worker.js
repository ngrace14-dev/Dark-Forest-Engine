// ============================================================================
// Dark Forest Engine - Redwood Geometry Worker Thread
// File: src_workers_tree_worker.js
// ============================================================================

// --- Fast Seedable PRNG ---
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

// --- Compact 3D Noise Generator ---
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

// --- Worker Message Dispatcher ---
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

            // Collect ArrayBuffers for zero-copy transfer
            if (meshData.positions?.buffer) transferables.push(meshData.positions.buffer);
            if (meshData.normals?.buffer) transferables.push(meshData.normals.buffer);
            if (meshData.uvs?.buffer) transferables.push(meshData.uvs.buffer);
            if (meshData.colors?.buffer) transferables.push(meshData.colors.buffer);
            if (meshData.indices?.buffer) transferables.push(meshData.indices.buffer);
        });

        self.postMessage({ generatedBuffers }, transferables);
    } catch (err) {
        // Prevent main thread hanging if worker execution fails
        self.postMessage({ error: err.message || 'Redwood Worker Exception' });
    }
};

// --- Procedural Redwood Mesh Construction ---
function buildRedwoodMesh(ageState, seed) {
    const prng = new FastRandom(seed);
    const noiseGen = new SimplexNoise3D(prng);

    let height, baseRadius, topRadius, flareAggression, bareTrunkRatio, branchCount;

    switch (ageState) {
        case 'ANCIENT':
            height = prng.range(85.0, 100.0);
            baseRadius = prng.range(3.8, 5.2);
            topRadius = 0.35;
            flareAggression = 4.2;
            bareTrunkRatio = 0.62;
            branchCount = 45;
            break;
        case 'MATURE':
            height = prng.range(60.0, 80.0);
            baseRadius = prng.range(2.2, 3.5);
            topRadius = 0.25;
            flareAggression = 2.8;
            bareTrunkRatio = 0.48;
            branchCount = 38;
            break;
        case 'DYING':
            height = prng.range(75.0, 90.0);
            baseRadius = prng.range(3.2, 4.5);
            topRadius = 0.15;
            flareAggression = 3.8;
            bareTrunkRatio = 0.75;
            branchCount = 18;
            break;
        case 'YOUNG':
        default:
            height = prng.range(30.0, 45.0);
            baseRadius = prng.range(1.0, 1.6);
            topRadius = 0.15;
            flareAggression = 1.4;
            bareTrunkRatio = 0.25;
            branchCount = 28;
            break;
    }

    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    const radialSegs = 20;
    const heightSegs = 48;

    // --- 1. TRUNK MESH GENERATION ---
    for (let y = 0; y <= heightSegs; y++) {
        const v = y / heightSegs;
        const currentY = v * height;

        const taperPower = 3.6;
        let radius = baseRadius * (1.0 - Math.pow(v, taperPower)) + topRadius;

        const flareIntensity = v < 0.18 ? Math.pow(1.0 - (v / 0.18), 2.2) : 0.0;

        for (let r = 0; r <= radialSegs; r++) {
            const u = r / radialSegs;
            const theta = u * Math.PI * 2.0;

            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            let flareNoise = 0.0;
            if (flareIntensity > 0.0) {
                const n1 = Math.max(0.0, noiseGen.noise(cosT * 2.0, sinT * 2.0, v * 8.0));
                const n2 = Math.max(0.0, Math.sin(theta * 5.0) * 0.4 + Math.cos(theta * 3.0) * 0.2);
                flareNoise = (n1 * 0.6 + n2 * 0.4) * flareIntensity * flareAggression;
            }

            const currentRadius = radius + flareNoise;
            const px = cosT * currentRadius;
            const py = currentY;
            const pz = sinT * currentRadius;

            positions.push(px, py, pz);

            const nx = cosT;
            const ny = 0.08 * (1.0 - v);
            const nz = sinT;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
            normals.push(nx / len, ny / len, nz / len);

            uvs.push(u * 6.0, v * (height / 3.5));

            const northBias = pz < -0.1 ? Math.abs(pz / currentRadius) : 0.0;
            const baseMoss = flareIntensity * 0.8;
            const mossWeight = Math.min(1.0, northBias * (1.0 - v * 0.8) + baseMoss);

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

    // --- 2. PRIMARY BRANCHES & FOLIAGE CLUSTERS ---
    for (let b = 0; b < branchCount; b++) {
        const bProgress = b / branchCount;
        const bV = bareTrunkRatio + bProgress * (1.0 - bareTrunkRatio);
        const bY = bV * height;

        const bAngle = b * 2.39996 + prng.range(-0.15, 0.15);
        
        const maxLen = (1.0 - (bV - bareTrunkRatio) / (1.0 - bareTrunkRatio)) * 14.0 + 3.5;
        const bLength = maxLen * prng.range(0.75, 1.1);

        const tRadius = baseRadius * (1.0 - Math.pow(bV, 3.6)) + topRadius;
        const rootX = Math.cos(bAngle) * tRadius;
        const rootZ = Math.sin(bAngle) * tRadius;

        const tipX = rootX + Math.cos(bAngle) * bLength;
        const droopAmount = prng.range(2.0, 4.5);
        const tipY = bY - droopAmount + (bProgress * 2.0);
        const tipZ = rootZ + Math.sin(bAngle) * bLength;

        // Branch Wood Geometry
        const bSegs = 6;
        const bRadius = Math.max(0.08, (1.0 - bV) * 0.4);

        for (let s = 0; s <= bSegs; s++) {
            const sT = s / bSegs;
            const currX = rootX + (tipX - rootX) * sT;
            const currY = bY + (-droopAmount * 1.5 * Math.sin(sT * Math.PI * 0.8)) + (tipY - bY) * sT;
            const currZ = rootZ + (tipZ - rootZ) * sT;

            const currRad = bRadius * (1.0 - sT * 0.7);

            positions.push(currX - currRad, currY, currZ);
            positions.push(currX + currRad, currY, currZ);
            positions.push(currX + currRad, currY + currRad * 2.0, currZ);
            positions.push(currX - currRad, currY + currRad * 2.0, currZ);

            normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
            uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

            const swayWeight = Math.pow(sT, 1.5) * (bV * 0.9);
            colors.push(swayWeight, 0.0, 0.0);
            colors.push(swayWeight, 0.0, 0.0);
            colors.push(swayWeight, 0.0, 0.0);
            colors.push(swayWeight, 0.0, 0.0);

            indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
            indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
            vertexOffset += 4;
        }

        // Foliage Sprays
        if (ageState !== 'DYING' || prng.next() > 0.6) {
            const clusterSize = prng.range(4.5, 7.5);
            const numCards = 3;

            for (let c = 0; c < numCards; c++) {
                const cAngle = (c / numCards) * Math.PI;

                const cCos = Math.cos(cAngle) * clusterSize;
                const cSin = Math.sin(cAngle) * clusterSize;

                positions.push(tipX - cCos, tipY - clusterSize * 0.2, tipZ - cSin);
                positions.push(tipX + cCos, tipY - clusterSize * 0.2, tipZ + cSin);
                positions.push(tipX + cCos, tipY + clusterSize * 0.8, tipZ + cSin);
                positions.push(tipX - cCos, tipY + clusterSize * 0.8, tipZ - cSin);

                normals.push(cCos, 0.5, cSin);
                normals.push(-cCos, 0.5, -cSin);
                normals.push(-cCos, 0.8, -cSin);
                normals.push(cCos, 0.8, cSin);

                uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

                const branchSway = bV * 0.85;
                colors.push(branchSway, 1.0, 0.0);
                colors.push(branchSway, 1.0, 0.0);
                colors.push(branchSway, 1.0, 0.0);
                colors.push(branchSway, 1.0, 0.0);

                indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
                indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
                vertexOffset += 4;
            }
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        colors: new Float32Array(colors),
        indices: new Uint32Array(indices) // Universal Uint32Array prevents 16-bit truncation
    };
}
