import previous from '../../docs/design/late-campaign-diversity/PREVIOUS_STAGE_HASHES.json';
import approved from '../../docs/design/late-campaign-diversity/REVIEWED_STAGE_HASHES.json';
import assert from 'node:assert/strict';

export const previousStageHashes:Record<string,string> = previous;
export const reviewedStageHashes:Record<string,string> = approved;

/** Continue enforcing historical gates while allowing only specifically reviewed replacements. */
export function expectedStageHash(id:string, baselineHash:string):string {
 const reviewed=reviewedStageHashes[id];
 if(reviewed===undefined)return baselineHash;
 assert.equal(previousStageHashes[id],baselineHash,`${id}: historical baseline predates the reviewed rebuild`);
 return reviewed;
}
