import * as THREE from 'three';
import RAPIER from 'rapier';

class CapitalCityManager {
    constructor() {
        this.center = { x: 0, z: 0 };
        this.radius = 280; // 280m city radius (560m diameter)
        this.isGenerated = false;
        this.cityGroup = new THREE.Group();
        this.rigidBodies = [];
    }

    isInsideCapital(x, z) {
        return (x * x + z * z) <= (this.radius * this.radius);
    }

    /**
     * Helper: Creates a house/structure with a rectangular body and triangular roof
     */
    createBuildingMesh(w, h, d, wallMat, roofMat) {
        const group = new THREE.Group();
        const bodyHeight = h * 0.65;
        const roofHeight = h * 0.35;

        // Rectangular Building Body
        const bodyGeo = new THREE.BoxGeometry(w, bodyHeight, d);
        const bodyMesh = new THREE.Mesh(bodyGeo, wallMat);
        bodyMesh.position.y = bodyHeight / 2;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        // Triangular / Pyramidal Roof
        const roofRadius = Math.hypot(w, d) / 2;
        const roofGeo = new THREE.ConeGeometry(roofRadius, roofHeight, 4);
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.y = bodyHeight + (roofHeight / 2);
        roofMesh.rotation.y = Math.PI / 4; // Align 4-sided cone with rectangle corners
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        group.add(roofMesh);

        return group;
    }

