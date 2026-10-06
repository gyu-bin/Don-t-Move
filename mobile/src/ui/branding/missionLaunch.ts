import {missionIndex} from '../../game/levels/campaignCatalog';
import {canPlayMission,migrateCampaign} from '../../game/progress/campaignProgress';

/** A launch selection is transient: save normalization may clamp a dev-only mission. */
export function resolveInitialMissionIndex(
 progress:Parameters<typeof migrateCampaign>[0],
 selectedIndex:number|undefined,
 testBuild:boolean,
):number {
 const campaign=migrateCampaign(progress);
 return selectedIndex!==undefined&&canPlayMission(campaign,selectedIndex,testBuild)
  ?selectedIndex:missionIndex(campaign.lastMission);
}
