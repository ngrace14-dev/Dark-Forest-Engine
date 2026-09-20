import * as THREE from 'three';

/**
 * FOREST SYSTEMS - Phase 3: Billboard Impostors (Tier C)
 * 
 * Implements low-cost 2D billboard impostors for distant forest rendering (600m - 5000m).
 */

class BillboardSystem {
    constructor() {
        this.group = new THREE.Group();
        this.impostorTexture = null; // Needs a 1024px Texture Atlas
        this.setupMaterials();
    }

    setupMaterials() {
        // Shader to keep billboard facing the camera
        this.billboardMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.impostorTexture },
            },
            vertexShader: `
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                    mvPosition.xy += position.xy;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(map, vUv);
                    if (gl_FragColor.a < 0.5) discard;
                }
            `,
            transparent: true
        });
    }

    /**
     * Update distant trees using billboards
     * @param {Array} points 
     */
    updateBillboards(points) {
        // Create or update an InstancedMesh of 2D planes
        if (!this.imesh || this.imesh.count < points.length) {
            if (this.imesh) this.group.remove(this.imesh);
            const geometry = new THREE.PlaneGeometry(10, 10);
            this.imesh = new THREE.InstancedMesh(geometry, this.billboardMaterial, 1000); // 1000 billboards per chunk
            this.group.add(this.imesh);
        }

        const matrix = new THREE.Matrix4();
        points.forEach((p, i) => {
            matrix.makeTranslation(p.x, 5, p.z); // Billboards usually sit slightly higher
            this.imesh.setMatrixAt(i, matrix);
        });
        
        this.imesh.count = points.length;
        this.imesh.instanceMatrix.needsUpdate = true;
    }
}

window.BillboardManager = new BillboardSystem();
