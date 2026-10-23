import { PacketState, PacketType } from './enums.js';

/**
 * KnowledgePacket
 * Immutable unit of information moving through the Seeker Pipeline.
 */
export class KnowledgePacket {
    constructor(intelId, data = {}) {
        this.packetId = data.packetId || `pkt_${Math.random().toString(36).slice(2, 7)}_${Date.now()}`;
        
        this.version = data.version || 1;
        this.intelId = intelId;
        
        this.type = Object.values(PacketType).includes(data.type)
            ? data.type
            : PacketType.LOCATION;

        this.value = data.value ?? null;
        
        this.fidelity = Math.max(0, Math.min(1, data.fidelity ?? 1.0));
        
        this.sourceId = data.sourceId || 'unknown';
        this.seekerRole = data.seekerRole || 'adventurer';
        this.timestamp = data.timestamp || (window.EngineParams?.worldDay ?? 0);
        this.isArtifact = data.isArtifact || false;

        this.state = Object.values(PacketState).includes(data.state)
            ? data.state
            : PacketState.EXTRACTED;

        this.originCoord = data.originCoord || { x: 0, z: 0 };
    }

    serialize() {
        return JSON.stringify(this);
    }
}
