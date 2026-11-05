/** Old-coordinate regression probes use the plans and inspection points they were designed against. */
import checkpoints from '../../docs/design/late-campaign-diversity/PREVIOUS_INSPECTIONS.json';
import source from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V13_CASINO} from './v13Casino';
import {V13_LATE} from './v13Late';
import {V13_VAULT_CH9} from './v13Vault';
import {authorCoverCheckpoints,type CoverCheckpoint} from './v13CoverCheckpoints';
import {composeV13} from './v13Builder';
import {polishPatrol} from './v13PatrolPolish';
import {watchExit} from './v13ExitWatch';

type LegacyId=keyof typeof checkpoints;
export function legacyLayoutPlan(id:LegacyId){
 const plan=[...V13_CASINO,...V13_LATE,...V13_VAULT_CH9].find(m=>m.id===id);
 if(!plan)throw Error(`Missing legacy plan for ${id}`);
 return authorCoverCheckpoints(plan,checkpoints[id] as CoverCheckpoint[]);
}
export function legacyLayoutStage(id:LegacyId){
 return JSON.parse(JSON.stringify(composeV13(watchExit(polishPatrol(legacyLayoutPlan(id))),source as StageDefinition[]))) as StageDefinition;
}
