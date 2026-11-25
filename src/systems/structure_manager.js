// ============================================================================
// Dark Forest Engine - Grid-Based Settlement Structure & Wall-Mounting Manager
// File: src/systems/structure_manager.js
// Strictly reads geometry, materials, footprints, and mount offsets from assets/tileset.json
// ============================================================================

import {
    TILESET,
    getTilesetMaterial,
    getTilesetStructureSpec,
    applyTilesetLightingState
} from '../core/tileset_bridge.js';

const rootScope = typeof window !== 'undefined' ? window : globalThis;

function buildCatalogEntry(id, tilesetKey, combatStats) {
    const spec = getTilesetStructureSpec(tilesetKey) || {};
    return {
        id,
        tilesetKey,
        name: spec.displayName || id,
        faction: spec.faction || 'ORDER',
        footprint: spec.footprint || [1, 1],
        heightMeters: spec.heightMeters ?? 3.0,
        silhouette: spec.silhouette || '',
        materialPrimary: spec.materialPrimary || 'runicStone',
        materialAccent: spec.materialAccent || 'wroughtIron',
        mountSlotCount: spec.wallMountSlots ?? 0,
        mountHeightOffset: spec.mountHeightOffset ?? spec.heightMeters ?? 1.6,
        isShiftAnchor: Boolean(spec.isShiftAnchor),
        armsVillagersOnAlert: Boolean(spec.armsVillagersOnAlert),
        spawnType: spec.spawnType || null,
        wardRadiusMeters: spec.barrierRadiusMeters ?? combatStats.wardRadiusMeters ?? 0,
        ...combatStats
    };
}

export const STRUCTURE_CATALOG = {
    ANCHOR_STONE: buildCatalogEntry('ANCHOR_STONE', 'anchor_stone_monolith', {
        maxTier: 3,
        baseHp: 1200,
        hpPerTier: 600,
        barrierRadiusBase: 36.0,
        barrierRadiusPerTier: 12.0,
        fuelCapacityBase: 100,
        fuelCapacityPerTier: 50,
        fuelDrainPerSecond: 0.15,
        costs: { ironbark_dust: 0, siphon_resin: 10, basalt_tablets: 25, barrier_fuel: 15 }
    }),
    WALL_SEGMENT: buildCatalogEntry('WALL_SEGMENT', 'palisade_wall', {
        maxTier: 3,
        baseHp: 350,
        hpPerTier: 225,
        defenseBonus: 0.25,
        costs: { ironbark_dust: 8, siphon_resin: 4, basalt_tablets: 6, barrier_fuel: 0 }
    }),
    GATEHOUSE: buildCatalogEntry('GATEHOUSE', 'palisade_wall', {
        name: 'Chain-Bound Palisade Gatehouse',
        maxTier: 3,
        baseHp: 450,
        hpPerTier: 250,
        defenseBonus: 0.30,
        costs: { ironbark_dust: 10, siphon_resin: 6, basalt_tablets: 8, barrier_fuel: 2 }
    }),
    WATCHTOWER: buildCatalogEntry('WATCHTOWER', 'runic_watchtower', {
        maxTier: 3,
        baseHp: 280,
        hpPerTier: 160,
        defenseBonus: 0.40,
        sightRadiusMeters: 38.0,
        stealthDetectionRadius: 22.0,
        costs: { ironbark_dust: 12, siphon_resin: 8, basalt_tablets: 5, barrier_fuel: 3 }
    }),
    BARRIER_PYLON: buildCatalogEntry('BARRIER_PYLON', 'barrier_pylon', {
        maxTier: 3,
        baseHp: 240,
        hpPerTier: 140,
        wardSlowFactor: 0.35,
        wardDpsToMonsters: 6.0,
        fuelUpkeepPerSecond: 0.05,
        costs: { ironbark_dust: 6, siphon_resin: 10, basalt_tablets: 10, barrier_fuel: 8 }
    }),
    OCP_OUTPOST: buildCatalogEntry('OCP_OUTPOST', 'ocp_containment_post', {
        maxTier: 3,
        baseHp: 400,
        hpPerTier: 200,
        defenseBonus: 0.35,
        entropySuppressionRate: 0.08,
        costs: { ironbark_dust: 10, siphon_resin: 12, basalt_tablets: 14, barrier_fuel: 6 }
    }),
    SCRIBAL_ARMORY: buildCatalogEntry('SCRIBAL_ARMORY', 'scribal_armory', {
        maxTier: 3,
        baseHp: 320,
        hpPerTier: 160,
        defenseBonus: 0.15,
        costs: { ironbark_dust: 12, siphon_resin: 6, basalt_tablets: 10, barrier_fuel: 4 }
    }),
    STARVATION_CAIRN: buildCatalogEntry('STARVATION_CAIRN', 'starvation_cairn', {
        maxTier: 3,
        baseHp: 380,
        hpPerTier: 190,
        defenseBonus: 0.0,
        costs: { ironbark_dust: 0, siphon_resin: 0, basalt_tablets: 0, barrier_fuel: 0 }
    })
};

