/** Targeted candidates from live DeviceHub evidence. Live after-images are required. */
import {V124C_EARLY_PLANS} from './v124cEarlyPlans';
import {V124C_LAB_PLANS} from './v124cLabPlans';
export const V124D_TARGETED_PLANS=structuredClone([...V124C_EARLY_PLANS,...V124C_LAB_PLANS]);
const find=(id:string)=>V124D_TARGETED_PLANS.find(p=>p.id===id)!;
// Museum objective-before: foreground low case crowds the chamber entrance.
const museum=find('01-05');museum.structures=museum.structures!.filter(p=>!(p.kind==='table'&&p.x===14.5));
// Live 02-02 objective-after: the second small sculpture crowds the watcher and
// pickup. Keep the larger rear landmark and clear the western approach shoulder.
const sculptureGallery=find('02-02');
sculptureGallery.structures=sculptureGallery.structures!.filter(p=>!(p.kind==='statue'&&p.x===22&&p.y===4));
// Live 03-01 objective-after: the inner loose safe overlaps the pickup approach.
// Retain the deposit-box landmark and outer safe at (17,4), which screens the
// first escape shoulder; remove only the redundant safe beside the objective.
const bankLobby=find('03-01');
bankLobby.structures=bankLobby.structures!.filter(p=>!(p.kind==='bankSmallSafe'&&p.x===15.3&&p.y===4.5));
// Bank live objective: remove redundant safes without changing security authoring.
const bank=find('03-05');bank.structures=bank.structures!.filter(p=>p.kind!=='bankSmallSafe'||p.x===30);
// Lab live objective: two containment tanks squeeze specimen; one landmark is enough.
const cryoLab=find('04-04');
cryoLab.structures=cryoLab.structures!.filter(p=>!(p.kind==='labCryoUnit'&&p.x===10.15));
const lab=find('04-05');lab.structures=lab.structures!.filter(p=>!(p.kind==='labCryoUnit'&&p.x<13));
// Remove the isolated cart rather than filling the only research passage.
lab.structures=lab.structures.filter(p=>p.kind!=='labCart');

// Live Lab entry views showed reception desks isolated in the centre of small
// cells. Seat the same desks along the west wall, with their right-hand shoulder
// open. Their 1.8-tile footprints at scale <=1.15 leave >=0.115 tile to that wall.
for(const plan of V124D_TARGETED_PLANS.filter(p=>p.id.startsWith('04-'))){
 const reception=plan.rooms.find(r=>r.id==='P')!;
 const workstation=plan.structures!.find(p=>p.kind==='labWorkstation'&&p.x>=reception.x&&p.x<reception.x+reception.w&&p.y>=reception.y&&p.y<reception.y+reception.h)!;
 workstation.x=reception.x+1.15;workstation.y=reception.y+1.7;
 // The two service workstations belong to a wall-side utility workcell, not a
 // loose island at the lower end of the room. Keep the central corridor clear.
 const service=plan.rooms.find(r=>r.id==='E')!;
 const utility=plan.structures!.find(p=>p.kind==='labWorkstation'&&p.x>=service.x&&p.x<service.x+service.w&&p.y>=service.y&&p.y<service.y+service.h);
 if(utility){utility.x=service.x+1.15;utility.y=service.y+1.7;}
}
// 04-03 entry capture: a freestanding glass sprite intersects the long bench.
// The existing physical cleanroom door defines this threshold; remove the
// redundant panel and retain the full bench plus a readable approach shoulder.
const glassResearch=find('04-03');
glassResearch.structures=glassResearch.structures!.filter(p=>p.kind!=='labGlassWall');
// 04-02 exit capture: the loose sample case reads as an unrelated floor object.
// Reuse it at the east end of the existing upper research bench as a supply bay.
const observation=find('04-02');
const sampleCase=observation.structures!.find(p=>p.kind==='labSampleCase')!;
sampleCase.x=13;sampleCase.y=3;
