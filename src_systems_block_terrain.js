import * as THREE from 'three';

// ==========================================
// 1. PROCEDURAL BLOCK SHADER MATERIAL (GLSL)
// ==========================================
export function createProceduralBlockMaterial(options = {}) {
    const mat = new THREE.MeshStandardMaterial({
        roughness: options.roughness ?? 0.85,
        metalness: options.metalness ?? 0.1,
        flatShading: false,
        ...options
    });

    mat.userData.uniforms = {
        uTime: { value: 0 },
        uNoiseScale: { value: options.noiseScale || 0.12 },
        uDisplacementAmount: { value: options.displacement || 0.75 },
        uTriplanarScale: { value: options.triplanarScale || 0.15 },
        uRainIntensity: { value: 0.0 }, // 0.0 = Dry, 1.0 = Soaking wet
        uTopColor: { value: new THREE.Color(options.topColor || '#2e5a27') },     // Moss / Grass
        uSideColor: { value: new THREE.Color(options.sideColor || '#4a4740') },    // Rock / Cliff Face
        uBottomColor: { value: new THREE.Color(options.bottomColor || '#241c15') }  // Mud / Crevice Soil
    };

    mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, mat.userData.uniforms);

        // --- VERTEX SHADER: WORLD NOISE DISPLACEMENT ---
        shader.vertexShader = `
            uniform float uTime;
            uniform float uNoiseScale;
            uniform float uDisplacementAmount;
            varying vec3 vWorldPosition;
            varying vec3 vWorldNormal;

            // GLSL 3D Simplex Noise for Organic Box Distortion
            vec3 mod289_v(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289_v(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute_v(vec4 x) { return mod289_v(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt_v(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float snoise3D(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289_v(i);
                vec4 p = permute_v(permute_v(permute_v(
                            i.z + vec4(0.0, i1.z, i2.z, 1.0))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                vec4 norm = taylorInvSqrt_v(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }

            ${shader.vertexShader}
        `;

        shader.vertexShader = shader.vertexShader.replace(
            `#include <begin_vertex>`,
            `
            #include <begin_vertex>
            
            #ifdef USE_INSTANCING
                vec4 wPos = instanceMatrix * vec4(position, 1.0);
                vWorldPosition = (modelMatrix * wPos).xyz;
                vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
            #else
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
            #endif

            // Warp straight block edges into organic cliffs / weathered ruins
            float displacement = snoise3D(vWorldPosition * uNoiseScale);
            transformed += normal * displacement * uDisplacementAmount;
            `
        );

        // --- FRAGMENT SHADER: TRIPLANAR & SLOPE LAYERING & MOISTURE ---
        shader.fragmentShader = `
            uniform float uTriplanarScale;
            uniform float uRainIntensity;
            uniform vec3 uTopColor;
            uniform vec3 uSideColor;
            uniform vec3 uBottomColor;
            varying vec3 vWorldPosition;
            varying vec3 vWorldNormal;

            ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <color_fragment>`,
            `
            #include <color_fragment>

            vec3 norm = normalize(vWorldNormal);
            float slope = norm.y; // 1.0 = Upward face, 0.0 = Vertical cliff, -1.0 = Underside

            // Slope Material Layering: Moss on top, Crag on sides, Soil on bottom
            vec3 matColor = mix(uSideColor, uTopColor, smoothstep(0.45, 0.78, slope));
            matColor = mix(uBottomColor, matColor, smoothstep(-0.5, 0.1, slope));

            // Triplanar Noise Blend (No UV coordinates required)
            vec3 triWeight = abs(norm);
            triWeight = pow(triWeight, vec3(6.0));
            triWeight /= (triWeight.x + triWeight.y + triWeight.z);

            float noiseX = sin(vWorldPosition.y * uTriplanarScale * 8.0) * cos(vWorldPosition.z * uTriplanarScale * 8.0);
            float noiseY = sin(vWorldPosition.x * uTriplanarScale * 8.0) * cos(vWorldPosition.z * uTriplanarScale * 8.0);
            float noiseZ = sin(vWorldPosition.x * uTriplanarScale * 8.0) * cos(vWorldPosition.y * uTriplanarScale * 8.0);
            float triplanarTex = noiseX * triWeight.x + noiseY * triWeight.y + noiseZ * triWeight.z;

            diffuseColor.rgb = matColor + (triplanarTex * 0.07);

            // Dynamic Rain Moisture (Darkens wet surfaces)
            if (uRainIntensity > 0.01) {
                float wetness = clamp(slope, 0.0, 1.0) * uRainIntensity;
                diffuseColor.rgb *= mix(1.0, 0.60, wetness);
            }
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <roughnessmap_fragment>`,
            `
            #include <roughnessmap_fragment>
            
            // Dynamic Rain Moisture (Increases glossiness on top faces when wet)
            if (uRainIntensity > 0.01) {
                float wetness = clamp(vWorldNormal.y, 0.0, 1.0) * uRainIntensity;
                roughnessFactor = mix(roughnessFactor, 0.05, wetness);
            }
            `
        );
    };

    return mat;
}

