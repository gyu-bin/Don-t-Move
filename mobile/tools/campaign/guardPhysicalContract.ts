import type {GuardDef} from '../../src/game/levels/StageDefinition';
/** Existing geometry/tuning contracts exclude only the separately tested new theft circuit. */
export function guardPhysicalContract(guards:GuardDef[]){
 return guards.map(guard=>{const value=structuredClone(guard);delete value.theftSearchSectors;return value;});
}