    /**
     * Main Capital City Initialization
     */
    generateCapital() {
        if (this.isGenerated || !window.GameCore?.scene || !window.GameCore?.world) return;

        const scene = window.GameCore.scene;
        const world = window.GameCore.world;
        const baseY = window.WorldGenerator?.getTerrainHeight(0, 0) || 0;

        // Distinct Material Palette
        const matObelisk = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 }); // Black Obsidian
        const matCastleWall = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }); // Slate Stone
        const matRoad = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }); // Paved Cobblestone

        // Building Walls & Roof Materials
        const matWallStone = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        const matWallWood = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
        const matWallGold = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.5 });
        
        const matRoofSlate = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const matRoofGilded = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2, metalness: 0.7 });
        const matRoofCrimson = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
        const matRoofMint = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.6 });

        // =========================================================
        // 1. DEFINED ROAD NETWORK (Radials & Concentric Rings)
        // =========================================================
        const roadHeight = 0.15;
        
        // 4 Main Cardinal Radial Avenues (12m wide)
        const radialLengths = 270;
        const radialAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5]; // E, N, W, S
        radialAngles.forEach(angle => {
            const roadGeo = new THREE.BoxGeometry(12, roadHeight, radialLengths);
            const roadMesh = new THREE.Mesh(roadGeo, matRoad);
            roadMesh.position.set(
                Math.sin(angle) * (radialLengths / 2 + 10),
                baseY + roadHeight / 2,
                Math.cos(angle) * (radialLengths / 2 + 10)
            );
            roadMesh.rotation.y = angle;
            roadMesh.receiveShadow = true;
            this.cityGroup.add(roadMesh);
        });

        // 3 Concentric Ring Roads (R = 40m, 150m, 260m)
        [40, 150, 260].forEach(ringRadius => {
            const ringGeo = new THREE.RingGeometry(ringRadius - 5, ringRadius + 5, 64);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMesh = new THREE.Mesh(ringGeo, matRoad);
            ringMesh.position.y = baseY + roadHeight;
            ringMesh.receiveShadow = true;
            this.cityGroup.add(ringMesh);
        });

        // =========================================================
        // 2. CENTRAL OBSIDIAN CITADEL & OBELISK (0m - 30m)
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

        // Surrounding Castle Keep Towers
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const tx = Math.cos(angle) * 22;
            const tz = Math.sin(angle) * 22;
            
            // Castle Keep: Square Tower with Pyramid Roof
            const keepGroup = this.createBuildingMesh(10, 42, 10, matCastleWall, matRoofSlate);
            keepGroup.position.set(tx, baseY, tz);
            this.cityGroup.add(keepGroup);

            const kBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(tx, baseY + 21, tz));
            world.createCollider(RAPIER.ColliderDesc.cuboid(5, 21, 5), kBody);
            this.rigidBodies.push(kBody);
        }

        // =========================================================
        // 3. CASTELLATED FORTIFICATION WALLS & GATEHOUSES
        // =========================================================
        // Inner Citadel Wall (R = 40m)
        this.buildCastellatedWallRing(40, 18, 4, matCastleWall, baseY, world, radialAngles);
        // Mid Administration Wall (R = 150m)
        this.buildCastellatedWallRing(150, 24, 6, matCastleWall, baseY, world, radialAngles);
        // Outer Perimeter Wall (R = 260m)
        this.buildCastellatedWallRing(260, 30, 8, matCastleWall, baseY, world, radialAngles);

        // =========================================================
        // 4. DISTRICT STRUCTURES (Rectangle Buildings + Triangle Roofs)
        // =========================================================
        // Inner Nobility Ring (R: 50m - 130m) - Gilded Estates
        this.buildDistrictBuildings(50, 130, 24, 10, 18, 28, matWallGold, matRoofGilded, baseY, world);

        // NE Sector: Royal Vanguard Barracks (R: 165m)
        this.buildSectorBuildings(15, 75, 165, 16, 26, 18, matWallStone, matRoofCrimson, baseY, world);

        // E Sector: Royal Mint & Mint Vaults (R: 165m)
        this.buildSectorBuildings(85, 145, 165, 18, 22, 22, matWallStone, matRoofMint, baseY, world);

        // W/NW/SW Sector: High-Density Tenements (R: 165m - 245m)
        this.buildDistrictBuildings(170, 245, 52, 8, 14, 16, matWallWood, matRoofSlate, baseY, world);

        scene.add(this.cityGroup);
        this.isGenerated = true;
        console.log("🏰 [CapitalCity] Aethelgard Capital City initialized at (0,0) with roads, castellated walls, and gabled structures.");
    }

    /**
     * Builds a ring of castellated walls with crenellations and square gatehouse towers at road crossings
     */
    buildCastellatedWallRing(radius, height, thickness, material, baseY, world, gateAngles = []) {
        const segments = 48;
        const step = (Math.PI * 2) / segments;
        const gateTolerance = 0.16;

        for (let i = 0; i < segments; i++) {
            const angle = i * step;
            const isGate = gateAngles.some(g => Math.abs(angle - g) < gateTolerance || Math.abs(angle - g - Math.PI * 2) < gateTolerance);

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            if (isGate) {
                // Render Fortified Castle Gatehouse at Gate Locations
                const gateGroup = new THREE.Group();
                const towerW = thickness * 2.2;
                const towerH = height * 1.25;

                // Twin Flanking Square Towers
                const leftTower = this.createBuildingMesh(towerW, towerH, towerW, material, material);
                leftTower.position.set(-6, 0, 0);
                const rightTower = this.createBuildingMesh(towerW, towerH, towerW, material, material);
                rightTower.position.set(6, 0, 0);

                gateGroup.add(leftTower);
                gateGroup.add(rightTower);
                gateGroup.position.set(x, baseY, z);
                gateGroup.rotation.y = -angle;
                this.cityGroup.add(gateGroup);

                const gBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + towerH / 2, z));
                world.createCollider(RAPIER.ColliderDesc.cuboid(towerW, towerH / 2, towerW), gBody);
                this.rigidBodies.push(gBody);
                continue;
            }

            // Standard Wall Segment with Merlons (Crenellations)
            const segmentLength = (2 * Math.PI * radius) / segments;
            const wallGroup = new THREE.Group();

            // Main Rectangular Wall Span
            const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, segmentLength + 0.2), material);
            wallMesh.position.y = height / 2;
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            wallGroup.add(wallMesh);

            // Top Merlons (Castle Wall Teeth)
            const merlonCount = 3;
            const merlonH = 2.0;
            const merlonW = thickness * 1.1;
            const merlonD = segmentLength / (merlonCount * 2);

            for (let m = 0; m < merlonCount; m++) {
                const merlonMesh = new THREE.Mesh(new THREE.BoxGeometry(merlonW, merlonH, merlonD), material);
                const mz = -segmentLength / 2 + (m * 2 + 0.5) * merlonD;
                merlonMesh.position.set(0, height + merlonH / 2, mz);
                merlonMesh.castShadow = true;
                wallGroup.add(merlonMesh);
            }

            wallGroup.position.set(x, baseY, z);
            wallGroup.rotation.y = -angle;
            this.cityGroup.add(wallGroup);

            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + height / 2, z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
            world.createCollider(RAPIER.ColliderDesc.cuboid(thickness / 2, height / 2, segmentLength / 2), body);
            this.rigidBodies.push(body);
        }
    }

    /**
     * Builds district blocks using rectangular bodies with triangular roofs
     */
    buildDistrictBuildings(minR, maxR, count, minSize, maxSize, maxHeight, wallMat, roofMat, baseY, world) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            // Keep main radial avenues clear
            if (Math.abs(angle) < 0.18 || Math.abs(angle - Math.PI/2) < 0.18 || Math.abs(angle - Math.PI) < 0.18 || Math.abs(angle - Math.PI*1.5) < 0.18) continue;

            const r = minR + Math.random() * (maxR - minR);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const w = minSize + Math.random() * (maxSize - minSize);
            const d = minSize + Math.random() * (maxSize - minSize);
            const h = 8 + Math.random() * maxHeight;

            const buildingGroup = this.createBuildingMesh(w, h, d, wallMat, roofMat);
            buildingGroup.position.set(x, baseY, z);
            buildingGroup.rotation.y = Math.random() * Math.PI;
            this.cityGroup.add(buildingGroup);

            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + h / 2, z));
            world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), body);
            this.rigidBodies.push(body);
        }
    }

    /**
     * Builds sector-specific structures (Barracks, Mint, Warehouses)
     */
    buildSectorBuildings(startDeg, endDeg, radius, width, depth, height, wallMat, roofMat, baseY, world) {
        const radStart = (startDeg * Math.PI) / 180;
        const radEnd = (endDeg * Math.PI) / 180;
        for (let a = radStart; a <= radEnd; a += 0.18) {
            const x = Math.cos(a) * radius;
            const z = Math.sin(a) * radius;

            const buildingGroup = this.createBuildingMesh(width, height, depth, wallMat, roofMat);
            buildingGroup.position.set(x, baseY, z);
            buildingGroup.rotation.y = -a;
            this.cityGroup.add(buildingGroup);

            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + height / 2, z));
            world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2), body);
            this.rigidBodies.push(body);
        }
    }
}

window.CapitalCityManager = new CapitalCityManager();
