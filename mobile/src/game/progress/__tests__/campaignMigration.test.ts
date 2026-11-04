import assert from 'node:assert/strict';
import {test} from 'node:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_PROGRESS,loadProgress,saveProgress} from '../stageProgress';
import migrationPlan from '../../../../docs/design/v12/phase2/PROGRESS_MIGRATION_PLAN.json';
import {MISSION_COUNT,CHAPTER_MISSION_COUNTS,missionId,missionIndex} from '../../levels/campaignCatalog';
import {normalizeCampaign,migratedMissionId,freshCampaign,completeMission,canPlayMission,migrateCampaign} from '../campaignProgress';
const save=(highestUnlocked:number,lastMission:string,records:Record<string,unknown>={})=>({version:4,highestUnlocked,lastMission,records});

test('expanded catalog has 55 stable round-trip IDs and ten Museum and Gallery missions',()=>{
 assert.equal(MISSION_COUNT,55);assert.deepEqual(CHAPTER_MISSION_COUNTS,[10,10,5,5,5,5,5,5,5]);
 for(let i=0;i<MISSION_COUNT;i++)assert.equal(missionIndex(missionId(i)),i);
 for(const id of ['01-00','01-11','02-00','02-11','03-06','03-10'])assert.equal(missionIndex(id),-1);
 assert.equal(missionId(5),'01-06');assert.equal(missionId(9),'01-10');assert.equal(missionId(10),'02-01');assert.equal(missionId(14),'02-05');assert.equal(missionId(15),'02-06');assert.equal(missionId(19),'02-10');assert.equal(missionId(20),'03-01');assert.equal(missionId(54),'09-05');
});
test('partial Museum maps entire old unlocked prefix rather than its non-monotonic last ID',()=>{
 const result=normalizeCampaign(save(7,'01-08',{'01-03':{cleared:true,bestTime:20,alerts:0}}));
 assert.equal(result.version,7);assert.equal(result.lastMission,'01-04');assert.equal(result.highestUnlocked,4);
 assert.deepEqual(result.records['01-03'],{cleared:true,legacy:true});
 assert.deepEqual(result.legacyArchive?.original.records,{'01-03':{cleared:true,bestTime:20,alerts:0}});
 assert(canPlayMission(result,4,false));assert(!canPlayMission(result,5,false));
});
test('completed old Museum unlocks Gallery and preserves every merged entitlement',()=>{
 const records=Object.fromEntries(Array.from({length:10},(_,i)=>[`01-${String(i+1).padStart(2,'0')}`,{cleared:true,bestTime:30+i,alerts:i}]));
 const result=normalizeCampaign(save(10,'01-10',records));
 assert.equal(result.highestUnlocked,missionIndex('02-01'));assert.equal(result.lastMission,'01-05');assert.equal(Object.keys(result.records).length,5);
 assert.equal(Object.keys(result.legacyArchive!.original.records as object).length,10);
 for(let i=0;i<5;i++)assert(result.records[missionId(i)].legacy);
});
test('partial Gallery respects 60-map ordinal and explicit glass redirect',()=>{
 const result=normalizeCampaign(save(15,'02-06',{'02-05':{cleared:true},'02-06':{cleared:true}}));
 assert.equal(result.lastMission,'02-04');assert.equal(result.highestUnlocked,missionIndex('02-05'));
 assert.deepEqual(result.records['02-02'],{cleared:true,legacy:true});
 assert.deepEqual(result.records['02-04'],{cleared:true,legacy:true});
 assert(!canPlayMission(result,missionIndex('03-01'),false));
});
test('completed Bank preserves Lab entitlement without carrying rebuilt benchmark',()=>{
 const result=normalizeCampaign(save(29,'03-10',{'03-10':{cleared:true,bestTime:45,alerts:2}}));
 assert.equal(result.lastMission,'03-05');assert.equal(result.highestUnlocked,missionIndex('04-01'));
 assert.deepEqual(result.records['03-05'],{cleared:true,legacy:true});
 assert.deepEqual((result.legacyArchive!.original.records as Record<string,unknown>)['03-10'],{cleared:true,bestTime:45,alerts:2});
 assert(canPlayMission(result,missionIndex('04-01'),false));
});
test('all six later chapters retain IDs, reached unlocks and comparable unchanged-map times',()=>{
 for(let chapter=4;chapter<=9;chapter++){
  const id=`0${chapter}-01`,ordinal=30+(chapter-4)*5;
  const result=normalizeCampaign(save(ordinal,id,{[id]:{cleared:true,bestTime:61,alerts:1}}));
  assert.equal(result.lastMission,id);assert.equal(result.highestUnlocked,missionIndex(id)+1);
  assert.deepEqual(result.records[id],{cleared:true,bestTime:61,alerts:1});
 }
 const end=normalizeCampaign(save(59,'09-05'));
 assert.equal(end.highestUnlocked,54);assert.equal(end.lastMission,'09-05');
});
test('invalid or locked Continue IDs fall back to mapped highest unlock, archived original survives',()=>{
 for(const id of ['bad','01-11','03-10']){
  const result=normalizeCampaign(save(10,id));
  assert.equal(result.lastMission,'02-01');assert.equal(result.legacyArchive?.original.lastMission,id);
 }
});
test('all 60 original records including invalid extras survive archive while only valid entitlements enter campaign',()=>{
 const ids=Array.from({length:60},(_,i)=>i<30?`0${Math.floor(i/10)+1}-${String(i%10+1).padStart(2,'0')}`:`0${Math.floor((i-30)/5)+4}-${String((i-30)%5+1).padStart(2,'0')}`);
 const records=Object.fromEntries(ids.map(id=>[id,{cleared:true,bestTime:99,alerts:3}]));
 records['corrupt']={cleared:true,bestTime:99,alerts:3};
 const original=save(59,'09-05',records),snapshot=JSON.stringify(original),result=normalizeCampaign(original);
 assert.equal(Object.keys(result.records).length,45);assert.deepEqual(result.legacyArchive?.original,original);
 assert.equal(JSON.stringify(original),snapshot);assert(!result.records.corrupt);
});
test('v1 historical expansions precede compression and v7 normalization is byte-stable',()=>{
 const result=normalizeCampaign({version:1,highestUnlocked:7,lastMission:'02-03',records:{'02-02':{cleared:true,bestTime:70}}});
 assert.equal(result.legacyArchive?.expandedV4HighestUnlocked,12);assert.equal(result.lastMission,'02-01');assert.equal(result.highestUnlocked,missionIndex('02-03'));
 assert.equal(normalizeCampaign({version:1,highestUnlocked:44,records:{}}).highestUnlocked,54);
 assert.equal(JSON.stringify(normalizeCampaign(JSON.parse(JSON.stringify(result)))),JSON.stringify(result));
});
test('v2 historical expansions precede compression',()=>{
 const result=normalizeCampaign({version:2,highestUnlocked:15,lastMission:'03-01',records:{'03-01':{cleared:true,bestTime:55}}});
 assert.equal(result.legacyArchive?.expandedV4HighestUnlocked,20);assert.equal(result.highestUnlocked,missionIndex('03-02'));assert.equal(result.lastMission,'03-01');
 assert.equal(normalizeCampaign({version:2,highestUnlocked:49,records:{}}).highestUnlocked,54);
});
test('v3 historical Bank insertion retains Lab unlock exactly once',()=>{
 const result=normalizeCampaign({version:3,highestUnlocked:25,lastMission:'04-01',records:{'03-05':{cleared:true,bestTime:55}}});
 assert.equal(result.legacyArchive?.expandedV4HighestUnlocked,30);assert.equal(result.highestUnlocked,missionIndex('04-01'));assert.equal(result.lastMission,'04-01');
 assert.deepEqual(result.records['03-03'],{cleared:true,legacy:true});assert.deepEqual(normalizeCampaign(result),result);
});
test('new clears replace legacy benchmark with new result and preserve recovery archive',()=>{
 const migrated=normalizeCampaign(save(29,'03-10',{'03-10':{cleared:true,bestTime:20,alerts:0}}));
 const updated=completeMission(migrated,missionIndex('03-05'),80,2);
 assert.deepEqual(updated.records['03-05'],{cleared:true,bestTime:80,alerts:2});assert.equal(updated.lastMission,'04-01');
 assert.deepEqual(updated.legacyArchive,migrated.legacyArchive);
 const faster=completeMission(updated,missionIndex('03-05'),60,3);assert.deepEqual(faster.records['03-05'],{cleared:true,bestTime:60,alerts:2});
});
test('v5 never reinterprets stable IDs as old source IDs',()=>{
 const v5={version:5,highestUnlocked:9,lastMission:'02-04',records:{'02-04':{cleared:true,bestTime:20}}};
 const result=normalizeCampaign(v5);assert.equal(result.lastMission,'02-04');assert.deepEqual(result.records,v5.records);assert(!result.legacyArchive);
 assert.deepEqual(normalizeCampaign(result),result);
});