// Also allow lookup by raw tileset key (e.g. 'anchor_stone_monolith', 'palisade_wall', etc.)
for (const entry of Object.values(STRUCTURE_CATALOG)) {
    if (entry.tilesetKey && !STRUCTURE_CATALOG[entry.tilesetKey]) {
        STRUCTURE_CATALOG[entry.tilesetKey] = entry;
    }
}

export class StructureManager {
    constructor(options = {}) {
        this.gridCellSize = options.gridCellSize || TILESET?.artDirection?.gridUnitMeters || 2.0;
        this.origin = { x: options.originX || 0, z: options.originZ || 0 };
        this.structures = new Map();
        this.gridIndex = new Map();
        this.anchorStoneId = null;
        this.alertActive = false;
        this._nextId = 1;

        this.stockpile = {
            ironbark_dust: 120,
            siphon_resin: 85,
            basalt_tablets: 90,
            barrier_fuel: 60,
            pale_cap_extract: 25
        };

        this.systemicTelemetry = {
            orderPreservationScalar: 50.0,
            sovereignHarvestScalar: 10.0,
            frameworkVectorPressure: 0.0
        };

        this.sceneGroup = null;
        this._initSceneGroupIfAvailable();
    }

    _initSceneGroupIfAvailable() {
        const THREE = rootScope.THREE;
        if (THREE && rootScope.GameCore?.scene && !this.sceneGroup) {
            this.sceneGroup = new THREE.Group();
            this.sceneGroup.name = 'SettlementStructuresGroup';
            rootScope.GameCore.scene.add(this.sceneGroup);
        }
    }

    _applyEngineLaw5Nudge(scalarKey, deltaAmount) {
        const scalarFlux = deltaAmount * 0.70;
        const vectorPressure = Math.abs(deltaAmount) * 0.30;
        if (typeof this.systemicTelemetry[scalarKey] === 'number') {
            this.systemicTelemetry[scalarKey] = Math.max(0, this.systemicTelemetry[scalarKey] + scalarFlux);
        }
        this.systemicTelemetry.frameworkVectorPressure = Number(
            (this.systemicTelemetry.frameworkVectorPressure + vectorPressure).toFixed(4)
        );
    }

    worldToGrid(wx, wz) {
        const gx = Math.round((wx - this.origin.x) / this.gridCellSize);
        const gz = Math.round((wz - this.origin.z) / this.gridCellSize);
        return { gx, gz, key: `${gx},${gz}` };
    }

    gridToWorld(gx, gz) {
        const wx = this.origin.x + gx * this.gridCellSize;
        const wz = this.origin.z + gz * this.gridCellSize;
        const wy = rootScope.WorldGenerator?.getTerrainHeight?.(wx, wz) || 0;
        return { x: wx, y: Number.isFinite(wy) ? wy : 0, z: wz };
    }

    canAfford(costs, tierMultiplier = 1.0) {
        if (!costs) return true;
        for (const [resKey, baseAmt] of Object.entries(costs)) {
            const req = Math.ceil(baseAmt * tierMultiplier);
            if ((this.stockpile[resKey] || 0) < req) return false;
        }
        return true;
    }

