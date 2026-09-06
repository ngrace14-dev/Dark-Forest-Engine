import { WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 8787);
const tickRate = 20;
const session = {
    id: 'forest-session',
    seed: 'dark_forests_1337',
    worldDay: 0,
    timeOfDay: 14,
    cycleLengthDays: 14,
    players: new Map()
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
        players: [...session.players.values()].map(({ input, ...player }) => player)
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
    broadcast();
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
        name: `Wanderer ${index + 1}`,
        x: index === 0 ? 0 : 4,
        z: index === 0 ? 0 : 4,
        y: 0,
        hp: 100,
        maxHp: 100,
        connected: true,
        partyMode: 'solo',
        input: { x: 0, z: 0 },
        socket
    };
    session.players.set(playerId, player);
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
        if (message.type === 'POSE') {
            player.x = Number(message.x) || player.x;
            player.y = Number(message.y) || player.y;
            player.z = Number(message.z) || player.z;
        }
        if (message.type === 'SET_PARTY_MODE') {
            player.partyMode = message.mode === 'party' ? 'party' : 'solo';
        }
    });
    socket.on('close', () => removePlayer(playerId));
    socket.on('error', () => removePlayer(playerId));
});

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
    }
    if (session.players.size > 0) broadcast();
}, 1000 / tickRate);

console.log(`Dark Forest co-op server listening on ws://localhost:${port}`);
