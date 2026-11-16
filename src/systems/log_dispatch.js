/**
 * File: src/systems/log_dispatch.js
 * Diagetic Log & Incident Report Engine
 * Generates atmospheric in-world letters, courier dispatches, and coroner reports.
 */

window.LogDispatchManager = {
    dispatches: [],
    unreadCount: 0,

    init: function() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENTITY_DIED', (data) => this.recordDeathNotice(data));
        }
    },

    generateDailyDispatches: function(worldDay, campaignMode = 'HOUSE', state = {}) {
        const newItems = [];
        const shiftCountdown = 14 - (worldDay % 14);

        if (shiftCountdown <= 3) {
            newItems.push({
                id: `disp_${worldDay}_shift`,
                day: worldDay,
                type: 'URGENT DISPATCH',
                sender: 'Border Outpost IX (The Silt-Dike)',
                title: `Spatial Drift Warning — Shift in ${shiftCountdown} Days`,
                body: `The surveyor’s lead weight hung at a four-degree slant toward the forest all morning. The road is shortening; milestone twelve has slipped twenty paces into the moss. Station masters have doubled the grease on the gate pulleys.`
            });
        }

        if (campaignMode === 'HOUSE') {
            const h = state.house || {};
            if (h.barrierFuelUnits <= 12) {
                newItems.push({
                    id: `disp_${worldDay}_fuel`,
                    day: worldDay,
                    type: 'INSPECTION REPORT',
                    sender: 'Basalt Brazier Overseer Mallow',
                    title: `Barrier Pressure Fluctuation (${h.barrierFuelUnits} Units Left)`,
                    body: `The violet rim above the outer moat flickered twice during third watch. Bailiffs reported copper tastes in well water. Without fresh pine resin before dusk, outer wards fall below safe radius.`
                });
            } else {
                newItems.push({
                    id: `disp_${worldDay}_patrol`,
                    day: worldDay,
                    type: 'PATROL LOG',
                    sender: 'Sergeant Kaelen, 3rd Horizon Watch',
                    title: 'Eastern Gully Reconnaissance',
                    body: `Found three empty resin casks abandoned in the bracken half a league past the chained perimeter. The stamps were chiselled off. Tracked them east toward salt marshes before pine needles buried the ruts.`
                });
            }
        } else if (campaignMode === 'ORDER') {
            newItems.push({
                id: `disp_${worldDay}_ocp`,
                day: worldDay,
                type: 'OCP FORM 12-B',
                sender: 'Directorate of Site Operations',
                title: 'Containment Audit: Ledger Anomaly #77',
                body: `Scribe Elyse flagged a discrepancy in the harvest rolls of 12,414 AF. The parchment was scraped thin and re-inked. The erased line named a settlement called 'Epitaph' inside the mountain mirage. The page is now sealed in basalt under three locks.`
            });
        } else if (campaignMode === 'DUNE') {
            newItems.push({
                id: `disp_${worldDay}_dune`,
                day: worldDay,
                type: 'PILOT LOG',
                sender: 'Sand-Pilot Dane (Flotilla Keel Watch)',
                title: 'Sounding Report: Silt Veil Streamline',
                body: `Lead line touched riverbed at two hundred cubits. The subterranean current pulls inward at four knots toward the forest sinkhole. Solar stills yielded forty jugs, but brine residue smells sharply of scorched zinc.`
            });
        }

        newItems.forEach(item => {
            item.read = false;
            this.dispatches.unshift(item);
            this.unreadCount++;
            if (window.EventBus) window.EventBus.emit('NEW_DISPATCH', item);
        });

        if (this.dispatches.length > 100) this.dispatches = this.dispatches.slice(0, 100);
    },

    recordDeathNotice: function(deathData) {
        const victim = deathData?.victim || deathData?.id || 'Unknown Traveler';
        const cause = deathData?.cause || 'perished in the fog';
        const day = window.EngineParams?.worldDay || 0;

        const notice = {
            id: `coroner_${day}_${Date.now()}`,
            day,
            type: 'CORONER MEMORANDUM',
            sender: 'Parish Gravedigger & Bailiff',
            title: `Mortality Record: ${victim}`,
            body: `Remains recovered near boundary ditch. Cause noted: ${cause}. Possessions: 1 notched ash staff, 2 copper counters, woolen wraps, unaddressed letter. Interned beneath marked slate.`
        };
        notice.read = false;
        this.dispatches.unshift(notice);
        this.unreadCount++;
    },

    getUnread: function() {
        return this.dispatches.filter(d => !d.read);
    },

    markAllRead: function() {
        this.dispatches.forEach(d => d.read = true);
        this.unreadCount = 0;
    }
};

window.LogDispatchManager.init();