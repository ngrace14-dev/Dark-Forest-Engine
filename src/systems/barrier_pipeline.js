/**
 * File: src_systems_barrier_pipeline.js
 * System 21: The Runic Barrier Fuel Pipeline (Bible §6, §10, Codex §I, §IV)
 * 
 * Implements the full extraction-to-burning cycle for runic barriers across
 * the 20 Forest & Mountain Ring settlements.
 */

class BarrierPipelineSystem {
    constructor() {
        this.pipelineMetrics = {
            botanicalReagents: 0,
            biologicalCatalysts: 0,
            stabilizers: 0,
            preFuelMatrix: 0,
            finishedFuelCrates: 0,
            containmentBreaches: 0,
            failedQuotas: 0,
            activeAnchorStones: 20
        };

        this.productionVats = new Map();
        
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => this.init());
            window.EventBus.on('HEARTBEAT_T1', () => this.tickDailyProduction());
            window.EventBus.on('HEARTBEAT_T7D', () => this.auditQuotas());
            window.EventBus.on('SHIFT_START', () => this.auditShiftSurvival());
        }
    }

    init() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit('UI_LOG', '⛽ [Pipeline] Canonical Runic Barrier Fuel Pipeline Active');
        }
        this.auditQuotas();
    }

    /**
     * Daily Production Tick: Harvests canonical reagents and executes synthesis chain.
     */
    tickDailyProduction() {
        if (typeof window === 'undefined' || !window.VillageManager?.villages) return;

        const villages = window.VillageManager.villages;
        const forestSettlements = villages.filter(v => v.region !== 'dunes' && !v.isDisconnected);

        // 1. REAGENT EXTRACTION AT PRODUCING HOUSES
        forestSettlements.forEach(v => {
            const house = v.nobleHouse;
            const pop = v.population?.current || 5000;
            const yieldScale = Math.max(1, Math.floor(pop / 2500));

            if (!v.stats.refinementStock) {
                v.stats.refinementStock = {
                    toxic_fungi: 0,
                    cold_resin: 0,
                    weevil_fluid: 0,
                    cardiac_catalysts: 0,
                    gator_leather: 0,
                    pale_caps: 0,
                    gloom_glass: 0,
                    pre_fuel_matrix: 0
                };
            }

            const stock = v.stats.refinementStock;

            // Botanical Reagents
            if (house === 'House Mire') stock.toxic_fungi = (stock.toxic_fungi || 0) + (10 * yieldScale);
            if (house === 'House Widow') stock.cold_resin = (stock.cold_resin || 0) + (8 * yieldScale);

            // Biological Catalysts
            if (house === 'House Blackwood') stock.weevil_fluid = (stock.weevil_fluid || 0) + (10 * yieldScale);
            if (house === 'House Cull') stock.cardiac_catalysts = (stock.cardiac_catalysts || 0) + (6 * yieldScale);
            if (house === 'House Hollow') stock.gator_leather = (stock.gator_leather || 0) + (8 * yieldScale);

            // Stabilizing Binders & Containment
            if (house === 'House Bleak') stock.pale_caps = (stock.pale_caps || 0) + (8 * yieldScale);
            if (house === 'House Gloom') stock.gloom_glass = (stock.gloom_glass || 0) + (12 * yieldScale);
        });

        // 2. MASTER SYNTHESIS: SHIP REAGENTS TO HOUSE SHADOWFEN
        const shadowfen = forestSettlements.find(v => v.nobleHouse === 'House Shadowfen');
        if (shadowfen) {
            this.processMasterSynthesis(shadowfen, forestSettlements);
        }

        // 3. ROYAL IMPRINTING: SHIP PRE-FUEL TO HOUSE AETHEL
        const capital = forestSettlements.find(v => v.capital || v.nobleHouse === 'House Aethel');
        if (capital && shadowfen) {
            this.processRoyalCrucible(capital, shadowfen);
        }

        // 4. ANCHOR-STONE BURN & INTEGRITY DECAY
        this.processAnchorBurn(forestSettlements);
    }

    /**
     * 21.4 Master Synthesis at The Iron Retort (House Shadowfen)
     * Cooks raw inputs into Pre-Fuel Matrix.
     */
    processMasterSynthesis(shadowfen, forestSettlements) {
        let totalFungi = 0, totalResin = 0, totalWeevil = 0, totalCardiac = 0, totalPaleCaps = 0, totalGlass = 0;

        forestSettlements.forEach(v => {
            const s = v.stats.refinementStock;
            if (!s) return;
            totalFungi += (s.toxic_fungi || 0); s.toxic_fungi = 0;
            totalResin += (s.cold_resin || 0); s.cold_resin = 0;
            totalWeevil += (s.weevil_fluid || 0); s.weevil_fluid = 0;
            totalCardiac += (s.cardiac_catalysts || 0); s.cardiac_catalysts = 0;
            totalPaleCaps += (s.pale_caps || 0); s.pale_caps = 0;
            totalGlass += (s.gloom_glass || 0); s.gloom_glass = 0;
        });

        // 1 of each primary reagent needed per batch
        const batches = Math.min(totalFungi, totalResin, totalWeevil, totalCardiac, totalPaleCaps);
        if (batches <= 0) return;

        // Gloom-Glass Containment Check
        const hasAlembics = totalGlass >= batches;
        const containmentSuccess = hasAlembics || Math.random() > 0.15;

        if (containmentSuccess) {
            const preFuelYield = batches * 4;
            shadowfen.stats.refinementStock.pre_fuel_matrix = (shadowfen.stats.refinementStock.pre_fuel_matrix || 0) + preFuelYield;
            this.pipelineMetrics.preFuelMatrix += preFuelYield;
        } else {
            this.pipelineMetrics.containmentBreaches++;
            if (window.EventBus) {
                window.EventBus.emit('UI_LOG', '⚠️ [PIPELINE] Containment breach at the Iron Retort! Volatile fumes scorched the vaults.');
            }
        }
    }

    /**
     * 21.6 Royal Crucible Imprinting at House Aethel (The Capital)
     * Imprints syntax runes, converting Pre-Fuel into Finished Barrier Fuel Crates.
     */
    processRoyalCrucible(capital, shadowfen) {
        const availablePreFuel = shadowfen.stats.refinementStock?.pre_fuel_matrix || 0;
        if (availablePreFuel <= 0) return;

        shadowfen.stats.refinementStock.pre_fuel_matrix = 0;
        const finishedCrates = Math.floor(availablePreFuel * 2.5);
        capital.stats.essence = (capital.stats.essence || 0) + finishedCrates;
        this.pipelineMetrics.finishedFuelCrates += finishedCrates;
    }

    /**
     * Weekly Quota Distribution (The King's Chain Quota)
     */
    auditQuotas() {
        if (typeof window === 'undefined' || !window.VillageManager?.villages) return;

        const villages = window.VillageManager.villages;
        const forestSettlements = villages.filter(v => v.region !== 'dunes' && !v.isDisconnected);
        const capital = forestSettlements.find(v => v.capital || v.nobleHouse === 'House Aethel');
        if (!capital) return;

        let availableFuel = capital.stats.essence || 0;

        forestSettlements.forEach(v => {
            if (v.capital) return;

            const pop = v.population?.current || 5000;
            const quotaNeeded = Math.max(5, Math.ceil(pop / 3000) * 7);
            v.fuelNeed = quotaNeeded;

            if (availableFuel >= quotaNeeded) {
                availableFuel -= quotaNeeded;
                v.stats.essence = (v.stats.essence || 0) + quotaNeeded;
                v.quotaFulfilled = true;
            } else {
                this.pipelineMetrics.failedQuotas++;
                v.quotaFulfilled = false;
                if (window.EventBus) {
                    window.EventBus.emit('UI_LOG', `⚠️ [PIPELINE] Fuel delivery to ${v.name} failed! Capital reserves depleted.`);
                }
            }
        });

        capital.stats.essence = availableFuel;
    }

    /**
     * Anchor-Stone Burn & Daily Integrity Maintenance
     */
    processAnchorBurn(forestSettlements) {
        forestSettlements.forEach(v => {
            const dailyBurn = Math.max(1, Math.ceil((v.population?.current || 5000) / 7000));
            const currentEssence = v.stats.essence || 0;

            if (currentEssence >= dailyBurn) {
                v.stats.essence -= dailyBurn;
                v.barrierIntegrity = Math.min(100, (v.barrierIntegrity ?? 100) + 5);
                v.anchorFailed = false;
            } else {
                v.stats.essence = 0;
                v.barrierIntegrity = Math.max(0, (v.barrierIntegrity ?? 100) - 15);
                
                if (v.barrierIntegrity === 0) {
                    v.anchorFailed = true;
                    if (window.EventBus) {
                        window.EventBus.emit('BARRIER_COLLAPSED', { villageId: v.id, name: v.name });
                        window.EventBus.emit('UI_LOG', `💀 [ANCHOR] ${v.name}'s Anchor-Stone has failed!`);
                    }
                }
            }
        });
    }

    /**
     * Audit Shift Survival: Unanchored settlements collapse into White Void.
     */
    auditShiftSurvival() {
        if (typeof window === 'undefined' || !window.VillageManager?.villages) return;

        const villages = window.VillageManager.villages;
        const forestSettlements = villages.filter(v => v.region !== 'dunes');

        forestSettlements.forEach(v => {
            if (v.anchorFailed || (v.barrierIntegrity ?? 100) <= 0) {
                if (!v.capital) {
                    v.isDisconnected = true;
                    v.feudalState = 'LOST_IN_VOID';
                    if (window.EventBus) {
                        window.EventBus.emit('UI_LOG', `⚪ [SHIFT] ${v.name} collapsed into the White Void!`);
                    }
                }
            }
        });
    }

    /**
     * Legacy compatibility wrapper
     */
    processBatch(villageId, ingredients) {
        this.tickDailyProduction();
    }
}

window.BarrierPipeline = new BarrierPipelineSystem();
export default window.BarrierPipeline;