    deductCosts(costs, tierMultiplier = 1.0) {
        if (!this.canAfford(costs, tierMultiplier)) return false;
        for (const [resKey, baseAmt] of Object.entries(costs)) {
            const req = Math.ceil(baseAmt * tierMultiplier);
            this.stockpile[resKey] = Math.max(0, (this.stockpile[resKey] || 0) - req);
        }
        return true;
    }

    _buildMountSlots(typeDef, worldPos, tier = 1, rotationY = 0) {
        const baseSlots = typeDef.mountSlotCount || 0;
        if (baseSlots <= 0) return [];
        const totalSlots = typeDef.id === 'WALL_SEGMENT' ? baseSlots + (tier - 1) : baseSlots;
        const slots = [];
        const fpX = (typeDef.footprint?.[0] || 1) * this.gridCellSize;
        const spread = fpX * 0.7;
        const cosR = Math.cos(rotationY);
        const sinR = Math.sin(rotationY);
        const mountOffset = typeDef.mountHeightOffset ?? typeDef.heightMeters;

        for (let i = 0; i < totalSlots; i++) {
            const norm = totalSlots === 1 ? 0 : (i / (totalSlots - 1)) - 0.5;
            const localX = norm * spread;
            const slotX = worldPos.x + localX * cosR;
            const slotZ = worldPos.z + localX * sinR;
            const slotY = worldPos.y + mountOffset + (tier - 1) * 0.4;
            slots.push({
                slotIndex: i,
                occupantId: null,
                occupantName: null,
                occupantRole: null,
                position: { x: Number(slotX.toFixed(2)), y: Number(slotY.toFixed(2)), z: Number(slotZ.toFixed(2)) },
                defenseBonus: Number(((typeDef.defenseBonus || 0.25) + (tier - 1) * 0.1).toFixed(2))
            });
        }
        return slots;
    }

    placeStructure(typeId, gx, gz, options = {}) {
        const typeDef = STRUCTURE_CATALOG[typeId];
        if (!typeDef) {
            return { ok: false, reason: `Unknown structure type: ${typeId}` };
        }

        const key = `${gx},${gz}`;
        if (this.gridIndex.has(key)) {
            return { ok: false, reason: `Grid cell (${gx}, ${gz}) is already occupied.` };
        }

        const freePlacement = options.free === true;
        if (!freePlacement && !this.canAfford(typeDef.costs, 1.0)) {
            return { ok: false, reason: `Insufficient canonical monopoly materials for ${typeDef.name}.` };
        }

        if (!freePlacement) {
            this.deductCosts(typeDef.costs, 1.0);
        }

        const tier = options.tier || 1;
        const rotationY = options.rotationY || 0;
        const worldPos = this.gridToWorld(gx, gz);
        const maxHp = typeDef.baseHp + (tier - 1) * typeDef.hpPerTier;
        const structureId = `struct_${typeId.toLowerCase()}_${this._nextId++}`;

        const record = {
            id: structureId,
            type: typeDef.id,
            tilesetKey: typeDef.tilesetKey,
            name: typeDef.name,
            faction: typeDef.faction,
            footprint: typeDef.footprint,
            heightMeters: typeDef.heightMeters,
            materialPrimary: typeDef.materialPrimary,
            materialAccent: typeDef.materialAccent,
            primaryMaterialSpec: getTilesetMaterial(typeDef.materialPrimary),
            accentMaterialSpec: getTilesetMaterial(typeDef.materialAccent),
            tier,
            maxTier: typeDef.maxTier,
            gx,
            gz,
            gridKey: key,
            position: worldPos,
            rotationY,
            hp: maxHp,
            maxHp,
            isDestroyed: false,
            isAnchored: true,
            armsVillagersOnAlert: Boolean(typeDef.armsVillagersOnAlert),
            spawnType: typeDef.spawnType || null,
            mountSlots: this._buildMountSlots(typeDef, worldPos, tier, rotationY),
            isOpen: typeDef.id === 'GATEHOUSE' ? Boolean(options.isOpen) : false,
            barrierFuel: typeDef.id === 'ANCHOR_STONE' ? (options.barrierFuel ?? typeDef.fuelCapacityBase) : 0,
            maxBarrierFuel: typeDef.id === 'ANCHOR_STONE' ? (typeDef.fuelCapacityBase + (tier - 1) * typeDef.fuelCapacityPerTier) : 0,
            chainIntegrity: 100,
            barrierRadius: typeDef.id === 'ANCHOR_STONE'
                ? (typeDef.barrierRadiusBase + (tier - 1) * typeDef.barrierRadiusPerTier)
                : (typeDef.wardRadiusMeters || 0),
            isShattered: false,
            visualMesh: null
        };

        this.structures.set(structureId, record);
        this.gridIndex.set(key, structureId);

        if (typeId === 'ANCHOR_STONE') {
            this.anchorStoneId = structureId;
        }

        this._applyEngineLaw5Nudge('orderPreservationScalar', 4.0 * tier);
        this._spawnVisualMeshIfAvailable(record, typeDef);

        rootScope.EventBus?.emit?.('STRUCTURE_PLACED', { structure: record });
        return { ok: true, structure: record };
    }

