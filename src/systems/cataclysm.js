/**
 * File: src_systems_cataclysm.js
 * The Great Erasure: Chronos Refraction
 */

window.CataclysmManager = {
    active: false,
    refractionShades: new Map(), // shadeId -> targetEntityId
    
    init: function() {
        window.EventBus.on('ENTITY_DAMAGED', (data) => this.handleShadeInfighting(data));
        window.EventBus.on('CHAMPION_SPAWN_READY', () => this.spawnTheChampion());
        window.EventBus.on('HEAT_DEATH_REVERSED', () => this.endCataclysm(false));
        window.EventBus.emit('UI_LOG', '🌌 [CATACLYSM] Refraction Protocol loaded.');
    },

    spawnTheChampion: function() {
        window.EventBus.emit('UI_LOG', "⚡ [SINGULARITY] THE SUM OF ALL MEMORY HAS CRYSTALLIZED.");
        window.EventBus.emit('UI_LOG', "The Champion has returned to claim the final sequence.");

        const pPos = window.GameCore.playerObj.visual.position;
        const champion = window.GameCore.instantiatePrefab('The_Champion', pPos.x + 20, 5, pPos.z + 20);

        if (champion) {
            champion.name = "The Champion";
            champion.isChampion = true;
            champion.isShade = true;
            
            // --- THE CHAMPION STATS: THE ULTIMATE ANCHOR ---
            champion.maxHp = 5000; // Fixed Boss Health
            champion.hp = 5000;
            champion.attackDamage = 100;
            champion.moveSpeed = 8;
            
            champion.forcedTarget = window.GameCore.playerObj;
            champion.aiMode = 'aggressive';
            
            window.EventBus.emit('APPLY_SHADE_MATERIAL', champion);
            window.EventBus.emit('BOSS_BAR_SHOW', { name: "THE CHAMPION", health: 1.0 });
        }
    },

    endCataclysm: function(fullReset = true) {
        this.active = false;
        window.EventBus.emit('UI_LOG', "✨ [RESTORATION] The Refraction has ended. Memory is quiet once more.");
        
        if (fullReset) {
            // Level 7: Deep Time Erasure
            window.GHO?.processCompressionCycle(true); // Force purge all
            window.EngineParams.worldEpoch++;
            window.EventBus.emit('WORLD_RESET_ANIMATION');
        } else {
            // World survives but scarred
            window.EngineParams.filterColor = '#fca5a5'; // Red-tinted sky
            window.EngineParams.filterIntensity = 0.4;
            window.EventBus.emit('ENV_UPDATE');
        }
    },

    triggerHeatDeath: function() {
        this.active = true;
        window.EventBus.emit('UI_LOG', "🌌 [SINGULARITY] THE WORLD HAS DECLARED WAR ON ITSELF.");
        window.EventBus.emit('UI_LOG', "The Refraction has begun. No one is safe from their own memory.");
        
        // 1. Distortion Ambience
        window.EventBus.emit('PLAY_SOUND', { url: 'heat_death_drone.mp3', loop: true });
        
        if (window.EngineParams) {
            window.EngineParams.filterColor = '#ffffff';
            window.EngineParams.filterIntensity = 1.5;
            window.EventBus.emit('ENV_UPDATE');
        }

        // 2. Spawn the Living Mirrors (Clones)
        this.spawnLivingMirrors();
        
        // 3. Spawn the Ancestral Tide (The Dead)
        this.spawnAncestralTide();
    },

    spawnLivingMirrors: function() {
        // Every active entity gets a shade that hunts them
        window.GameCore.activeEntities.forEach(ent => {
            if (!ent.visual || ent.isShade || ent.id === 'player') return;
            
            const pos = ent.visual.position;
            // Spawn shade 10m away
            const spawnPos = new window.THREE.Vector3(pos.x + 10, pos.y, pos.z + 10);
            const shade = window.GameCore.instantiatePrefab('Shade_Mirror', spawnPos.x, spawnPos.y, spawnPos.z);
            
            if (shade) {
                shade.isShade = true;
                shade.isMirror = true;
                shade.name = `Memory of ${ent.name || ent.id}`;
                shade.parentId = ent.id;

                // --- HARDENING: 15% STRONGER ---
                shade.maxHp = (ent.maxHp || 100) * 1.15;
                shade.hp = shade.maxHp;
                shade.attackDamage = (ent.def?.attackDamage || 15) * 1.15;
                shade.moveSpeed = (ent.def?.speed || 5) * 1.1;

                // --- PERFECT PERCEPTION ---
                shade.forcedTarget = ent; // Clones ALWAYS know where parent is
                shade.aiMode = 'aggressive';
                
                this.refractionShades.set(shade.id, ent.id);
                window.EventBus.emit('APPLY_SHADE_MATERIAL', shade);
            }
        });

        // Special Case: The Player Clone
        const pPos = window.GameCore.playerObj.visual.position;
        const pShade = window.GameCore.instantiatePrefab('Shade_Mirror', pPos.x - 10, pPos.y, pPos.z - 10);
        if (pShade) {
            pShade.isShade = true;
            pShade.isMirror = true;
            pShade.name = "Refraction of the Wanderer";
            pShade.parentId = 'player';
            pShade.maxHp = (window.GameState.pStats.maxHp) * 1.15;
            pShade.hp = pShade.maxHp;
            pShade.forcedTarget = window.GameCore.playerObj;
            pShade.aiMode = 'aggressive';
            window.EventBus.emit('APPLY_SHADE_MATERIAL', pShade);
        }
    },

    spawnAncestralTide: function() {
        if (!window.ChronicleManager?.historicalEssence) return;

        window.ChronicleManager.historicalEssence.forEach((essence, deadId) => {
            const playerPos = window.GameCore.playerObj.visual.position;
            const spawnPos = this.getRandomSpawnInRadius(playerPos, 100);
            
            const shade = window.GameCore.instantiatePrefab('Shade_Ancient', spawnPos.x, 5, spawnPos.z);
            
            if (shade) {
                shade.isShade = true;
                shade.isAncient = true;
                shade.name = `Ghost of ${deadId}`;
                
                // --- HARDENING: 115% STRONGER, 25% VITALITY ---
                shade.maxHp = (essence.maxHp || 100) * 0.25;
                shade.hp = shade.maxHp;
                shade.attackDamage = (essence.attackDamage || 15) * 1.15;
                shade.moveSpeed = (essence.speed || 5) * 1.15;
                shade.level = essence.level;
                
                // Ancients hunt the Player specifically as the cause of their erasure
                shade.forcedTarget = window.GameCore.playerObj;
                shade.aiMode = 'aggressive';
                
                window.EventBus.emit('APPLY_SHADE_MATERIAL', shade);
            }
        });
    },

    handleShadeInfighting: function(data) {
        if (!this.active || !data.killed) return;
        
        // If a shade kills its parent, it consumes their remaining significance
        if (data.attacker?.isShade && data.victim.id === this.refractionShades.get(data.attacker.id)) {
            window.EventBus.emit('UI_LOG', `[REFRACTION] ${data.victim.name} has been absorbed by their own memory.`);
            // Reduce Global Omega as information is "consolidated"
            if (window.NarrativeThermodynamics) {
                window.NarrativeThermodynamics.omega -= 0.01;
            }
        }
    },

    getRandomSpawnInRadius: function(center, radius) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + (Math.random() * (radius - 30));
        return {
            x: center.x + Math.cos(angle) * dist,
            z: center.z + Math.sin(angle) * dist
        };
    }
};

window.CataclysmManager.init();
export default window.CataclysmManager;
