window.NetworkSession = {
    socket: null,
    connected: false,
    playerId: null,
    sessionId: null,
    partyMode: 'solo',
    remotePlayers: new Map(),
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
    sendPose: function(position) { this.send({ type: 'POSE', x: position.x, y: position.y, z: position.z }); },
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
        if (message.type !== 'SNAPSHOT') return;
        window.EngineParams.worldDay = message.session.worldDay;
        window.EngineParams.timeOfDay = message.session.timeOfDay;
        window.EngineParams.worldSeed = message.session.seed;
        const seen = new Set();
        message.players.forEach(player => {
            seen.add(player.id);
            if (player.id === this.playerId) return;
            this.updateRemotePlayer(player);
        });
        this.remotePlayers.forEach((remote, id) => {
            if (!seen.has(id)) {
                remote.visual?.removeFromParent();
                this.remotePlayers.delete(id);
            }
        });
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
};

const coopUrl = new URLSearchParams(window.location.search).get('coop');
if (coopUrl) window.NetworkSession.connect(coopUrl);
window.EventBus.on('COOP_CONNECTED', () => window.EventBus.emit('UI_LOG', '[CO-OP] Connected to the shared forest session.'));
window.EventBus.on('COOP_DISCONNECTED', () => window.EventBus.emit('UI_LOG', '[CO-OP] Disconnected. The local world remains playable.'));
window.EventBus.on('COOP_ERROR', () => window.EventBus.emit('UI_LOG', '[CO-OP] Connection error.'));