    upgradeStructure(structureId, options = {}) {
        const struct = this.structures.get(structureId);
        if (!struct || struct.isDestroyed) {
            return { ok: false, reason: 'Structure not found or destroyed.' };
        }
        const typeDef = STRUCTURE_CATALOG[struct.type];
        if (struct.tier >= struct.maxTier) {
            return { ok: false, reason: `${struct.name} is already at maximum Tier (${struct.maxTier}).` };
        }

        const nextTier = struct.tier + 1;
        const costMult = 1.0 + (nextTier - 1) * 0.75;
        if (!options.free && !this.deductCosts(typeDef.costs, costMult)) {
            return { ok: false, reason: `Insufficient canonical resources to upgrade ${struct.name} to Tier ${nextTier}.` };
        }

        const existingOccupants = struct.mountSlots
            .filter(s => s.occupantId !== null)
            .map(s => ({ id: s.occupantId, name: s.occupantName, role: s.occupantRole }));

        struct.tier = nextTier;
        struct.maxHp = typeDef.baseHp + (nextTier - 1) * typeDef.hpPerTier;
        struct.hp = struct.maxHp;

        if (struct.type === 'ANCHOR_STONE') {
            struct.maxBarrierFuel = typeDef.fuelCapacityBase + (nextTier - 1) * typeDef.fuelCapacityPerTier;
            struct.barrierRadius = typeDef.barrierRadiusBase + (nextTier - 1) * typeDef.barrierRadiusPerTier;
        }

        struct.mountSlots = this._buildMountSlots(typeDef, struct.position, nextTier, struct.rotationY);
        existingOccupants.forEach((occ, idx) => {
            if (struct.mountSlots[idx]) {
                struct.mountSlots[idx].occupantId = occ.id;
                struct.mountSlots[idx].occupantName = occ.name;
                struct.mountSlots[idx].occupantRole = occ.role;
            }
        });

        this._applyEngineLaw5Nudge('orderPreservationScalar', 6.0);
        this._updateVisualMeshScale(struct);

        rootScope.EventBus?.emit?.('STRUCTURE_UPGRADED', { structure: struct });
        return { ok: true, structure: struct };
    }

    mountUnitToStructure(unit, structureId) {
        const struct = this.structures.get(structureId);
        if (!struct || struct.isDestroyed) {
            return { ok: false, reason: 'Structure unavailable for mounting.' };
        }
        if (!struct.mountSlots || struct.mountSlots.length === 0) {
            return { ok: false, reason: `${struct.name} has no defensive mounting slots.` };
        }

        const unitId = typeof unit === 'object' ? unit.id : String(unit);
        const unitName = typeof unit === 'object' ? (unit.name || unitId) : unitId;
        const unitRole = typeof unit === 'object' ? (unit.role || unit.career || 'villager_militia') : 'villager_militia';

        this.dismountUnit(unitId);

        const openSlot = struct.mountSlots.find(s => s.occupantId === null);
        if (!openSlot) {
            return { ok: false, reason: `All ${struct.mountSlots.length} wall slots on ${struct.name} are occupied.` };
        }

        openSlot.occupantId = unitId;
        openSlot.occupantName = unitName;
        openSlot.occupantRole = unitRole;

        if (typeof unit === 'object') {
            unit.mountedStructureId = struct.id;
            unit.mountedSlotIndex = openSlot.slotIndex;
            unit.mountedDefenseBonus = openSlot.defenseBonus;
            if (unit.visual && unit.visual.position) {
                unit.visual.position.set(openSlot.position.x, openSlot.position.y, openSlot.position.z);
            }
        }

        rootScope.EventBus?.emit?.('UNIT_MOUNTED_WALL', {
            unitId,
            unitName,
            structureId: struct.id,
            slotIndex: openSlot.slotIndex,
            position: openSlot.position
        });

        return { ok: true, slot: openSlot, structure: struct };
    }

