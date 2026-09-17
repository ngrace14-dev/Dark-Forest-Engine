// File: src_systems_health.js


export class CharacterHealth {
    constructor(name) {
        this.name = name;
        this.isAlive = true;
        this.blood = 100; 
        
                this.limbs = {
            head: { hp: 100, max: 100, critical: true, isAmputated: false },
            torso: { hp: 100, max: 100, critical: true, isAmputated: false },
            leftArm: { hp: 100, max: 100, critical: false, isAmputated: false },
            rightArm: { hp: 100, max: 100, critical: false, isAmputated: false },
            leftLeg: { hp: 100, max: 100, critical: false, isAmputated: false },
            rightLeg: { hp: 100, max: 100, critical: false, isAmputated: false }
        };


        this.penalties = {
            speedMultiplier: 1.0,
            canUseTwoHanded: true,
            canAttack: true
        };
    }

        takeDamage(limbName, amount, entity) {
        if (!this.isAlive) return;
        const limb = this.limbs[limbName];
        if (!limb) return;

                if (limb.isAmputated) {
            this.logEvent(`💨 The attack passed through the void where your ${limbName} used to be.`);
            return;
        }

        const wasAtZero = limb.hp <= 0;
        limb.hp = Math.max(0, limb.hp - amount);
        
        // Amputation Logic: Overkill damage while already at 0 HP
        if (wasAtZero && amount > 25 && !limb.critical) {
            limb.isAmputated = true;
            this.logEvent(`💀 SEVERED! Your ${limbName} has been hacked off!`);
            window.EventBus.emit('PLAY_SOUND', { url: 'https://tonejs.github.io/audio/drum-samples/crush-analog.mp3', vol: 10 });
        } else {
            this.logEvent(`💥 ${this.name} took ${amount} damage to the ${limbName}!`);
        }


        // Update VAT if this is an NPC
        if (entity && entity.vatIndex !== undefined) {
            window.VATManager.updateInstanceStat(entity, true);
        }

        this.checkStatus();
        this.updateUI();
    }


    checkStatus() {
        if (this.limbs.head.hp <= 0 || this.limbs.torso.hp <= 0) {
            this.isAlive = false;
            this.logEvent(`💀 ${this.name} has died.`);
            return;
        }

                if (this.limbs.leftLeg.hp <= 0 && this.limbs.rightLeg.hp <= 0) {
            this.penalties.speedMultiplier = 0.1;
            if (this.limbs.leftLeg.isAmputated || this.limbs.rightLeg.isAmputated) {
                this.logEvent(`🩸 ${this.name} is missing leg(s). They are dragging themselves through the dirt.`);
            } else {
                this.logEvent(`🩸 ${this.name}'s legs are broken. They are crawling.`);
            }
        } else if (this.limbs.leftLeg.hp <= 0 || this.limbs.rightLeg.hp <= 0) {
            this.penalties.speedMultiplier = 0.5;
            this.logEvent(`🦴 ${this.name} is limping.`);
        }


        if (this.limbs.leftArm.hp <= 0 || this.limbs.rightArm.hp <= 0) {
            this.penalties.canUseTwoHanded = false;
        }
        if (this.limbs.leftArm.hp <= 0 && this.limbs.rightArm.hp <= 0) {
            this.penalties.canAttack = false;
            this.logEvent(`🩸 ${this.name}'s arms are useless. Cannot attack!`);
        }
    }

    logEvent(message) {
        const logEl = document.getElementById('event-log');
        if (logEl) {
            const entry = document.createElement('div');
            entry.className = "text-gray-300 mb-1";
            entry.innerText = message;
            logEl.appendChild(entry);
            logEl.scrollTop = logEl.scrollHeight;
        }
    }

