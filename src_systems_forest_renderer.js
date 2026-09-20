import * as THREE from 'three';

/**
 * FOREST SYSTEMS - Phase 2: Instanced Rendering
 * 
 * Handles the efficient drawing of thousands of trees using InstancedMesh.
 */

class ForestRenderer {
    constructor() {
        this.instances = new Map(); // Store InstancedMesh by type
        this.group = new THREE.Group();
        this.setupMaterials();
    }

    setupMaterials() {
        // Shared material for all trees to minimize draw calls
        this.treeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a5d4e,
            side: THREE.DoubleSide
        });
    }

    /**
     * Initializes InstancedMesh objects based on population count.
     * @param {string} type 
     * @param {number} count 
     */
    initInstancedMesh(type, count) {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 8); // Placeholder for actual Tree model
        const imesh = new THREE.InstancedMesh(geometry, this.treeMaterial, count);
        imesh.count = 0;
        imesh.frustumCulled = false; // Important for custom chunk systems
        this.instances.set(type, imesh);
        this.group.add(imesh);
    }

    /**
     * Updates the transform matrices for a batch of instances.
     * @param {string} type 
     * @param {Array} points 
     */
    updateInstances(type, points) {
        const imesh = this.instances.get(type);
        if (!imesh) return;

        const matrix = new THREE.Matrix4();
        points.forEach((p, i) => {
            matrix.makeTranslation(p.x, 0, p.z);
            imesh.setMatrixAt(i, matrix);
        });
        
        imesh.count = points.length;
        imesh.instanceMatrix.needsUpdate = true;
    }
}

window.ForestRenderer = new ForestRenderer();