    dismountUnit(unitOrId) {
        const unitId = typeof unitOrId === 'object' ? unitOrId.id : String(unitOrId);
        for (const struct of this.structures.values()) {
            for (const slot of struct.mountSlots) {
                if (slot.occupantId === unitId) {
                    slot.occupantId = null;
                    slot.occupantName = null;
                    slot.occupantRole = null;
                    if (typeof unitOrId === 'object') {
                        unitOrId.mountedStructureId = null;
                        unitOrId.mountedSlotIndex = null;
                        unitOrId.mountedDefenseBonus = 0;
                    }
                    return { ok: true, structureId: struct.id, slotIndex: slot.slotIndex };
                }
            }
        }
        return { ok: false, reason: 'Unit was not mounted on any structure.' };
    }

    mobilizeVillagersToWalls(units = []) {
        this.alertActive = true;
        const mountedAssignments = [];

        const priorityOrder = { WATCHTOWER: 1, GATEHOUSE: 2, OCP_OUTPOST: 3, WALL_SEGMENT: 4 };
        const defensibleStructures = Array.from(this.structures.values())
            .filter(s => !s.isDestroyed && s.mountSlots && s.mountSlots.some(sl => sl.occupantId === null))
            .sort((a, b) => (priorityOrder[a.type] || 9) - (priorityOrder[b.type] || 9));

        for (const unit of units) {
            if (!unit || unit.hp <= 0 || unit.isDispatchedOutside) continue;
            let assigned = false;
            for (const struct of defensibleStructures) {
                const res = this.mountUnitToStructure(unit, struct.id);
                if (res.ok) {
                    mountedAssignments.push({
                        unitId: unit.id,
                        unitName: unit.name || unit.id,
                        structureId: struct.id,
                        structureType: struct.type,
                        slotIndex: res.slot.slotIndex,
                        position: res.slot.position
                    });
                    assigned = true;
                    break;
                }
            }
            if (!assigned) break;
        }

        rootScope.EventBus?.emit?.('SETTLEMENT_WALLS_MANNED', {
            alertActive: this.alertActive,
            assignedCount: mountedAssignments.length,
            assignments: mountedAssignments
        });

        return mountedAssignments;
    }

    refuelAnchorStone(fuelUnits = 15) {
        const anchor = this.getAnchorStone();
        if (!anchor || anchor.isDestroyed || anchor.isShattered) {
            return { ok: false, reason: 'Anchor-Stone is shattered or missing.' };
        }
        const added = Math.max(0, Number(fuelUnits) || 0);
        anchor.barrierFuel = Math.min(anchor.maxBarrierFuel, anchor.barrierFuel + added);
        anchor.chainIntegrity = Math.min(100, anchor.chainIntegrity + Math.min(15, added * 0.5));
        this._applyEngineLaw5Nudge('orderPreservationScalar', added * 0.5);

        rootScope.EventBus?.emit?.('ANCHOR_STONE_REFUELED', {
            barrierFuel: anchor.barrierFuel,
            maxBarrierFuel: anchor.maxBarrierFuel,
            chainIntegrity: anchor.chainIntegrity
        });
        return { ok: true, barrierFuel: anchor.barrierFuel, chainIntegrity: anchor.chainIntegrity };
    }