test('v5 ordinal unlocks map both Museum and Gallery insertions, preserving every reached later mission',()=>{
 for(let previous=0;previous<45;previous++){
  const id=`0${Math.floor(previous/5)+1}-0${previous%5+1}`;
  const source={version:5,lastMission:id,highestUnlocked:previous,records:{}};
  const result=normalizeCampaign(source);
  assert.equal(result.version,7);
  assert.equal(result.highestUnlocked,previous<5?previous:previous<10?previous+5:previous+10,id);
  assert.equal(result.lastMission,id);
  assert(canPlayMission(result,missionIndex(id),false));
  assert.deepEqual(normalizeCampaign(JSON.parse(JSON.stringify(result))),result);
 }
});

test('v5 clear entitlement survives insertion without fabricating clears or badges in new Museum slots',()=>{
 const source={version:5,lastMission:'02-01',highestUnlocked:5,records:{
  '01-05':{cleared:true,bestTime:32,alerts:1,mastery:{cleanEscape:true,personalBest:true}},
  '01-06':{cleared:true,bestTime:1,mastery:{cleanEscape:true}},
  '01-10':{cleared:true,bestTime:1},
 }};
 const result=normalizeCampaign(source);
 assert.equal(result.highestUnlocked,missionIndex('02-01'));
 assert.equal(result.lastMission,'02-01');
 assert.deepEqual(result.records['01-05'],source.records['01-05']);
 for(let mission=6;mission<=10;mission++){
  const id=`01-${String(mission).padStart(2,'0')}`;
  assert.equal(result.records[id],undefined);
  assert(canPlayMission(result,missionIndex(id),false));
 }
 const recovered=normalizeCampaign({version:5,highestUnlocked:4,lastMission:'01-05',records:{'01-05':{cleared:true}}});
 assert.equal(recovered.highestUnlocked,missionIndex('02-01'),'old earned Gallery remains open even with a stale ordinal');
 assert.equal(normalizeCampaign({version:5,highestUnlocked:4,lastMission:'01-05',records:{}}).highestUnlocked,4);
});