// ==========================================
// 2. INSTANCED BLOCK TERRAIN CHUNK
// ==========================================
export class BlockTerrainChunk {
    constructor(blockCount, geometry, material) {
        this.mesh = new THREE.InstancedMesh(geometry, material, blockCount);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.dummy = new THREE.Object3D();
    }

    buildChunk(blockDataArray) {
        for (let i = 0; i < blockDataArray.length; i++) {
            const block = blockDataArray[i];
            this.dummy.position.set(block.x, block.y, block.z);
            this.dummy.scale.set(block.scaleX || 1, block.scaleY || 1, block.scaleZ || 1);
            this.dummy.rotation.set(block.rotX || 0, block.rotY || 0, block.rotZ || 0);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.count = blockDataArray.length;
        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.computeBoundingSphere();
    }
}

// ==========================================
// 3. PROCEDURAL BLOCK TERRAIN MANAGER
// ==========================================
class BlockTerrainManager {
    constructor() {
        this.cubeGeometry = new THREE.BoxGeometry(1, 1, 1, 8, 8, 8); // Subdivided for smooth noise vertex bending
        this.materials = {
            cliff: createProceduralBlockMaterial({
                topColor: '#2d4a22',
                sideColor: '#3a3832',
                bottomColor: '#1d1712',
                noiseScale: 0.12,
                displacement: 0.85
            }),
            ruins: createProceduralBlockMaterial({
                topColor: '#3b4e3a',
                sideColor: '#5c5850',
                bottomColor: '#2b2620',
                noiseScale: 0.25,
                displacement: 0.35
            })
        };
        this.activeChunks = new Map();
    }

    setWeatherRain(intensity) {
        for (const matKey in this.materials) {
            const mat = this.materials[matKey];
            if (mat.userData.uniforms?.uRainIntensity) {
                mat.userData.uniforms.uRainIntensity.value = intensity;
            }
        }
    }

    updateTime(timeSecs) {
        for (const matKey in this.materials) {
            const mat = this.materials[matKey];
            if (mat.userData.uniforms?.uTime) {
                mat.userData.uniforms.uTime.value = timeSecs;
            }
        }
    }

    // Procedural Cliff Generation Example
    spawnProceduralCliffCluster(scene, centerX, centerZ, count = 120) {
        const blockData = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 25;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            const y = (Math.random() * 18) - 2;

            blockData.push({
                x, y, z,
                scaleX: 3 + Math.random() * 6,
                scaleY: 4 + Math.random() * 10,
                scaleZ: 3 + Math.random() * 6,
                rotX: (Math.random() - 0.5) * 0.2,
                rotY: Math.random() * Math.PI,
                rotZ: (Math.random() - 0.5) * 0.2
            });
        }

        const chunk = new BlockTerrainChunk(count, this.cubeGeometry, this.materials.cliff);
        chunk.buildChunk(blockData);
        scene.add(chunk.mesh);
        return chunk;
    }
}

window.BlockTerrainManager = new BlockTerrainManager();