    applyDamageToStructure(structureId, damageAmount, attackerMeta = {}) {
        const struct = this.structures.get(structureId);
        if (!struct || struct.isDestroyed) {
            return { ok: false, destroyed: true };
        }

        const dmg = Math.max(1, Number(damageAmount) || 0);
        struct.hp = Math.max(0, struct.hp - dmg);

        if (struct.type === 'ANCHOR_STONE') {
            const fuelDrain = attackerMeta.isPaleSovereign ? dmg * 0.12 : dmg * 0.04;
            struct.barrierFuel = Math.max(0, Number((struct.barrierFuel - fuelDrain).toFixed(2)));
            struct.chainIntegrity = Math.max(0, Number(((struct.hp / struct.maxHp) * 100).toFixed(1)));
            this._applyEngineLaw5Nudge('sovereignHarvestScalar', dmg * 0.08);
        }

        if (struct.hp <= 0) {
            struct.isDestroyed = true;
            for (const slot of struct.mountSlots) {
                slot.occupantId = null;
                slot.occupantName = null;
                slot.occupantRole = null;
            }
            if (struct.type === 'ANCHOR_STONE') {
                struct.isShattered = true;
                struct.chainIntegrity = 0;
                struct.barrierFuel = 0;
                this._applyEngineLaw5Nudge('sovereignHarvestScalar', 35.0);
                rootScope.EventBus?.emit?.('ANCHOR_STONE_SHATTERED', {
                    structureId: struct.id,
                    attacker: attackerMeta.attackerName || 'The Pale Sovereign'
                });
            }
            if (struct.visualMesh && this.sceneGroup) {
                this.sceneGroup.remove(struct.visualMesh);
            }
            rootScope.EventBus?.emit?.('STRUCTURE_DESTROYED', { structure: struct, attackerMeta });
        }

        return {
            ok: true,
            structureId: struct.id,
            remainingHp: struct.hp,
            destroyed: struct.isDestroyed,
            isShattered: struct.isShattered
        };
    }

    getAnchorStone() {
        return this.anchorStoneId ? this.structures.get(this.anchorStoneId) || null : null;
    }

    isPositionProtectedByBarrier(wx, wz) {
        const anchor = this.getAnchorStone();
        if (anchor && !anchor.isDestroyed && !anchor.isShattered && anchor.barrierFuel > 0) {
            const dist = Math.hypot(wx - anchor.position.x, wz - anchor.position.z);
            if (dist <= anchor.barrierRadius) return true;
        }
        for (const struct of this.structures.values()) {
            if (struct.type === 'BARRIER_PYLON' && !struct.isDestroyed && anchor && anchor.barrierFuel > 0) {
                const d = Math.hypot(wx - struct.position.x, wz - struct.position.z);
                if (d <= struct.barrierRadius) return true;
            }
        }
        return false;
    }

    seedDefaultSettlementPerimeter(centerX = 0, centerZ = 0) {
        this.origin = { x: centerX, z: centerZ };
        this.structures.clear();
        this.gridIndex.clear();
        this.anchorStoneId = null;

        this.placeStructure('ANCHOR_STONE', 0, 0, { free: true, tier: 1, barrierFuel: 80 });
        this.placeStructure('GATEHOUSE', 0, 3, { free: true, tier: 1, isOpen: true });
        this.placeStructure('GATEHOUSE', 0, -3, { free: true, tier: 1, isOpen: false });
        this.placeStructure('WATCHTOWER', 3, 3, { free: true, tier: 1 });
        this.placeStructure('WATCHTOWER', -3, 3, { free: true, tier: 1 });

        const wallCoords = [
            [-2, 3], [-1, 3], [1, 3], [2, 3],
            [-3, -3], [-2, -3], [-1, -3], [1, -3], [2, -3], [3, -3],
            [-3, -2], [-3, -1], [-3, 0], [-3, 1], [-3, 2],
            [3, -2], [3, -1], [3, 0], [3, 1], [3, 2]
        ];
        for (const [gx, gz] of wallCoords) {
            this.placeStructure('WALL_SEGMENT', gx, gz, { free: true, tier: 1 });
        }

        this.placeStructure('BARRIER_PYLON', -1, 1, { free: true, tier: 1 });
        this.placeStructure('BARRIER_PYLON', 1, 1, { free: true, tier: 1 });
        this.placeStructure('OCP_OUTPOST', 1, -1, { free: true, tier: 1 });
        this.placeStructure('SCRIBAL_ARMORY', -1, -1, { free: true, tier: 1 });

        applyTilesetLightingState('normalCycle');
        return this.getTelemetry();
    }