test('fresh version7 progression requires the new Museum missions before Gallery and survives save round trips',()=>{
 let progress=freshCampaign();
 assert.equal(progress.version,7);
 for(let index=0;index<10;index++){
  assert.equal(progress.lastMission,missionId(index));
  assert.equal(canPlayMission(progress,missionIndex('02-01'),false),false);
  progress=normalizeCampaign(JSON.parse(JSON.stringify(completeMission(progress,index,50-index,1,0))));
  assert.equal(progress.highestUnlocked,index+1);
  assert.equal(progress.records[missionId(index)].cleared,true);
 }
 assert.equal(progress.lastMission,'02-01');
 assert.equal(canPlayMission(progress,missionIndex('02-01'),false),true);
 assert.equal(progress.records['01-10'].mastery?.cleanEscape,true);
});

test('version6 Museum clears retain their badges and Museum ordinal while upgrading to version7',()=>{
 const source={version:6,lastMission:'01-08',highestUnlocked:7,records:{
  '01-07':{cleared:true,bestTime:42,alerts:0,mastery:{cleanEscape:true}},
 }};
 const result=normalizeCampaign(source);
 assert.deepEqual(result,{...source,version:7});
 assert.deepEqual(normalizeCampaign(result),result);
 assert.equal(result.highestUnlocked,7);
});

