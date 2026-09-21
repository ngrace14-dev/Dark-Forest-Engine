import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

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
    }

    init(renderer, scene, pocketScene, camera) {
        this.renderer = renderer;
        this.camera = camera;

        // --- 1. AAA Renderer Upgrades ---
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft, feathered shadows
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;

        // --- 2. Core Lighting Setup ---
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.dirLight.position.set(20, 60, 20);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048; // High-res shadows
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.left = -150;
        this.dirLight.shadow.camera.right = 150;
        this.dirLight.shadow.camera.top = 150;
        this.dirLight.shadow.camera.bottom = -150;
        this.dirLight.shadow.bias = -0.0005;
        scene.add(this.dirLight);

        // --- 3. Base Composer & Passes ---
        this.composer = new EffectComposer(renderer);
        this.worldPass = new RenderPass(scene, camera);
        this.pocketPass = new RenderPass(pocketScene, camera);
        this.composer.addPass(this.worldPass);

        // --- 4. SSAO (Contact Shadows) ---
        this.passes.ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
        this.passes.ssao.kernelRadius = 16;
        this.passes.ssao.minDistance = 0.001;
        this.passes.ssao.maxDistance = 0.1;
        this.composer.addPass(this.passes.ssao);

        // --- 5. Bloom ---
        this.passes.bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
            window.EngineParams?.bloom || 1.5, 0.25, 0.9
        );
        this.composer.addPass(this.passes.bloom);

        // --- 6. Vignette Shader ---
        const VignetteShader = {
            uniforms: { "tDiffuse": { value: null }, "darkness": { value: 0.35 } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
            fragmentShader: `uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); float dist = distance(vUv, vec2(0.5)); float edge = smoothstep(0.25, 0.75, dist); texel.rgb *= 1.0 - edge * clamp(darkness, 0.0, 0.85); gl_FragColor = texel; }`
        };
        this.passes.vignette = new ShaderPass(VignetteShader);
        this.composer.addPass(this.passes.vignette);

        // --- 7. Color Tint Shader ---
        const ColorTintShader = {
            uniforms: { "tDiffuse": { value: null }, "tintColor": { value: new THREE.Color('#2b4461') }, "tintIntensity": { value: 0.65 } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
            fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tintColor; uniform float tintIntensity; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); vec3 tinted = texel.rgb * tintColor * 2.0; vec3 finalColor = mix(texel.rgb, tinted, tintIntensity); gl_FragColor = vec4( finalColor, texel.a ); }`
        };
        this.passes.colorTint = new ShaderPass(ColorTintShader);
        this.composer.addPass(this.passes.colorTint);

        // --- 8. Cinematic Depth of Field (Bokeh) ---
        // Keeps player focused while gently blurring distant basic shapes/LODs
        this.passes.bokeh = new BokehPass(scene, camera, {
            focus: 15.0,        // Focal distance targeting the player camera radius
            aperture: 0.00005,  // Lens width
            maxblur: 0.012,     // Max background blur cap
            width: window.innerWidth,
            height: window.innerHeight
        });
        this.composer.addPass(this.passes.bokeh);

        // --- 9. SMAA (Hardware Anti-Aliasing) ---
        this.passes.smaa = new SMAAPass(
            window.innerWidth * renderer.getPixelRatio(),
            window.innerHeight * renderer.getPixelRatio()
        );
        this.composer.addPass(this.passes.smaa);

        window.GameCore.passes = this.passes;
    }

    resize(width, height) {
        if (this.composer) this.composer.setSize(width, height);
        if (this.passes.ssao) this.passes.ssao.setSize(width, height);
        if (this.passes.bokeh && this.passes.bokeh.renderTargetDepth) {
            this.passes.bokeh.setSize(width, height);
        }
    }

    render() {
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
        let baseDirIntensity = 2.5;
        let baseAmbientIntensity = 1.8;

        if (sunHeight > 0.3) {
            baseDirIntensity = 3.0; baseAmbientIntensity = 2.0;
            this.dirLight.color.setHex(0xffffff); this.ambientLight.color.setHex(0xffffff);
            fog.color.setHex(0x94a3b8); scene.background = new THREE.Color(0x94a3b8);
        } else if (sunHeight > -0.1) {
            baseDirIntensity = 1.8; baseAmbientIntensity = 1.4;
            this.dirLight.color.setHex(0xffccaa); this.ambientLight.color.setHex(0x7c2d12);
            fog.color.setHex(0x451a03); scene.background = new THREE.Color(0x451a03);
        } else {
            baseDirIntensity = 0.5; baseAmbientIntensity = 0.6;
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

// Expose globally
window.RenderPipeline = new RenderPipeline();