    setShiftLightingCycle(cycleKey = 'normalCycle') {
        return applyTilesetLightingState(cycleKey);
    }

    update(delta = 1 / 60) {
        const anchor = this.getAnchorStone();
        if (!anchor || anchor.isDestroyed || anchor.isShattered) return;

        let activePylons = 0;
        for (const struct of this.structures.values()) {
            if (struct.type === 'BARRIER_PYLON' && !struct.isDestroyed) activePylons++;
        }

        const baseDrain = STRUCTURE_CATALOG.ANCHOR_STONE.fuelDrainPerSecond;
        const pylonDrain = activePylons * STRUCTURE_CATALOG.BARRIER_PYLON.fuelUpkeepPerSecond;
        const totalDrain = (baseDrain + pylonDrain) * delta;

        if (anchor.barrierFuel > 0) {
            anchor.barrierFuel = Math.max(0, anchor.barrierFuel - totalDrain);
        }
    }

    _spawnVisualMeshIfAvailable(record, typeDef) {
        const THREE = rootScope.THREE;
        if (!THREE) return;
        this._initSceneGroupIfAvailable();
        if (!this.sceneGroup) return;

        const fpX = (typeDef.footprint?.[0] || 1) * this.gridCellSize * 0.92;
        const fpZ = (typeDef.footprint?.[1] || 1) * this.gridCellSize * 0.92;
        const h = typeDef.heightMeters;

        const primaryMat = getTilesetMaterial(typeDef.materialPrimary);
        const accentMat = getTilesetMaterial(typeDef.materialAccent);

        const group = new THREE.Group();
        group.name = `${record.id}_${typeDef.tilesetKey}`;

        const bodyGeo = new THREE.BoxGeometry(fpX, h, fpZ);
        const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
        bodyMesh.position.y = h * 0.5;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        if (accentMat) {
            const accentGeo = new THREE.BoxGeometry(fpX * 0.35, h * 0.25, fpZ * 0.35);
            const accentMesh = new THREE.Mesh(accentGeo, accentMat);
            accentMesh.position.y = h * 0.82;
            group.add(accentMesh);
        }

        group.position.set(record.position.x, record.position.y, record.position.z);
        group.rotation.y = record.rotationY;
        record.visualMesh = group;
        this.sceneGroup.add(group);
    }

    _updateVisualMeshScale(record) {
        if (!record.visualMesh) return;
        const scaleY = 1.0 + (record.tier - 1) * 0.22;
        record.visualMesh.scale.set(1.0, scaleY, 1.0);
    }

    getTelemetry() {
        let totalStructures = 0;
        let totalMountSlots = 0;
        let occupiedMountSlots = 0;
        for (const s of this.structures.values()) {
            if (s.isDestroyed) continue;
            totalStructures++;
            for (const sl of s.mountSlots) {
                totalMountSlots++;
                if (sl.occupantId !== null) occupiedMountSlots++;
            }
        }
        const anchor = this.getAnchorStone();
        return {
            totalStructures,
            totalMountSlots,
            occupiedMountSlots,
            alertActive: this.alertActive,
            anchorStone: anchor
                ? {
                    id: anchor.id,
                    tier: anchor.tier,
                    hp: anchor.hp,
                    maxHp: anchor.maxHp,
                    barrierFuel: Number(anchor.barrierFuel.toFixed(2)),
                    maxBarrierFuel: anchor.maxBarrierFuel,
                    chainIntegrity: anchor.chainIntegrity,
                    barrierRadius: anchor.barrierRadius,
                    isShattered: anchor.isShattered
                }
                : null,
            stockpile: { ...this.stockpile },
            systemicTelemetry: { ...this.systemicTelemetry }
        };
    }
}

rootScope.StructureManager = rootScope.StructureManager || new StructureManager();

export default rootScope.StructureManager;
