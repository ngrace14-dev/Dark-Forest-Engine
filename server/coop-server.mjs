import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 8787);
const tickRate = 20;
const session = {
    id: 'forest-session',
    seed: 'dark_forests_1337',
    worldDay: 0,
    timeOfDay: 14,
    cycleLengthDays: 14,
    players: new Map(),
    entities: new Map()
};

function makeId() {
    return `player-${Math.random().toString(36).slice(2, 10)}`;
}

function snapshot() {
    return {
        type: 'SNAPSHOT',
        session: {
            id: session.id,
            seed: session.seed,
            worldDay: session.worldDay,
            timeOfDay: session.timeOfDay,
            cycleLengthDays: session.cycleLengthDays
        },
        players: [...session.players.values()].map(({ input, socket, attackReadyAt, ...player }) => player),
        entities: [...session.entities.values()].map(({ input, socket, attackReadyAt, ...entity }) => entity)
    };
}

function broadcast() {
    const message = JSON.stringify(snapshot());
    for (const player of session.players.values()) {
        if (player.socket.readyState === 1) player.socket.send(message);
    }
}

function removePlayer(playerId) {
    session.players.delete(playerId);
    session.entities.delete(playerId);
    if (session.players.size === 0) {
        for (const [entityId, entity] of session.entities) if (entity.kind === 'monster') session.entities.delete(entityId);
    }
    broadcast();
}

function spawnMonster(index) {
    const entityId = `monster-${index + 1}`;
    session.entities.set(entityId, {
        id: entityId,
        entityId,
        kind: 'monster',
        ownerId: null,
        name: index % 2 === 0 ? 'Network Ghoul' : 'Network Flesh Horror',
        x: (index % 2 ? -1 : 1) * (10 + index * 4),
        y: 0,
        z: (index - 1) * 8,
        hp: index % 2 === 0 ? 80 : 140,
        maxHp: index % 2 === 0 ? 80 : 140,
        speed: index % 2 === 0 ? 1.5 : 1.1
    });
}

const server = new WebSocketServer({ port });
server.on('connection', socket => {
    if (session.players.size >= 2) {
        socket.send(JSON.stringify({ type: 'ERROR', message: 'This session already has two players.' }));
        socket.close();
        return;
    }

    const playerId = makeId();
    const index = session.players.size;
    const player = {
        id: playerId,
        entityId: playerId,
        kind: 'player',
        ownerId: playerId,
        name: `Wanderer ${index + 1}`,
        x: index === 0 ? 0 : 4,
        z: index === 0 ? 0 : 4,
        y: 0,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        attackReadyAt: 0,
        connected: true,
        partyMode: 'solo',
        input: { x: 0, z: 0 },
        socket
    };
    session.players.set(playerId, player);
    session.entities.set(playerId, player);
    if (![...session.entities.values()].some(entity => entity.kind === 'monster')) {
        for (let index = 0; index < 3; index++) spawnMonster(index);
    }
    socket.send(JSON.stringify({ type: 'WELCOME', playerId, sessionId: session.id }));
    broadcast();

    socket.on('message', raw => {
        let message;
        try { message = JSON.parse(raw.toString()); } catch { return; }
        if (message.type === 'INPUT') {
            const inputX = Number(message.x) || 0;
            const inputZ = Number(message.z) || 0;
            const length = Math.hypot(inputX, inputZ) || 1;
            player.input = { x: inputX / length, z: inputZ / length };
        }
        if (message.type === 'ATTACK') {
            const now = Date.now();
            const staminaCost = message.heavy ? 35 : 15;
            const cooldown = message.heavy ? 1200 : 800;
            if (now < player.attackReadyAt || player.stamina < staminaCost) return;
            player.attackReadyAt = now + cooldown;
            player.stamina -= staminaCost;
            broadcastEvent({ type: 'COMBAT_EVENT', event: 'attack_accepted', actorId: player.id, heavy: Boolean(message.heavy) });
        }
        if (message.type === 'SET_PARTY_MODE') {
            player.partyMode = message.mode === 'party' ? 'party' : 'solo';
        }
    });
    socket.on('close', () => removePlayer(playerId));
    socket.on('error', () => removePlayer(playerId));
});

function broadcastEvent(event) {
    const message = JSON.stringify(event);
    for (const player of session.players.values()) {
        if (player.socket.readyState === 1) player.socket.send(message);
    }
}

setInterval(() => {
    const step = 1 / tickRate;
    session.timeOfDay += step * 24 / 120;
    if (session.timeOfDay >= 24) {
        session.timeOfDay %= 24;
        session.worldDay++;
    }
    for (const player of session.players.values()) {
        player.x += player.input.x * 4 * step;
        player.z += player.input.z * 4 * step;
        player.stamina = Math.min(player.maxStamina, player.stamina + 12 * step);
    }
    for (const monster of session.entities.values()) {
        if (monster.kind !== 'monster' || session.players.size === 0) continue;
        const target = [...session.players.values()].sort((a, b) => Math.hypot(monster.x - a.x, monster.z - a.z) - Math.hypot(monster.x - b.x, monster.z - b.z))[0];
        const distance = Math.hypot(target.x - monster.x, target.z - monster.z);
        if (distance > 2) {
            monster.x += (target.x - monster.x) / distance * monster.speed * step;
            monster.z += (target.z - monster.z) / distance * monster.speed * step;
        }
    }
    if (session.players.size > 0) broadcast();
}, 1000 / tickRate);

console.log(`Dark Forest co-op server listening on ws://localhost:${port}`);
