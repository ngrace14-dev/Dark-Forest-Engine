// ============================================================================
// Dark Forest Engine - Woodland Squad Dispatch & Huntsman Cultivation System
// File: src/systems/squad_cultivation_system.js
// Strictly reads actor silhouettes, palettes, and status visuals from assets/tileset.json
// ============================================================================

import {
    TILESET,
    getTilesetActorSpec,
    getTilesetStatusVisual,
    applyTilesetLightingState
} from '../core/tileset_bridge.js';
import StructureManager from './structure_manager.js';

const rootScope = typeof window !== 'undefined' ? window : globalThis;

export class SquadCultivationSystem {
    constructor(options = {}) {
        this.structureManager = options.structureManager || StructureManager;
        this.actors = new Map();
        this.dispatchedSquads = new Map();
        this.probingPacks = new Map();
        this._nextActorId = 1;
        this._nextSquadId = 1;
        this._nextPackId = 1;

        this.lastHarvestedStats = {
            actorId: 'baseline_initiation',
            actorName: 'Previous Bound Victim',
            martial: 12,
            survival: 10,
            storyDensity: 25,
            compositeScore: 47
        };

        this.huntsmanState = {
            actorId: null,
            activeTargetId: null,
            orbAttachedTargetId: null,
            harvestsCompleted: 0,
            evolvedVampires: 0,
            evolvedBerzerkers: 0
        };

        this.systemicTelemetry = {
            orderPreservationScalar: 50.0,
            sovereignCultivationScalar: 20.0,
            frameworkVectorPressure: 0.0
        };
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

    spawnActor(tilesetActorKey, overrides = {}) {
        const spec = getTilesetActorSpec(tilesetActorKey);
        if (!spec) {
            throw new Error(`Actor key "${tilesetActorKey}" not found in assets/tileset.json`);
        }

        const id = overrides.id || `actor_${tilesetActorKey}_${this._nextActorId++}`;
        const maxHp = overrides.maxHp ?? (tilesetActorKey === 'pale_sovereign' ? 900 : tilesetActorKey === 'the_huntsman' ? 450 : 120);

        const actor = {
            id,
            tilesetActorKey,
            name: overrides.name || spec.displayName,
            role: spec.role,
            scale: spec.scale,
            silhouette: spec.silhouette,
            primaryColor: spec.primaryColor,
            accentColor: spec.accentColor,
            faction: spec.role.startsWith('SOVEREIGN') ? 'PALE_SOVEREIGN' : 'ORDER',
            hp: overrides.hp ?? maxHp,
            maxHp,
            martial: overrides.martial ?? (tilesetActorKey === 'jess_nedaf' ? 24 : tilesetActorKey === 'adventurer_dispatch' ? 16 : 10),
            survival: overrides.survival ?? (tilesetActorKey === 'adventurer_dispatch' ? 18 : 10),
            storyDensity: overrides.storyDensity ?? (tilesetActorKey === 'jess_nedaf' ? 40 : 15),
            position: overrides.position ? { ...overrides.position } : { x: 0, y: 0, z: 0 },
            isDispatchedOutside: Boolean(overrides.isDispatchedOutside),
            isAnchored: overrides.isAnchored ?? true,
            isStarving: Boolean(overrides.isStarving),
            isFreezing: Boolean(overrides.isFreezing),
            evolutionStage: overrides.evolutionStage || (tilesetActorKey === 'lesser_wendigo' ? 'LESSER' : 'NONE'),
            huntsmanMarked: false,
            scornHoursRemaining: 0,
            isHostileOrNonInteractiveToAllies: false,
            hasOrbWitness: false,
            cultivationGrowthMultiplier: 1.0,
            cultivationInterventions: 0,
            activeStatusVisuals: {}
        };

        this._refreshActorStatusVisuals(actor);
        this.actors.set(id, actor);

        if (tilesetActorKey === 'the_huntsman') {
            this.huntsmanState.actorId = id;
        }

        return actor;
    }

    computeActorCompositeStat(actor) {
        if (!actor) return 0;
        return Number(((actor.martial || 0) + (actor.survival || 0) + (actor.storyDensity || 0)).toFixed(2));
    }

    _refreshActorStatusVisuals(actor) {
        if (!actor) return;
        const visuals = {};

        if (actor.huntsmanMarked) {
            const markSpec = getTilesetStatusVisual('HUNTSMAN_MARK');
            if (markSpec) visuals.HUNTSMAN_MARK = { ...markSpec };
        }

        if (actor.scornHoursRemaining > 0) {
            const scornSpec = getTilesetStatusVisual('HUNTSMAN_SCORN_24H');
            if (scornSpec) visuals.HUNTSMAN_SCORN_24H = { ...scornSpec, hoursRemaining: actor.scornHoursRemaining };
        }

        if (actor.storyDensity >= 45 || this.computeActorCompositeStat(actor) > this.lastHarvestedStats.compositeScore) {
            const highDensitySpec = getTilesetStatusVisual('STORY_DENSITY_HIGH');
            if (highDensitySpec) visuals.STORY_DENSITY_HIGH = { ...highDensitySpec };
        }

        actor.activeStatusVisuals = visuals;
    }

    /**
     * Doctrine Hierarchy & Career Integrity:
     * Only adventurer_dispatch (or Order Leaders) may dispatch outside the walls into the forest.
     * Civilians / villager_militia remain inside walls and cannot be dispatched.
     */
    dispatchOrderSquad(memberIds = [], missionType = 'BARRIER_FUEL_RUN', targetCoord = { x: 45, z: 45 }) {
        const validMembers = [];
        for (const id of memberIds) {
            const actor = this.actors.get(id);
            if (!actor || actor.hp <= 0) continue;
            if (actor.tilesetActorKey === 'villager_militia') {
                return {
                    ok: false,
                    reason: `Career Integrity Violation: Civilian/Wall Guard "${actor.name}" cannot dispatch into the deep forest.`
                };
            }
            if (actor.scornHoursRemaining > 0) {
                return {
                    ok: false,
                    reason: `Huntsman's Scorn Active: "${actor.name}" is socially isolated/hostile to all allies for ${actor.scornHoursRemaining}h.`
                };
            }
            validMembers.push(actor);
        }

        if (validMembers.length === 0) {
            return { ok: false, reason: 'No eligible Adventurer/Order units available for dispatch.' };
        }

        const squadId = `squad_order_${this._nextSquadId++}`;
        for (const m of validMembers) {
            m.isDispatchedOutside = true;
            m.isAnchored = false;
            m.position = { x: targetCoord.x, y: 0, z: targetCoord.z };
            m.storyDensity += 6 * m.cultivationGrowthMultiplier;
            this._refreshActorStatusVisuals(m);
        }

        const cargoYield = missionType === 'RUNIC_RELIC_EXTRACTION'
            ? { basalt_tablets: 12, siphon_resin: 8, barrier_fuel: 6 }
            : { barrier_fuel: 20, ironbark_dust: 14, siphon_resin: 6 };

        const squad = {
            id: squadId,
            missionType,
            memberIds: validMembers.map(m => m.id),
            targetCoord: { ...targetCoord },
            cargoYield,
            status: 'IN_FOREST'
        };

        this.dispatchedSquads.set(squadId, squad);
        this._applyEngineLaw5Nudge('orderPreservationScalar', 5.0);
        rootScope.EventBus?.emit?.('ORDER_SQUAD_DISPATCHED', { squad });
        return { ok: true, squad };
    }

    /**
     * Completes an Order squad return trek, depositing canonical monopoly cargo & refueling the Anchor-Stone.
     */
    completeSquadExpedition(squadId) {
        const squad = this.dispatchedSquads.get(squadId);
        if (!squad || squad.status !== 'IN_FOREST') {
            return { ok: false, reason: 'Squad not active in forest.' };
        }

        squad.status = 'RETURNED';
        for (const id of squad.memberIds) {
            const actor = this.actors.get(id);
            if (!actor || actor.hp <= 0) continue;
            actor.isDispatchedOutside = false;
            actor.isAnchored = true;
            actor.position = { x: 0, y: 0, z: 0 };
            actor.martial += 2 * actor.cultivationGrowthMultiplier;
            actor.survival += 2 * actor.cultivationGrowthMultiplier;
            actor.storyDensity += 8 * actor.cultivationGrowthMultiplier;
            this._refreshActorStatusVisuals(actor);
        }

        if (this.structureManager) {
            for (const [resKey, amt] of Object.entries(squad.cargoYield)) {
                this.structureManager.stockpile[resKey] = (this.structureManager.stockpile[resKey] || 0) + amt;
            }
            if (squad.cargoYield.barrier_fuel > 0) {
                this.structureManager.refuelAnchorStone(squad.cargoYield.barrier_fuel);
            }
        }

        this._applyEngineLaw5Nudge('orderPreservationScalar', 8.0);
        rootScope.EventBus?.emit?.('ORDER_SQUAD_RETURNED', { squad });
        return { ok: true, squad, cargoDelivered: squad.cargoYield };
    }

    /**
     * Pale Sovereign Loop: Spawns a probing pack of Lesser Feral Wendigos from a starvation_cairn or forest edge.
     */
    spawnProbingWendigoPack(packSize = 3, spawnCoord = { x: -32, z: 32 }) {
        const packId = `pack_wendigo_${this._nextPackId++}`;
        const memberIds = [];

        for (let i = 0; i < packSize; i++) {
            const wendigo = this.spawnActor('lesser_wendigo', {
                name: `Lesser Feral Wendigo #${this._nextActorId}`,
                position: { x: spawnCoord.x + i * 2, y: 0, z: spawnCoord.z },
                isDispatchedOutside: true,
                isAnchored: false
            });
            memberIds.push(wendigo.id);
        }

        const pack = {
            id: packId,
            memberIds,
            position: { ...spawnCoord },
            targetType: 'SETTLEMENT_PERIMETER',
            status: 'PROBING'
        };

        this.probingPacks.set(packId, pack);
        this._applyEngineLaw5Nudge('sovereignCultivationScalar', 4.0 * packSize);
        rootScope.EventBus?.emit?.('SOVEREIGN_PACK_SPAWNED', { pack });
        return { ok: true, pack };
    }

    resolvePackProbeOnSettlement(packId, targetStructureId = null) {
        const pack = this.probingPacks.get(packId);
        if (!pack || pack.status !== 'PROBING') {
            return { ok: false, reason: 'Pack unavailable.' };
        }

        const livingWendigos = pack.memberIds
            .map(id => this.actors.get(id))
            .filter(w => w && w.hp > 0);

        if (livingWendigos.length === 0) {
            pack.status = 'ELIMINATED';
            return { ok: false, reason: 'Pack has no living Wendigos.' };
        }

        let targetStruct = targetStructureId ? this.structureManager?.structures.get(targetStructureId) : null;
        if (!targetStruct && this.structureManager) {
            targetStruct = Array.from(this.structureManager.structures.values()).find(
                s => !s.isDestroyed && (s.type === 'WALL_SEGMENT' || s.type === 'GATEHOUSE')
            );
        }

        const rawDamage = livingWendigos.length * 38;
        let structureResult = null;
        if (targetStruct && this.structureManager) {
            const mannedSlots = (targetStruct.mountSlots || []).filter(sl => sl.occupantId !== null).length;
            const mitigation = Math.min(0.65, mannedSlots * 0.22);
            const finalDmg = Math.max(8, Math.round(rawDamage * (1 - mitigation)));
            structureResult = this.structureManager.applyDamageToStructure(targetStruct.id, finalDmg, {
                isPaleSovereign: false,
                attackerName: `Probing Wendigo Pack (${pack.id})`
            });

            if (mannedSlots > 0) {
                const counterDmgPerUnit = Math.round((mannedSlots * 35) / livingWendigos.length);
                for (const w of livingWendigos) {
                    w.hp = Math.max(0, w.hp - counterDmgPerUnit);
                }
            }
        }

        this._applyEngineLaw5Nudge('sovereignCultivationScalar', 6.0);
        return {
            ok: true,
            packId: pack.id,
            targetStructureId: targetStruct?.id || null,
            structureResult,
            survivingWendigos: livingWendigos.filter(w => w.hp > 0).length
        };
    }

    scoutHuntsmanTarget() {
        const baseline = this.lastHarvestedStats.compositeScore;
        const candidates = [];

        for (const actor of this.actors.values()) {
            if (!actor || actor.hp <= 0 || actor.faction !== 'ORDER') continue;
            const score = this.computeActorCompositeStat(actor);
            if (score > baseline) {
                candidates.push({ actor, score });
            }
        }

        if (candidates.length === 0) {
            return {
                ok: false,
                reason: `No candidate currently exceeds lastHarvestedStats (${baseline}).`
            };
        }

        candidates.sort((a, b) => b.score - a.score);
        const chosen = candidates[0].actor;

        if (this.huntsmanState.activeTargetId && this.huntsmanState.activeTargetId !== chosen.id) {
            const prev = this.actors.get(this.huntsmanState.activeTargetId);
            if (prev) {
                prev.huntsmanMarked = false;
                this._refreshActorStatusVisuals(prev);
            }
        }

        chosen.huntsmanMarked = true;
        this.huntsmanState.activeTargetId = chosen.id;
        this._refreshActorStatusVisuals(chosen);
        this._applyEngineLaw5Nudge('sovereignCultivationScalar', 8.0);

        rootScope.EventBus?.emit?.('HUNTSMAN_MARK_APPLIED', {
            targetId: chosen.id,
            targetName: chosen.name,
            compositeScore: candidates[0].score,
            baselineRequired: baseline,
            visualSpec: chosen.activeStatusVisuals.HUNTSMAN_MARK
        });

        return {
            ok: true,
            target: chosen,
            compositeScore: candidates[0].score,
            baselineRequired: baseline
        };
    }

    executeHuntsmanCultivationBeatdown(targetId = null) {
        const resolvedId = targetId || this.huntsmanState.activeTargetId;
        const target = resolvedId ? this.actors.get(resolvedId) : null;
        if (!target || target.hp <= 0) {
            return { ok: false, reason: 'No valid marked target for Huntsman cultivation.' };
        }

        const score = this.computeActorCompositeStat(target);
        if (score <= this.lastHarvestedStats.compositeScore) {
            return {
                ok: false,
                reason: `Target composite score (${score}) does not exceed lastHarvestedStats (${this.lastHarvestedStats.compositeScore}).`
            };
        }

        this.structureManager?.dismountUnit?.(target);

        const fivePercentHp = Math.max(1, Math.round(target.maxHp * 0.05));
        target.hp = fivePercentHp;
        target.huntsmanMarked = true;
        target.hasOrbWitness = true;
        target.scornHoursRemaining = 24.0;
        target.isHostileOrNonInteractiveToAllies = true;
        target.cultivationInterventions += 1;
        target.cultivationGrowthMultiplier = Number((1.0 + target.cultivationInterventions * 0.75).toFixed(2));

        target.martial = Number((target.martial + 4 * target.cultivationGrowthMultiplier).toFixed(2));
        target.survival = Number((target.survival + 5 * target.cultivationGrowthMultiplier).toFixed(2));
        target.storyDensity = Number((target.storyDensity + 12 * target.cultivationGrowthMultiplier).toFixed(2));

        this.huntsmanState.activeTargetId = target.id;
        this.huntsmanState.orbAttachedTargetId = target.id;
        this._refreshActorStatusVisuals(target);
        this._applyEngineLaw5Nudge('sovereignCultivationScalar', 15.0);

        rootScope.EventBus?.emit?.('HUNTSMAN_SCORN_INFLICTED', {
            targetId: target.id,
            targetName: target.name,
            remainingHp: target.hp,
            scornHoursRemaining: target.scornHoursRemaining,
            cultivationGrowthMultiplier: target.cultivationGrowthMultiplier,
            visualSpec: target.activeStatusVisuals.HUNTSMAN_SCORN_24H
        });

        return {
            ok: true,
            target,
            remainingHp: target.hp,
            scornHoursRemaining: target.scornHoursRemaining,
            cultivationGrowthMultiplier: target.cultivationGrowthMultiplier
        };
    }

    executeMacabreHarvest(targetId = null) {
        const resolvedId = targetId || this.huntsmanState.activeTargetId;
        const target = resolvedId ? this.actors.get(resolvedId) : null;
        if (!target || target.hp <= 0) {
            return { ok: false, reason: 'Target unavailable for Macabre Harvest.' };
        }

        const harvestedScore = this.computeActorCompositeStat(target);
        if (harvestedScore <= this.lastHarvestedStats.compositeScore) {
            return {
                ok: false,
                reason: `Target score (${harvestedScore}) must exceed lastHarvestedStats (${this.lastHarvestedStats.compositeScore}).`
            };
        }

        const previousBaseline = { ...this.lastHarvestedStats };
        this.lastHarvestedStats = {
            actorId: target.id,
            actorName: target.name,
            martial: target.martial,
            survival: target.survival,
            storyDensity: target.storyDensity,
            compositeScore: harvestedScore
        };

        target.hp = 0;
        target.huntsmanMarked = false;
        target.scornHoursRemaining = 0;
        target.isHostileOrNonInteractiveToAllies = false;
        this._refreshActorStatusVisuals(target);

        this.huntsmanState.harvestsCompleted += 1;
        this.huntsmanState.activeTargetId = null;

        let evolvedWendigo = null;
        for (const actor of this.actors.values()) {
            if (actor.tilesetActorKey === 'lesser_wendigo' && actor.hp > 0 && actor.evolutionStage === 'LESSER') {
                actor.evolutionStage = target.storyDensity >= 45 ? 'VAMPIRE' : 'BERZERKER';
                actor.maxHp *= 2;
                actor.hp = actor.maxHp;
                actor.martial += 12;
                evolvedWendigo = actor;
                if (actor.evolutionStage === 'VAMPIRE') this.huntsmanState.evolvedVampires += 1;
                else this.huntsmanState.evolvedBerzerkers += 1;
                break;
            }
        }

        this._applyEngineLaw5Nudge('sovereignCultivationScalar', harvestedScore * 0.4);
        rootScope.EventBus?.emit?.('MACABRE_HARVEST_COMPLETED', {
            harvestedTargetId: target.id,
            harvestedTargetName: target.name,
            newBaseline: this.lastHarvestedStats,
            previousBaseline,
            evolvedWendigoId: evolvedWendigo?.id || null,
            evolvedStage: evolvedWendigo?.evolutionStage || null
        });

        return {
            ok: true,
            harvestedTarget: target,
            newBaseline: this.lastHarvestedStats,
            evolvedWendigo
        };
    }

    triggerShiftWave() {
        applyTilesetLightingState('whiteVoidShift');
        const scatteredIds = [];
        const wendigoRebirthIds = [];

        for (const actor of this.actors.values()) {
            if (!actor || actor.hp <= 0 || actor.faction !== 'ORDER') continue;
            const insideBarrier = this.structureManager?.isPositionProtectedByBarrier?.(
                actor.position.x,
                actor.position.z
            );
            if (!insideBarrier && (!actor.isAnchored || actor.isDispatchedOutside)) {
                if (actor.isStarving && actor.isFreezing) {
                    const spec = getTilesetActorSpec('lesser_wendigo');
                    actor.tilesetActorKey = 'lesser_wendigo';
                    actor.role = spec?.role || 'SOVEREIGN_UNIT';
                    actor.faction = 'PALE_SOVEREIGN';
                    actor.silhouette = spec?.silhouette || actor.silhouette;
                    actor.primaryColor = spec?.primaryColor || '#27272a';
                    actor.accentColor = spec?.accentColor || '#991b1b';
                    actor.evolutionStage = 'LESSER';
                    wendigoRebirthIds.push(actor.id);
                } else {
                    actor.position = { x: 180, y: 0, z: -180 };
                    scatteredIds.push(actor.id);
                }
            }
        }

        return {
            ok: true,
            lightingState: 'whiteVoidShift',
            scatteredIds,
            wendigoRebirthIds
        };
    }

    tickHours(hours = 1.0) {
        const dtHours = Math.max(0, Number(hours) || 0);
        for (const actor of this.actors.values()) {
            if (!actor || actor.hp <= 0) continue;
            if (actor.scornHoursRemaining > 0) {
                actor.scornHoursRemaining = Math.max(0, Number((actor.scornHoursRemaining - dtHours).toFixed(2)));
                actor.storyDensity = Number((actor.storyDensity + dtHours * 0.5 * actor.cultivationGrowthMultiplier).toFixed(2));
                if (actor.scornHoursRemaining <= 0) {
                    actor.isHostileOrNonInteractiveToAllies = false;
                }
                this._refreshActorStatusVisuals(actor);
            }
        }
    }

    update(delta = 1 / 60) {
        const dayLen = rootScope.EngineParams?.dayLengthSeconds || 1200;
        const hoursPerSec = 24.0 / dayLen;
        this.tickHours(delta * hoursPerSec);
    }

    getTelemetry() {
        return {
            totalActors: this.actors.size,
            activeDispatchedSquads: Array.from(this.dispatchedSquads.values()).filter(s => s.status === 'IN_FOREST').length,
            activeProbingPacks: Array.from(this.probingPacks.values()).filter(p => p.status === 'PROBING').length,
            lastHarvestedStats: { ...this.lastHarvestedStats },
            huntsmanState: { ...this.huntsmanState },
            systemicTelemetry: { ...this.systemicTelemetry }
        };
    }
}

rootScope.SquadCultivationSystem = rootScope.SquadCultivationSystem || new SquadCultivationSystem();

export default rootScope.SquadCultivationSystem;