test('all version6 ordinal unlocks map to the same reached mission exactly once',()=>{
 const counts=[10,5,5,5,5,5,5,5,5];
 const ids=counts.flatMap((count,chapter)=>Array.from({length:count},(_,mission)=>`${String(chapter+1).padStart(2,'0')}-${String(mission+1).padStart(2,'0')}`));
 assert.equal(ids.length,50);
 for(const [previous,id] of ids.entries()){
  const source={version:6,lastMission:id,highestUnlocked:previous,records:{}};
  const result=normalizeCampaign(source);
  assert.equal(result.version,7);
  assert.equal(result.highestUnlocked,previous<15?previous:previous+5,id);
  assert.equal(result.lastMission,id);
  assert(canPlayMission(result,missionIndex(id),false));
  assert.deepEqual(normalizeCampaign(JSON.parse(JSON.stringify(result))),result);
 }
});

test('version6 Gallery clear retains earned Bank access without fabricating added clears',()=>{
 const archive={sourceVersion:4,original:{records:{historical:'keep'}},expandedV4HighestUnlocked:29};
 const source={version:6,lastMission:'02-05',highestUnlocked:14,legacyArchive:archive,records:{
  '01-10':{cleared:true,bestTime:42,alerts:0,mastery:{cleanEscape:true,personalBest:true}},
  '02-05':{cleared:true,bestTime:51,alerts:1},
  '02-06':{cleared:true,bestTime:1},
  '02-10':{cleared:true,bestTime:1},
 }};
 const snapshot=JSON.stringify(source),result=normalizeCampaign(source);
 assert.equal(result.highestUnlocked,missionIndex('03-01'));
 assert.equal(result.lastMission,'02-05');
 assert.deepEqual(result.records['01-10'],source.records['01-10']);
 assert.deepEqual(result.records['02-05'],source.records['02-05']);
 assert.deepEqual(result.legacyArchive,archive);
 for(let mission=6;mission<=10;mission++){
  const id=`02-${String(mission).padStart(2,'0')}`;
  assert.equal(result.records[id],undefined);
  assert(canPlayMission(result,missionIndex(id),false));
 }
 assert.equal(JSON.stringify(source),snapshot);
 assert.equal(normalizeCampaign({...source,records:{}}).highestUnlocked,14,'an uncleared 02-05 does not earn Bank access');
});

test('version5 Gallery clears retain Bank access across both chapter insertions',()=>{
 const result=normalizeCampaign({version:5,lastMission:'02-05',highestUnlocked:9,records:{
  '02-05':{cleared:true,bestTime:49,alerts:0},'02-06':{cleared:true,bestTime:1},
 }});
 assert.equal(result.highestUnlocked,missionIndex('03-01'));
 assert.equal(result.lastMission,'02-05');
 assert.deepEqual(result.records,{'02-05':{cleared:true,bestTime:49,alerts:0}});
 assert.deepEqual(normalizeCampaign(result),result);
});

test('fresh version7 Gallery progression requires all ten missions before Bank',()=>{
 let progress=freshCampaign();
 for(let index=0;index<20;index++){
  assert.equal(progress.lastMission,missionId(index));
  assert.equal(canPlayMission(progress,missionIndex('03-01'),false),false);
  progress=normalizeCampaign(JSON.parse(JSON.stringify(completeMission(progress,index,45,0,0))));
  assert.equal(progress.highestUnlocked,index+1);
 }
 assert.equal(progress.lastMission,'03-01');
 assert(canPlayMission(progress,missionIndex('03-01'),false));
 assert.equal(Object.keys(progress.records).length,20);
 assert.deepEqual(progress.records['02-10'],{cleared:true,bestTime:45,alerts:0},'Gallery does not gain Museum-only badge fields');
});

test('current version7 saves retain new Gallery clears and later chapter ordinals unchanged',()=>{
 for(const id of ['02-06','02-10','03-01','09-05']){
  const index=missionIndex(id);
  const source={version:7,lastMission:id,highestUnlocked:Math.min(MISSION_COUNT-1,index+1),records:{[id]:{cleared:true,bestTime:42,alerts:0}}};
  assert.deepEqual(normalizeCampaign(source),source);
  assert.deepEqual(normalizeCampaign(JSON.parse(JSON.stringify(normalizeCampaign(source)))),source);
 }
});

