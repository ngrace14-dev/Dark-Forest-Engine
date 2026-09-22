// ====================================================================
// DARK FOREST ENGINE — ASYNC TERRAIN WEB WORKER
// File: src/workers/terrain_worker.js
// ====================================================================

function createSimplexNoise(seed = 1337) {
    const p = new Uint8Array(256);
    let s = seed;
    for (let i = 0; i < 256; i++) {
        s = (s * 16807) % 2147483647;
        p[i] = s & 255;
    }
    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        permMod12[i] = perm[i] % 12;
    }

    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const grad3 = new Float32Array([
        1,1,0, -1,1,0, 1,-1,0, -1,-1,0,
        1,0,1, -1,0,1, 1,0,-1, -1,0,-1,
        0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1
    ]);

    return function noise2D(xin, yin) {
        let n0 = 0, n1 = 0, n2 = 0;
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;

        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        const ii = i & 255;
        const jj = j & 255;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            t0 *= t0;
            const gi0 = permMod12[ii + perm[jj]] * 3;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            t1 *= t1;
            const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            t2 *= t2;
            const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
        }

        return 70.0 * (n0 + n1 + n2);
    };
}

let noiseFn = null;
let currentSeed = null;

function getTerrainHeight(x, z) {
    if (!noiseFn) noiseFn = createSimplexNoise(1337);
    const elevation = noiseFn(x * 0.003, z * 0.003) * 18.0;
    const detail = noiseFn(x * 0.015, z * 0.015) * 3.5;
    const h = elevation + detail;
    return Number.isFinite(h) ? h : 0;
}

self.onmessage = function (e) {
    try {
        const { id, cx, cz, segments, chunkSize, seed, roadPoints } = e.data;

        const taskSeed = seed || 1337;
        if (!noiseFn || currentSeed !== taskSeed) {
            noiseFn = createSimplexNoise(taskSeed);
            currentSeed = taskSeed;
        }

        const chunkX = cx * chunkSize + chunkSize / 2;
        const chunkZ = cz * chunkSize + chunkSize / 2;
        const vertCount = (segments + 1) * (segments + 1);

        const positions = new Float32Array(vertCount * 3);
        const normals = new Float32Array(vertCount * 3);
        const colors = new Float32Array(vertCount * 3);
        const clutter = new Float32Array(vertCount);

        const ROAD_WIDTH = 5;
        const halfSize = chunkSize / 2;
        const step = chunkSize / segments;

        const localRoadPoints = [];
        if (Array.isArray(roadPoints) && roadPoints.length > 0) {
            const margin = halfSize + ROAD_WIDTH + 10;
            for (let r = 0; r < roadPoints.length; r++) {
                const pt = roadPoints[r];
                if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.z)) {
                    if (Math.abs(pt.x - chunkX) <= margin && Math.abs(pt.z - chunkZ) <= margin) {
                        localRoadPoints.push(pt);
                    }
                }
            }
        }

        let vertIdx = 0;
        let clutterIdx = 0;

        for (let j = 0; j <= segments; j++) {
            const zLocal = -halfSize + j * step;
            const wz = zLocal + chunkZ;

            for (let i = 0; i <= segments; i++) {
                const xLocal = -halfSize + i * step;
                const wx = xLocal + chunkX;

                const wy = getTerrainHeight(wx, wz);

                positions[vertIdx] = xLocal;
                positions[vertIdx + 1] = wy;
                positions[vertIdx + 2] = zLocal;

                let minRoadDistSq = 999999;
                if (localRoadPoints.length > 0) {
                    for (let r = 0; r < localRoadPoints.length; r++) {
                        const pt = localRoadPoints[r];
                        const dx = wx - pt.x;
                        const dz = wz - pt.z;
                        const distSq = dx * dx + dz * dz;
                        if (distSq < minRoadDistSq) minRoadDistSq = distSq;
                    }
                }

                const minRoadDist = Math.sqrt(minRoadDistSq);

                let rCol = 0.29;
                let gCol = 0.87;
                let bCol = 0.50;

                if (minRoadDist < ROAD_WIDTH + 2) {
                    const dirtInfluence = Math.max(0, 1.0 - minRoadDist / (ROAD_WIDTH + 2));
                    rCol = rCol + (0.29 - rCol) * (dirtInfluence * 0.55);
                    gCol = gCol + (0.24 - gCol) * (dirtInfluence * 0.55);
                    bCol = bCol + (0.19 - bCol) * (dirtInfluence * 0.55);
                }

                const cNoise = noiseFn(wx * 0.1, wz * 0.1) * 0.04;
                colors[vertIdx] = Math.min(1.0, Math.max(0.0, rCol + cNoise));
                colors[vertIdx + 1] = Math.min(1.0, Math.max(0.0, gCol + cNoise));
                colors[vertIdx + 2] = Math.min(1.0, Math.max(0.0, bCol + cNoise));

                const hL = getTerrainHeight(wx - 0.1, wz);
                const hR = getTerrainHeight(wx + 0.1, wz);
                const hD = getTerrainHeight(wx, wz - 0.1);
                const hU = getTerrainHeight(wx, wz + 0.1);

                const nx = hL - hR;
                const ny = 0.2;
                const nz = hD - hU;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;

                normals[vertIdx] = nx / len;
                normals[vertIdx + 1] = ny / len;
                normals[vertIdx + 2] = nz / len;

                clutter[clutterIdx++] = noiseFn(wx * 0.5, wz * 0.5);
                vertIdx += 3;
            }
        }

        self.postMessage(
            { id, key: `${cx},${cz}`, cx, cz, positions, normals, colors, clutter },
            [positions.buffer, normals.buffer, colors.buffer, clutter.buffer]
        );
    } catch (err) {
        self.postMessage({ id: e.data?.id, error: err.message || 'Worker Error' });
    }
};
