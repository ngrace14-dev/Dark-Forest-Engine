// File: src_systems_health.js

export class CharacterHealth {
    constructor(name) {
        this.name = name;
        this.isAlive = true;
        this.blood = 100; 
        
        this.limbs = {
            head: { hp: 100, max: 100, critical: true },
            torso: { hp: 100, max: 100, critical: true },
            leftArm: { hp: 100, max: 100, critical: false },
            rightArm: { hp: 100, max: 100, critical: false },
            leftLeg: { hp: 100, max: 100, critical: false },
            rightLeg: { hp: 100, max: 100, critical: false }
        };

        this.penalties = {
            speedMultiplier: 1.0,
            canUseTwoHanded: true,
            canAttack: true
        };
    }

    takeDamage(limbName, amount) {
        if (!this.isAlive) return;
        const limb = this.limbs[limbName];
        if (!limb) return;

        limb.hp = Math.max(0, limb.hp - amount);
        this.logEvent(`💥 ${this.name} took ${amount} damage to the ${limbName}!`);

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
            this.logEvent(`🩸 ${this.name}'s legs are broken. They are crawling.`);
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
            if (data.hp < 50) color = "text-yellow-400";
            if (data.hp <= 0) color = "text-red-600 font-bold line-through";

            html += `
                <div class="bg-gray-800 p-2 rounded border border-gray-700">
                    <span class="text-gray-500 uppercase text-xs">${name}</span>
                    <div class="${color} text-lg">${data.hp}/${data.max}</div>
                </div>
            `;
        }
        html += `</div>`;
        
        if (this.penalties.speedMultiplier < 1.0) {
            html += `<div class="mt-4 p-2 bg-red-900/30 border border-red-700 text-red-400 text-xs animate-pulse rounded">⚠️ Movement Impaired (Speed: ${this.penalties.speedMultiplier}x)</div>`;
        }
        if (!this.penalties.canAttack) {
            html += `<div class="mt-2 p-2 bg-red-900/30 border border-red-700 text-red-400 text-xs animate-pulse rounded">⚠️ Combat Disabled (Arms Broken)</div>`;
        }

        statsContainer.innerHTML = html;
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
