import * as THREE from 'three';

class RenderOptimizer {
    constructor() {
        this.shadowDistanceSq = 35 * 35; // 35m distance cutoff for shadow casting
        this.animDistanceSq = 40 * 40;   // 40m distance cutoff for NPC animation updates
    }

    /**
     * Compiles custom GLSL terrain shader variants during boot to prevent chunk loading hitches.
     */
    prewarmShaders(renderer, scene, camera) {
        if (!renderer || !scene || !camera) return;

        const dummyGeo = new THREE.PlaneGeometry(1, 1);
        const dummyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 });

        dummyMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 attribute float clutter;
                 attribute float roadEdge;
                 varying float vClutter;
                 varying float vRoadEdge;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vClutter = clutter;
                 vRoadEdge = roadEdge;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 varying float vClutter;
                 varying float vRoadEdge;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 vec3 grassColor = vec3(0.1, 0.3, 0.1);
                 diffuseColor.rgb = mix(diffuseColor.rgb, grassColor, vClutter * 0.4);
                 vec3 pathGlowColor = vec3(0.1, 0.75, 1.0);
                 diffuseColor.rgb += pathGlowColor * vRoadEdge * 2.5;`
            );
        };

        const dummyMesh = new THREE.Mesh(dummyGeo, dummyMat);
        scene.add(dummyMesh);
        renderer.compile(scene, camera);
        scene.remove(dummyMesh);

        dummyGeo.dispose();
        dummyMat.dispose();
        console.log("⚡ [RenderOptimizer] Shaders pre-warmed successfully (Safe Path Glow included).");
    }

    /**
     * Toggles shadow passes and throttles distant NPC animation mixers based on player proximity.
     */
    updateEntityLOD(entities, cameraPosition) {
        if (!cameraPosition || !entities) return;

        for (let i = entities.length - 1; i >= 0; i--) {
            const entity = entities[i];
            if (!entity || !entity.visual) continue;

            const distSq = entity.visual.position.distanceToSquared(cameraPosition);
            const shouldShadow = distSq <= this.shadowDistanceSq;

            if (entity.visual.userData.isCastingShadow !== shouldShadow) {
                entity.visual.userData.isCastingShadow = shouldShadow;
                entity.visual.traverse(child => {
                    if (child.isMesh) child.castShadow = shouldShadow;
                });
            }

            if (entity.mixer && distSq > this.animDistanceSq) {
                entity.skipAnimFrame = (entity.skipAnimFrame || 0) + 1;
                entity.shouldSkipAnim = (entity.skipAnimFrame % 3 !== 0);
            } else {
                entity.shouldSkipAnim = false;
            }
        }
    }

    /**
     * Returns real-time WebGL pipeline statistics.
     */
    getMetrics(renderer) {
        if (!renderer) return {};
        const info = renderer.info;
        return {
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures
        };
    }
}

window.RenderOptimizer = new RenderOptimizer();
