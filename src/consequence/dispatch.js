import { ConsequenceEvents } from './src_consequence_types/events.js';
import { ContractState } from './src_consequence_types/enums.js';

/**
 * ContractDispatcher: The Labor Allocator
 * Manages the transition from Institutional Demand to Physical Labor.
 */
class ContractDispatcher {
    constructor() {
        this.waitThreshold = 24; // WorldDays before WAITING -> SOLO_HUBRIS
    }

    /**
     * Entry Point: Called per AI_TICK.
     */
    processDispatcher(inventory, idleNPCs, worldDay) {
        // 1. Merge Redundant Contracts
        this._mergeContracts(inventory);

        // 2. Sort & Filter by Priority
        const openContracts = inventory.contracts
            .filter(c => c.status === ContractState.GENERATED || 
                         c.status === ContractState.RECRUITING || 
                         c.status === ContractState.WAITING)
            .sort((a, b) => b.priority - a.priority);

        // 3. Process Recruitment for each
        for (const contract of openContracts) {
            this._recruitForContract(contract, idleNPCs, worldDay);
        }
    }

    /**
     * Enforces the Contract Merge Rule to prevent labor spam.
     */
    _mergeContracts(inventory) {
        const groups = new Map();
        
        inventory.contracts.forEach(c => {
            if (c.status !== ContractState.GENERATED) return;
            const key = `${c.targetIntelId}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(c);
        });

        groups.forEach(redundant => {
            if (redundant.length > 1) {
                const primary = redundant[0];
                for (let i = 1; i < redundant.length; i++) {
                    const secondary = redundant[i];
                    primary.priority += (secondary.priority * 0.5); 
                    primary.idealTeam = [...new Set([...primary.idealTeam, ...secondary.idealTeam])];
                    
                    // Issue 3: Contract GC through explicit abandonment
                    secondary.status = ContractState.ABANDONED;
                    window.EventBus.emit('CONTRACT_ABANDONED', { 
                        factionId: inventory.factionId, 
                        contractId: secondary.contractId 
                    });
                }
                console.log(`[Dispatcher] Merged ${redundant.length} contracts for ${primary.targetIntelId}.`);
            }
        });
    }

    _recruitForContract(contract, idleNPCs, worldDay) {
        if (contract.status === ContractState.GENERATED) {
            this._transitionContract(contract, ContractState.RECRUITING);
        }

        // Fill Minimum Team
        const missingRoles = contract.minimumTeam.filter(role => 
            !contract.teamMembers.some(npc => npc.role === role)
        );

        for (const role of missingRoles) {
            // Issue 4: Ensure faction-local recruitment (implied by idleNPCs filter in core)
            const candidate = idleNPCs.find(npc => npc.role === role && !npc.assignedContractId);
            if (candidate) {
                this._assignNPCToContract(candidate, contract);
            }
        }

        // Check Minimum Satisfaction
        const minFilled = contract.minimumTeam.every(role => 
            contract.teamMembers.some(npc => npc.role === role)
        );

        if (minFilled) {
            const isIdeal = contract.idealTeam.every(role => 
                contract.teamMembers.some(npc => npc.role === role)
            );

            if (isIdeal) {
                this._transitionContract(contract, ContractState.ASSIGNED);
            } else if (contract.status === ContractState.RECRUITING) {
                this._transitionContract(contract, ContractState.WAITING);
                // Issue 2: Wait State Timestamp Protection
                if (contract.waitStartedAt === undefined) {
                    contract.waitStartedAt = worldDay;
                }
            } else if (contract.status === ContractState.WAITING) {
                if (worldDay - contract.waitStartedAt > this.waitThreshold) {
                    this._transitionContract(contract, ContractState.ASSIGNED);
                }
            }
        }
    }

    _assignNPCToContract(npc, contract) {
        npc.assignedContractId = contract.contractId;
        contract.teamMembers.push({
            id: npc.id,
            role: npc.role
        });
        
        window.EventBus.emit(ConsequenceEvents.CONTRACT_ASSIGNED, { 
            npcId: npc.id, 
            contractId: contract.contractId 
        });
    }

    _transitionContract(contract, newState) {
        const oldState = contract.status;
        if (oldState === newState) return;

        contract.status = newState;
        
        console.log(`[Dispatcher] Contract ${contract.contractId} transitioned: ${oldState} -> ${newState}`);
        
        // Finalized states trigger cleanup or start
        if (newState === ContractState.ASSIGNED) {
             window.EventBus.emit(ConsequenceEvents.EXPEDITION_DEPART, { contract });
        }
    }
}

export const Dispatcher = new ContractDispatcher();
