window.NetworkSession = {
    socket: null,
    connected: false,
    playerId: null,
    sessionId: null,
    partyMode: 'solo',
    entities: new Map(),
    remotePlayers: new Map(),
    remoteEntities: new Map(),
    connect: function(url = 'ws://localhost:8787') {
        if (this.socket || !url) return;
        try {
            this.socket = new WebSocket(url);
            this.socket.addEventListener('open', () => {
                this.connected = true;
                window.EventBus.emit('COOP_CONNECTED');
            });
            this.socket.addEventListener('message', event => this.handleMessage(JSON.parse(event.data)));
            this.socket.addEventListener('close', () => {
                this.connected = false;
                this.socket = null;
                window.EventBus.emit('COOP_DISCONNECTED');
            });
            this.socket.addEventListener('error', () => window.EventBus.emit('COOP_ERROR'));
        } catch (error) {
            console.warn('Co-op connection failed.', error);
        }
    },
    send: function(message) {
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    },
    sendInput: function(x, z) { this.send({ type: 'INPUT', x, z }); },
    sendAttack: function(heavy = false) { this.send({ type: 'ATTACK', heavy }); },
    setPartyMode: function(mode) {
        this.partyMode = mode === 'party' ? 'party' : 'solo';
        window.GameState.coop.partyMode = this.partyMode;
        this.send({ type: 'SET_PARTY_MODE', mode: this.partyMode });
        window.EventBus.emit('UI_LOG', `[CO-OP] Your mode is now ${this.partyMode}.`);
    },
    togglePartyMode: function() { this.setPartyMode(this.partyMode === 'solo' ? 'party' : 'solo'); },
    handleMessage: function(message) {
        if (message.type === 'WELCOME') {
            this.playerId = message.playerId;
            this.sessionId = message.sessionId;
            window.GameState.coop.localPlayerId = this.playerId;
            window.GameState.coop.sessionId = this.sessionId;
            return;
        }
        if (message.type === 'COMBAT_EVENT') {
            this.handleCombatEvent(message);
            return;
        }
        if (message.type !== 'SNAPSHOT') return;
        window.EngineParams.worldDay = message.session.worldDay;
        window.EngineParams.timeOfDay = message.session.timeOfDay;
        window.EngineParams.worldSeed = message.session.seed;
        const seen = new Set();
        const entities = message.entities || message.players || [];
        entities.forEach(player => {
            const entityId = player.entityId || player.id;
            seen.add(entityId);
            this.entities.set(entityId, player);
            if (player.id === this.playerId || player.ownerId === this.playerId) {
                this.reconcileLocalPlayer(player);
            } else if (player.kind === 'monster') {
                this.updateRemoteEntity({ ...player, id: entityId });
            } else {
                this.updateRemotePlayer({ ...player, id: entityId });
            }
        });
        this.remotePlayers.forEach((remote, id) => {
            if (!seen.has(id)) {
                remote.visual?.removeFromParent();
                this.remotePlayers.delete(id);
            }
        });
        this.remoteEntities.forEach((remote, id) => {
            if (!seen.has(id)) {
                remote.visual?.removeFromParent();
                this.remoteEntities.delete(id);
            }
        });
        return;
    },
    handleCombatEvent: function(message) {
        if (message.event !== 'attack_accepted') return;
        if (message.actorId === this.playerId) return;
        const remote = this.remotePlayers.get(message.actorId);
        if (remote) remote.attackUntil = performance.now() + (message.heavy ? 500 : 300);
    },
    reconcileLocalPlayer: function(player) {
        const local = window.GameCore.playerObj;
        if (!local?.body) return;
        if (Number.isFinite(player.stamina)) window.GameState.pStats.stamina = player.stamina;
        const current = local.body.translation();
        const distance = Math.hypot(current.x - player.x, current.z - player.z);
        if (distance < 1.5) return;
        local.body.setTranslation({ x: player.x, y: current.y, z: player.z }, true);
        local.body.setLinvel({ x: 0, y: local.body.linvel().y, z: 0 }, true);
    },
    updateRemotePlayer: function(player) {
        let remote = this.remotePlayers.get(player.id);
        if (!remote) {
            const visual = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 4, 8), new THREE.MeshStandardMaterial({ color: 0x22d3ee }));
            visual.castShadow = true;
            window.GameCore.scene?.add(visual);
            remote = { visual };
            this.remotePlayers.set(player.id, remote);
        }
        if (!remote.visual) return;
        if (!remote.visual.parent && window.GameCore.scene) window.GameCore.scene.add(remote.visual);
        remote.visual.position.lerp(new THREE.Vector3(player.x, player.y + 1, player.z), 0.35);
        remote.name = player.name;
        remote.partyMode = player.partyMode;
    }
    ,updateRemoteEntity: function(entity) {
        let remote = this.remoteEntities.get(entity.id);
        if (!remote) {
            const color = entity.kind === 'monster' ? 0x991b1b : 0x94a3b8;
            const visual = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color }));
            visual.castShadow = true;
            window.GameCore.scene?.add(visual);
            remote = { visual };
            this.remoteEntities.set(entity.id, remote);
        }
        if (!remote.visual) return;
        if (!remote.visual.parent && window.GameCore.scene) window.GameCore.scene.add(remote.visual);
        const y = window.WorldGenerator?.getTerrainHeight(entity.x, entity.z) || 0;
        remote.visual.position.lerp(new THREE.Vector3(entity.x, y + 1, entity.z), 0.35);
    }
};

const coopUrl = new URLSearchParams(window.location.search).get('coop');
if (coopUrl) window.NetworkSession.connect(coopUrl);
window.EventBus.on('COOP_CONNECTED', () => window.EventBus.emit('UI_LOG', '[CO-OP] Connected to the shared forest session.'));
window.EventBus.on('COOP_DISCONNECTED', () => window.EventBus.emit('UI_LOG', '[CO-OP] Disconnected. The local world remains playable.'));
window.EventBus.on('COOP_ERROR', () => window.EventBus.emit('UI_LOG', '[CO-OP] Connection error.'));