        updateUI() {
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;

        let html = `<div class="grid grid-cols-2 gap-2">`;
        for (const [name, data] of Object.entries(this.limbs)) {
            let color = "text-green-400";
            let statusText = `${data.hp}/${data.max}`;
            
            if (data.isAmputated) {
                color = "text-red-900 font-black italic";
                statusText = "SEVERED";
            } else {
                if (data.hp < 50) color = "text-yellow-400";
                if (data.hp <= 0) color = "text-red-600 font-bold line-through";
            }

            html += `
                <div class="bg-gray-800 p-2 rounded border border-gray-700">
                    <span class="text-gray-500 uppercase text-xs">${name}</span>
                    <div class="${color} text-lg">${statusText}</div>
                </div>
            `;
        }
        html += `</div>`;
        
        if (this.penalties.speedMultiplier < 1.0) {
            const label = (this.limbs.leftLeg.isAmputated || this.limbs.rightLeg.isAmputated) ? "Amputated" : "Broken";
            html += `<div class="mt-4 p-2 bg-red-900/30 border border-red-700 text-red-400 text-xs animate-pulse rounded">⚠️ Movement Impaired (${label}) (Speed: ${this.penalties.speedMultiplier}x)</div>`;
        }
        if (!this.penalties.canAttack) {
            const label = (this.limbs.leftArm.isAmputated || this.limbs.rightArm.isAmputated) ? "Amputated" : "Broken";
            html += `<div class="mt-2 p-2 bg-red-900/30 border border-red-700 text-red-400 text-xs animate-pulse rounded">⚠️ Combat Disabled (Arms ${label})</div>`;
        }

        statsContainer.innerHTML = html;
    }

    // NEW: Prosthetic Integration
    applyProsthetic(limbName, item) {
        const limb = this.limbs[limbName];
        if (!limb) return;

        limb.isAmputated = false;
        limb.max = 100 + (item.stats.hpBonus || 0);
        limb.hp = limb.max;
        
        this.logEvent(`⚙️ Runic Prosthetic (${item.name}) integrated into ${limbName}.`);
        this.checkStatus();
        this.updateUI();
    }

    removeProsthetic(limbName) {
        const limb = this.limbs[limbName];
        if (!limb) return;

        // Removing a prosthetic from a severed limb makes it severed again
        limb.isAmputated = true; 
        limb.hp = 0;
        limb.max = 100;
        
        this.logEvent(`🚫 Prosthetic removed from ${limbName}. The void returns.`);
        this.checkStatus();
        this.updateUI();
    }

}

window.playerHealth = new CharacterHealth("Wanderer");

document.addEventListener('DOMContentLoaded', () => {
    window.playerHealth.updateUI();
});

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') {
                const limbs = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
        const randomLimb = limbs[Math.floor(Math.random() * limbs.length)];
        window.playerHealth.takeDamage(randomLimb, 35);
    }
});

// --- GLOBAL COMBAT HOOKS ---
window.GameCore.getCombatInjuryMultiplier = function(entity) {
    // If player: Read from character health system
    if (!entity || entity.def?.faction === 'player') {
        return window.playerHealth ? window.playerHealth.penalties.speedMultiplier : 1.0;
    }
    // If NPC: Basic injury math
    const hpPercent = entity.hp / (entity.def?.hp || 50);
    if (hpPercent < 0.25) return 0.5; // Limping
    return 1.0;
};

window.GameCore.applyCombatInjury = function(entity, damage, sourceName = 'Enemy') {
    if (!entity || entity.hp <= 0) return;
    
    // 1. If the target is the player, apply to the limb system
    if (entity.def?.faction === 'player') {
        const limbs = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
        const randomLimb = limbs[Math.floor(Math.random() * limbs.length)];
            
        // Critical hit logic
        let actualDamage = damage;
        if (sourceName === 'Wendigo' && Math.random() < 0.3) {
            actualDamage *= 2.0; // Wendigos are bone-breakers
            window.EventBus.emit('UI_LOG', `[CRITICAL] The Wendigo's claw crushed your ${randomLimb}!`);
        }
            
        window.playerHealth.takeDamage(randomLimb, actualDamage, entity);
        return;
    }

        // 2. If the target is an NPC, simulate dlimb debuffs
    if (entity.def?.type === 'npc') {
        const hpPercent = entity.hp / (entity.def?.hp || 50);
        if (hpPercent < 0.3 && !entity.isCrippled) {
            entity.isCrippled = true;
            entity.speedMultiplier = (entity.speedMultiplier || 1.0) * 0.4;
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'CRIPPLED', pos: entity.visual.position, color: '#f87171' });
            window.EventBus.emit('UI_LOG', `[COMBAT] You crippled the ${entity.name}'s legs!`);
                
            // Signal VAT to switch to limping animation
            window.VATManager.updateInstanceStat(entity, true);
        }
        
        // Permanent scarring logic
        if (damage > 50 && !entity.hasScar) {
            entity.hasScar = true;
            entity.scarLabel = `The ${sourceName}-Marked`;
            window.EventBus.emit('UI_LOG', `[NARRATIVE] The ${entity.name} now bears a deep scar from your blade.`);
        }
    }

};

