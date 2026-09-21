import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

class RenderPipeline {
    constructor() {
        this.composer = null;
        this.passes = {};
        this.dirLight = null;
        this.ambientLight = null;
        this.worldPass = null;
        this.pocketPass = null;
        this.renderer = null;
        this.camera = null;
        this.qualityTier = 'medium'; // Default to balanced performance
    }

    init(renderer, scene, pocketScene, camera) {
        this.renderer = renderer;
        this.camera = camera;

        // Cap pixel ratio to 1.0 during dev to prevent 4K screen lag
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // --- Lighting Setup ---
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
        this.dirLight.position.set(20, 60, 20);
        this.dirLight.castShadow = true;
        // Optimized Shadow Resolution (1024 vs 2048 cuts shadow VRAM/GPU cost by 75%)
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.left = -100;
        this.dirLight.shadow.camera.right = 100;
        this.dirLight.shadow.camera.top = 100;
        this.dirLight.shadow.camera.bottom = -100;
        this.dirLight.shadow.bias = -0.0005;
        scene.add(this.dirLight);

        // --- Composer Setup ---
        this.composer = new EffectComposer(renderer);
        this.worldPass = new RenderPass(scene, camera);
        this.pocketPass = new RenderPass(pocketScene, camera);
        this.composer.addPass(this.worldPass);

        // --- Optimized SSAO Pass ---
        this.passes.ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
        this.passes.ssao.kernelRadius = 8; // Reduced from 16 for better speed
        this.passes.ssao.minDistance = 0.001;
        this.passes.ssao.maxDistance = 0.1;
        this.composer.addPass(this.passes.ssao);

        // --- Bloom Pass ---
        this.passes.bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth * 0.25, window.innerHeight * 0.25), // Reduced resolution target
            0.8, 0.2, 0.9
        );
        this.composer.addPass(this.passes.bloom);

        // --- Vignette Shader ---
        const VignetteShader = {
            uniforms: { "tDiffuse": { value: null }, "darkness": { value: 0.35 } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
            fragmentShader: `uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); float dist = distance(vUv, vec2(0.5)); float edge = smoothstep(0.25, 0.75, dist); texel.rgb *= 1.0 - edge * clamp(darkness, 0.0, 0.85); gl_FragColor = texel; }`
        };
        this.passes.vignette = new ShaderPass(VignetteShader);
        this.composer.addPass(this.passes.vignette);

        // --- Fast Anti-Aliasing (SMAA) ---
        this.passes.smaa = new SMAAPass(
            window.innerWidth,
            window.innerHeight
        );
        this.composer.addPass(this.passes.smaa);

        window.GameCore.passes = this.passes;
        this.setQuality(this.qualityTier);
    }

    setQuality(tier) {
        this.qualityTier = tier;
        if (!this.composer) return;

        if (tier === 'low') {
            this.passes.ssao.enabled = false;
            this.passes.bloom.enabled = false;
            this.passes.smaa.enabled = false;
            this.dirLight.castShadow = false;
        } else if (tier === 'medium') {
            this.passes.ssao.enabled = true;
            this.passes.bloom.enabled = true;
            this.passes.smaa.enabled = false;
            this.dirLight.castShadow = true;
        } else if (tier === 'high') {
            this.passes.ssao.enabled = true;
            this.passes.bloom.enabled = true;
            this.passes.smaa.enabled = true;
            this.dirLight.castShadow = true;
        }
    }

    resize(width, height) {
        if (this.composer) this.composer.setSize(width, height);
        if (this.passes.ssao) this.passes.ssao.setSize(width, height);
    }

    render() {
        if (window.BlockTerrainManager) {
            window.BlockTerrainManager.updateTime(performance.now() / 1000);
            if (window.EngineParams?.isRaining !== undefined) {
                window.BlockTerrainManager.setWeatherRain(window.EngineParams.isRaining ? 1.0 : 0.0);
            }
        }
        if (this.composer) this.composer.render();
    }

    swapScene(target) {
        if (target === 'establishment') {
            this.composer.removePass(this.worldPass);
            this.composer.insertPass(this.pocketPass, 0);
        } else if (target === 'world') {
            this.composer.removePass(this.pocketPass);
            this.composer.insertPass(this.worldPass, 0);
        }
    }

    updateEnvironment(scene, fog, engineParams, horizonMaterial) {
        if (!engineParams || !this.dirLight) return;

        const hourNormalized = (engineParams.timeOfDay % 24) / 24;
        const angle = hourNormalized * Math.PI * 2 - (Math.PI / 2);

        const sunRadius = 200;
        this.dirLight.position.x = Math.cos(angle) * sunRadius;
        this.dirLight.position.y = Math.sin(angle) * sunRadius;
        this.dirLight.position.z = Math.cos(angle) * 100;

        const sunHeight = Math.sin(angle);
        let baseDirIntensity = 2.2;
        let baseAmbientIntensity = 1.2;

        if (sunHeight > 0.3) {
            this.dirLight.color.setHex(0xffffff); this.ambientLight.color.setHex(0xffffff);
            fog.color.setHex(0x94a3b8); scene.background = new THREE.Color(0x94a3b8);
        } else if (sunHeight > -0.1) {
            this.dirLight.color.setHex(0xffccaa); this.ambientLight.color.setHex(0x7c2d12);
            fog.color.setHex(0x451a03); scene.background = new THREE.Color(0x451a03);
        } else {
            this.dirLight.color.setHex(0x1e293b); this.ambientLight.color.setHex(0x0f172a);
            fog.color.setHex(0x020617); scene.background = new THREE.Color(0x020617);
        }

        this.dirLight.intensity = baseDirIntensity * engineParams.globalBrightness;
        this.ambientLight.intensity = baseAmbientIntensity * engineParams.globalBrightness;
        this.renderer.toneMappingExposure = Math.max(1.0, engineParams.globalBrightness * 1.5);
        fog.density = engineParams.fogDensity * (sunHeight < 0 ? 1.5 : 1.0);

        if (horizonMaterial) {
            horizonMaterial.uniforms.sunPos.value.copy(this.dirLight.position);
            horizonMaterial.uniforms.fogColor.value.copy(fog.color);
        }
    }
}

window.RenderPipeline = new RenderPipeline();
