import * as THREE from 'three';
import RAPIER from 'rapier';

class CapitalCityManager {
    constructor() {
        this.center = { x: 0, z: 0 };
        this.radius = 280; // 280m city radius (560m total diameter)
        this.isGenerated = false;
        this.cityGroup = new THREE.Group();
        this.rigidBodies = [];
    }

    isInsideCapital(x, z) {
        return (x * x + z * z) <= (this.radius * this.radius);
    }

    generateCapital() {
        if (this.isGenerated || !window.GameCore?.scene || !window.GameCore?.world) return;

        const scene = window.GameCore.scene;
        const world = window.GameCore.world;
        const baseY = window.WorldGenerator?.getTerrainHeight(0, 0) || 0;

        // Distinct Material Palette based on Layout Key
        const matObelisk = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 }); // Black Obsidian
        const matCitadel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 }); // Dark Citadel Wall
        const matInnerWall = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
        const matMidWall = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
        const matOuterWall = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
        
        const matNobility = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3, metalness: 0.4 }); // Gold / Slate Estates
        const matBarracks = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 }); // Crimson Vanguard
        const matMint = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.6 }); // Royal Mint Vaults
        const matTenements = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 }); // High-Density Stone
        const matAqueduct = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, transparent: true, opacity: 0.85 });

        // =========================================================
        // 1. CENTRAL OBELISK & OBSIDIAN CITADEL (0m - 30m)
        // =========================================================
        const obeliskHeight = 130;
        const obeliskGeo = new THREE.CylinderGeometry(0, 9, obeliskHeight, 4);
        obeliskGeo.rotateY(Math.PI / 4);
        const obeliskMesh = new THREE.Mesh(obeliskGeo, matObelisk);
        obeliskMesh.position.set(0, baseY + obeliskHeight / 2, 0);
        obeliskMesh.castShadow = true;
        this.cityGroup.add(obeliskMesh);

        const obeliskBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, baseY + obeliskHeight / 2, 0));
        world.createCollider(RAPIER.ColliderDesc.cuboid(6, obeliskHeight / 2, 6), obeliskBody);
        this.rigidBodies.push(obeliskBody);

        // Ring of Citadel Keeps
        const citadelKeeps = 8;
        for (let i = 0; i < citadelKeeps; i++) {
            const angle = (i / citadelKeeps) * Math.PI * 2;
            const tx = Math.cos(angle) * 22;
            const tz = Math.sin(angle) * 22;
            const keepMesh = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 40, 8), matCitadel);
            keepMesh.position.set(tx, baseY + 20, tz);
            keepMesh.castShadow = true;
            this.cityGroup.add(keepMesh);

            const kBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(tx, baseY + 20, tz));
            world.createCollider(RAPIER.ColliderDesc.cylinder(20, 5), kBody);
            this.rigidBodies.push(kBody);
        }

        // =========================================================
        // 2. CONCENTRIC WALL RINGS & CARDINAL GATES
        // =========================================================
        // Inner Citadel Wall (R = 40m)
        this.buildCircularWall(40, 20, 4, matInnerWall, baseY, world, [0, Math.PI / 2, Math.PI, Math.PI * 1.5]);
        // Mid Ring Wall (R = 150m)
        this.buildCircularWall(150, 26, 6, matMidWall, baseY, world, [0, Math.PI / 2, Math.PI, Math.PI * 1.5]);
        // Outer Perimeter Wall (R = 260m)
        this.buildCircularWall(260, 32, 8, matOuterWall, baseY, world, [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 0.75, Math.PI * 1.25]);

        // =========================================================
        // 3. DISTRICT LAYOUT BLOCKS
        // =========================================================
        // Inner Nobility Ring (R: 48m - 130m)
        this.buildDistrictRing(50, 125, 20, 8, 14, 30, matNobility, baseY, world);

        // NE Sector: Royal Vanguard Barracks & Parade Grounds
        this.buildSectorBlocks(15, 75, 165, 14, 22, 16, matBarracks, baseY, world);

        // E Sector: Royal Mint & Mint Vaults
        this.buildSectorBlocks(85, 145, 165, 16, 20, 20, matMint, baseY, world);

        // W/NW/SW Sector: High-Density Tenements & Refugee Ward (R: 165m - 250m)
        this.buildDistrictRing(170, 245, 45, 6, 10, 14, matTenements, baseY, world);

        // =========================================================
        // 4. WESTERN AQUEDUCT SYSTEM
        // =========================================================
        const aqueductGeo = new THREE.BoxGeometry(220, 10, 6);
        const aqueductMesh = new THREE.Mesh(aqueductGeo, matAqueduct);
        aqueductMesh.position.set(-240, baseY + 16, -18);
        aqueductMesh.castShadow = true;
        this.cityGroup.add(aqueductMesh);

        scene.add(this.cityGroup);
        this.isGenerated = true;
        console.log("🏰 [CapitalCity] The Capital City of Aethelgard generated at (0,0).");
    }

    buildCircularWall(radius, height, thickness, material, baseY, world, gateAngles = []) {
        const segments = 48;
        const step = (Math.PI * 2) / segments;
        const gateTolerance = 0.14;

        for (let i = 0; i < segments; i++) {
            const angle = i * step;
            const isGate = gateAngles.some(g => Math.abs(angle - g) < gateTolerance || Math.abs(angle - g - Math.PI * 2) < gateTolerance);
            if (isGate) continue; // Skip geometry at Gate locations

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const segmentLength = (2 * Math.PI * radius) / segments;
            const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, segmentLength + 0.5), material);
            wallMesh.position.set(x, baseY + height / 2, z);
            wallMesh.rotation.y = -angle;
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            this.cityGroup.add(wallMesh);

            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + height / 2, z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
            world.createCollider(RAPIER.ColliderDesc.cuboid(thickness / 2, height / 2, segmentLength / 2), body);
            this.rigidBodies.push(body);
        }
    }

    buildDistrictRing(minR, maxR, count, minSize, maxSize, maxHeight, material, baseY, world) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            // Leave main N, S, E, W avenues clear
            if (Math.abs(angle) < 0.16 || Math.abs(angle - Math.PI/2) < 0.16 || Math.abs(angle - Math.PI) < 0.16 || Math.abs(angle - Math.PI*1.5) < 0.16) continue;

            const r = minR + Math.random() * (maxR - minR);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const w = minSize + Math.random() * (maxSize - minSize);
            const d = minSize + Math.random() * (maxSize - minSize);
            const h = 8 + Math.random() * maxHeight;

            const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
            blockMesh.position.set(x, baseY + h / 2, z);
            blockMesh.rotation.y = Math.random() * Math.PI;
            blockMesh.castShadow = true;
            blockMesh.receiveShadow = true;
            this.cityGroup.add(blockMesh);

            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + h / 2, z));
            world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), body);
            this.rigidBodies.push(body);
        }
    }

    buildSectorBlocks(startDeg, endDeg, radius, width, depth, height, material, baseY, world) {
        const radStart = (startDeg * Math.PI) / 180;
        const radEnd = (endDeg * Math.PI) / 180;
        for (let a = radStart; a <= radEnd; a += 0.16) {
            const x = Math.cos(a) * radius;
            const z = Math.sin(a) * radius;
            const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
            blockMesh.position.set(x, baseY + height / 2, z);
            blockMesh.rotation.y = -a;
            blockMesh.castShadow = true;
            this.cityGroup.add(blockMesh);

            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + height / 2, z));
            world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2), body);
            this.rigidBodies.push(body);
        }
    }
}

window.CapitalCityManager = new CapitalCityManager();