test('version6 malformed ordinals and nonexistent Continue IDs do not grant new access',()=>{
 const invalid=normalizeCampaign({version:6,lastMission:'02-10',highestUnlocked:NaN,records:{'02-10':{cleared:true},'corrupt':{cleared:true}}});
 assert.equal(invalid.highestUnlocked,0);assert.equal(invalid.lastMission,'01-01');assert.deepEqual(invalid.records,{});
 const clamped=normalizeCampaign({version:6,lastMission:'09-05',highestUnlocked:999,records:{}});
 assert.equal(clamped.highestUnlocked,54);assert.equal(clamped.lastMission,'09-05');
});
test('fresh and malformed data are safe without unintended chapter unlock',()=>{
 for(const input of [null,undefined,[],false])assert.deepEqual(normalizeCampaign(input),freshCampaign());
 const invalid=normalizeCampaign({version:4,highestUnlocked:NaN,lastMission:5,records:[]});
 assert.equal(invalid.highestUnlocked,0);assert.equal(invalid.lastMission,'01-01');
 assert.equal(migratedMissionId('01-11'),'');assert.equal(migratedMissionId('02-09'),'02-05');
});
test('pre-campaign ten-stage progress keeps stage8+9 destinations after compression',()=>{
 const result=migrateCampaign({currentStage:8,highestUnlocked:9,clearedStages:[0,8,9],bestTimes:{0:40,8:30,9:90},bestAlerts:{0:0,8:1,9:2}});
 assert.equal(result.lastMission,'08-05');assert.equal(result.highestUnlocked,missionIndex('09-02'));
 assert.equal(result.records['08-05'].bestTime,30);assert(result.records['08-05'].legacy);
 assert.equal(result.records['01-01'].bestTime,undefined);
});

test('runtime redirects match all60 approved migration-plan destinations',()=>{
 assert.equal(migrationPlan.mappings.length,60);
 for(const row of migrationPlan.mappings)assert.equal(migratedMissionId(row.oldId),row.progressDestination,row.oldId);
});

test('future numeric save preserves current IDs and benchmark without old-campaign remapping',()=>{
 const future={version:8,lastMission:'02-04',highestUnlocked:missionIndex('02-04'),records:{'02-04':{cleared:true,bestTime:20}},futureFlag:'keep'};
 const result=normalizeCampaign(future);
 assert.equal(result.lastMission,'02-04');assert.deepEqual(result.records,future.records);
 assert.deepEqual(result.legacyArchive?.original,future);
 assert.deepEqual(normalizeCampaign(JSON.parse(JSON.stringify(result))),result);
});
test('malformed records and unknown version preserve original for recovery',()=>{
 for(const version of [undefined,'corrupt',null,-1,1.5]){
  const original={version,highestUnlocked:10,lastMission:'02-01',records:[{bad:'data'}]};
  const result=normalizeCampaign(original);
  assert.equal(result.lastMission,'02-01');assert.deepEqual(result.records,{});
  assert.deepEqual(result.legacyArchive?.original,original);
  assert.deepEqual(normalizeCampaign(result),result);
 }
});

test('actual save/load pipeline persists archive and preferences through AsyncStorage JSON boundary',async()=>{
 const saved=new Map<string,string>(),originalGet=AsyncStorage.getItem,originalSet=AsyncStorage.setItem;
 AsyncStorage.getItem=async key=>saved.get(key)??null;
 AsyncStorage.setItem=async(key,value)=>{saved.set(key,value);};
 try{
  const source=save(29,'03-10',{'03-10':{cleared:true,bestTime:47,alerts:2}});
  const campaign=normalizeCampaign(source);
  await saveProgress({...DEFAULT_PROGRESS,campaign,hasStarted:true,language:'ko',musicEnabled:false});
  const loaded=await loadProgress(true);
  assert.deepEqual(loaded.campaign,campaign);assert.deepEqual(loaded.campaign?.legacyArchive?.original,source);
  assert.equal(loaded.hasStarted,true);assert.equal(loaded.language,'ko');assert.equal(loaded.musicEnabled,false);
  assert.equal(JSON.parse([...saved.values()][0]).campaign.version,7);
 }finally{AsyncStorage.getItem=originalGet;AsyncStorage.setItem=originalSet;}
});
