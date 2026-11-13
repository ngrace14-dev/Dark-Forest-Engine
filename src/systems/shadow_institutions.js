/**
 * File: src/systems/shadow_institutions.js
 * Shadow Institutions, Scribal Orders & The Ecology of Nuisance
 * Implements Bible Addenda Z, AA, AB, CA-16.
 */

class ObsidianCitadelProtocol {
    constructor() {
        this.director = {
            name: "Director Jess Nedaf",
            title: "Director of Site Operations",
            state: "ACTIVE", // ACTIVE, DEPARTED
            handCrossbowFidelity: 1.0,
            auditsCompleted: 0,
            incidentReportsFiled: 0
        };

        this.vault = {
            containedAnomalies: 0,
            containmentBreaches: 0,
            form12BLedgers: []
        };

        this.actingDirector = null;
    }

    init() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit('UI_LOG', '🏢 [OCP] Obsidian Citadel Protocol Engaged (Director Jess Nedaf presiding)');
        }
    }

    processAudit() {
        this.director.auditsCompleted++;
        
        // Audit anomaly containment
        if (Math.random() < 0.25) {
            this.vault.containedAnomalies++;
            const reportId = `12B-${Date.now().toString().slice(-4)}`;
            this.director.incidentReportsFiled++;
            this.vault.form12BLedgers.push({
                reportId,
                anomalyType: "Non-Euclidean Spatial Fragment",
                status: "CONTAINED",
                day: window.EngineParams?.worldDay || 0
            });
            if (typeof window !== 'undefined' && window.EventBus) {
                window.EventBus.emit('OCP_AUDIT_LOGGED', { reportId, status: "CONTAINED" });
            }
        }
    }

    checkChronalWindow(innkeeperRank, chronalWindowActive) {
        if (this.director.state !== 'ACTIVE') return false;

        // Addendum AA §IV: Hand-Off Trigger
        // Max Career Rank Innkeeper during a Chronal Window triggers Jess Nedaf's exit
        if (innkeeperRank >= 5 && chronalWindowActive) {
            this.director.state = 'DEPARTED';
            this.actingDirector = {
                name: "Acting Director Ronald",
                title: "Acting Director of Containment",
                origin: "Local OCP Agent"
            };

            if (typeof window !== 'undefined' && window.EventBus) {
                window.EventBus.emit('OCP_DIRECTOR_DEPARTURE', {
                    formerDirector: "Jess Nedaf",
                    newDirector: this.actingDirector.name,
                    status: "ETERNAL_CONTAINMENT"
                });
                window.EventBus.emit('UI_LOG', '🚪 [OCP] CHRONAL WINDOW OPEN: Director Jess Nedaf has departed through the Door. Authority transferred to Acting Director.');
            }
            return true;
        }
        return false;
    }
}
class ScribalOrdersDirectorate {
    constructor() {
        this.ironChantry = {
            authority: 0.8,
            permittedRunesLimit: 3,
            hereticsCaptured: 0
        };

        this.flayedQuill = {
            subterraneanOssuaries: 4,
            activeFleshScribes: 12,
            boundSkinRunes: 36
        };

        this.dustWardens = {
            monasteries: 3,
            scrubbedMonuments: 0,
            namelessRuneFragments: 3 // Divided across 3 blind High Wardens
        };
    }

    processScribalClashes() {
        // 1. Iron Chantry inquisitors raid Flayed Quill cells
        if (Math.random() < 0.2) {
            this.ironChantry.hereticsCaptured++;
            this.flayedQuill.activeFleshScribes = Math.max(1, this.flayedQuill.activeFleshScribes - 1);
            if (typeof window !== 'undefined' && window.EventBus) {
                window.EventBus.emit('SCRIBAL_ORDER_CLASH', { order: "Iron Chantry", target: "Flayed Quill", event: "HERESY_PURGE" });
            }
        }

        // 2. Dust-Wardens scrub a forbidden monument with vinegar-ash
        if (Math.random() < 0.25) {
            this.dustWardens.scrubbedMonuments++;
            if (typeof window !== 'undefined' && window.EventBus) {
                window.EventBus.emit('MONUMENT_SCRUBBED', { order: "Dust-Wardens", count: this.dustWardens.scrubbedMonuments });
            }
        }
    }
}

class EcologyOfNuisanceSystem {
    constructor() {
        this.echoWalkers = { population: 25, fakeMapsSold: 0 };
        this.fuelLeeches = { population: 15, fuelStolenTotal: 0 };
        this.runicScabs = { population: 30, lootedRelicsTotal: 0 };
    }

    processNuisanceTick(forestSettlements) {
        // 1. Echo-Walkers sell fake shift-maps
        if (Math.random() < 0.3) {
            this.echoWalkers.fakeMapsSold += 3;
            if (typeof window !== 'undefined' && window.EventBus) {
                window.EventBus.emit('NUISANCE_RUMOR_DISTORTION', { type: "Echo-Walker Distortion", mapsSold: this.echoWalkers.fakeMapsSold });
            }
        }

        // 2. Fuel-Leeches micro-siphon fuel from vulnerable villages
        const vulnerable = forestSettlements.filter(v => (v.stats.essence || 0) > 5 && !v.capital);
        if (vulnerable.length > 0 && Math.random() < 0.25) {
            const target = vulnerable[Math.floor(Math.random() * vulnerable.length)];
            const siphoned = 2;
            target.stats.essence = Math.max(0, target.stats.essence - siphoned);
            this.fuelLeeches.fuelStolenTotal += siphoned;
        }

        // 3. Runic-Scabs loot ruins
        if (Math.random() < 0.3) {
            this.runicScabs.lootedRelicsTotal += 2;
        }
    }
}

class ShadowInstitutionsSystem {
    constructor() {
        this.ocp = new ObsidianCitadelProtocol();
        this.scribal = new ScribalOrdersDirectorate();
        this.nuisance = new EcologyOfNuisanceSystem();

        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => this.init());
            window.EventBus.on('HEARTBEAT_T7D', () => this.tickWeekly());
            window.EventBus.on('HEARTBEAT_T30D', () => this.tickMonthly());
        }
    }

    init() {
        this.ocp.init();
    }

    tickWeekly() {
        this.ocp.processAudit();
        this.scribal.processScribalClashes();
        
        const settlements = window.VillageManager?.villages?.filter(v => v.region !== 'dunes') || [];
        this.nuisance.processNuisanceTick(settlements);
    }

    tickMonthly() {
        const innkeeperRank = 5;
        const chronalWindowActive = true;
        this.ocp.checkChronalWindow(innkeeperRank, chronalWindowActive);
    }
}

if (typeof window !== 'undefined') {
    window.ShadowInstitutions = new ShadowInstitutionsSystem();
}
export default (typeof window !== 'undefined' ? window.ShadowInstitutions : new ShadowInstitutionsSystem());

