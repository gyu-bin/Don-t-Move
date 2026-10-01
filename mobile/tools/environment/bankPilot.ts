/** Separate Bank kit acceptance fixture. Never added to campaign/progression. */
import type {PropDef,PropKind,StageDefinition} from '../../src/game/levels/StageDefinition';
import type {EnvironmentAssetId} from '../../src/assets/environmentKit';
const prop=(kind:PropKind,id:EnvironmentAssetId,x:number,y:number):PropDef=>({kind,visualAssetId:id,x,y});
const p=(x:number,y:number)=>({x,y});
export const BANK_PILOT:StageDefinition={
 id:'bank-pilot',number:0,title:'Bank Environment Pilot',theme:'bank',
 testPurpose:'Independent Bank kit acceptance fixture; not Chapter03 mission production or progression.',
 layout:Array.from({length:24},(_,y)=>y===0||y===23?'####################':y===12?'#########..#########':'#..................#'),
 playerSpawn:{x:4,y:21,facing:-Math.PI/2},
 objective:{kind:'vaultGem',x:13,y:4.5},exit:{x:16.5,y:20.5,w:1,h:1},
 landmark:{name:'Main Vault',kind:'bankMainVault',x:13,y:3},
 props:[
  prop('bankWall','bank_wall',4,6.5),
  prop('bankStaffDoor','bank_staff_door',17,12.5),
  prop('bankSecurityGate','bank_security_gate',10,12.5),
  prop('bankVaultCorridorWall','bank_vault_corridor_wall',16,6.5),
  prop('bankTellerCounter','bank_teller_counter',9.5,18),
  prop('bankSecurityCheckpoint','bank_security_checkpoint',13,10),
  prop('bankDepositBoxWall','bank_deposit_box_wall',4,4),
  prop('bankCashProcessingTable','bank_cash_processing_table',5,9),
  prop('bankVaultDoor','bank_vault_door',17.75,3),
  prop('bankOfficeDesk','bank_office_desk',15,16),
  prop('bankFilingCabinet','bank_filing_cabinet',5.5,16),
  prop('bankCashCart','bank_cash_cart',16,18.5),
  prop('bankQueueBarrier','bank_queue_barrier',5.5,20),
  prop('bankSmallSafe','bank_small_safe',16,9),
  prop('bankMonitor','bank_monitor',13,10),
  prop('bankClock','bank_clock',5,1.6),
  prop('bankPaperwork','bank_paperwork',15,15.65),
  prop('bankFloorMarker','bank_floor_marker',10,14),
  prop('bankPlant','bank_plant',1.25,21),
  prop('bankMainVault','bank_main_vault',13,3),
 ],
 lights:[{x:9.5,y:20,radius:7,kind:'warm',intensity:.5},{x:10,y:12,radius:5,kind:'cool',intensity:.55},
  {x:13,y:4.5,radius:5,kind:'cyan',intensity:.4},{x:4,y:5,radius:4,kind:'warm',intensity:.3}],
 ambientDarkness:.22,
 guards:[
  {id:'pilot-public',x:13.5,y:20.5,facing:Math.PI,routeId:'public',visionRange:4.8,visionHalfAngle:.6,theftRole:'exit',theftPosts:[p(14,20.5),p(10,14)]},
  {id:'pilot-security',x:17,y:10.5,facing:Math.PI/2,routeId:'security',visionRange:5.2,visionHalfAngle:.6,theftRole:'objective',theftPosts:[p(13,4.5),p(10,10.5)]},
 ],
 patrolRoutes:[
  {id:'public',mode:'loop',points:[{...p(13.5,20.5),wait:.6,look:Math.PI},{...p(12,20.5),wait:.6,look:-Math.PI/2},{...p(12,14.5),wait:.8,look:Math.PI/2},{...p(13.5,14.5),wait:.6,look:Math.PI}]},
  {id:'security',mode:'loop',points:[{...p(17,10.5),wait:.7,look:Math.PI},{...p(17,7),wait:.7,look:Math.PI},{...p(15,7),wait:.8,look:Math.PI/2},{...p(15,10.5),wait:.8,look:Math.PI}]},
 ],
 testRoutes:[
  {name:'main: teller side → staff gate → vault approach',points:[p(4,21),p(12,21),p(12,19),p(12,14),p(10,14),p(10,10.5),p(10,4.5),p(13,4.5)]},
  {name:'safe: filing cover → counter rear → security observation',points:[p(4,21),p(3,21),p(3,14),p(10,14),p(10,10.5),p(8,10.5),p(8,4.5),p(13,4.5)]},
  {name:'risk: shorter direct checkpoint crossing',points:[p(4,21),p(7.4,21),p(7.4,18.5),p(7.4,14),p(10,14),p(10,10.5),p(10,4.5),p(13,4.5)]},
 ],
 escapeRoutes:[{name:'vault → gate → public hall exit',points:[p(13,4.5),p(10,4.5),p(10,14),p(12,14),p(12,19),p(17,19),p(17,21)]}],
 safeZones:[{x:5.5,y:16.5,radius:.55},{x:3,y:7,radius:.55}],
};
export const BANK_CAMERA_MOUNTS=[{name:'checkpoint',x:11,y:12},{name:'vault-corridor',x:17,y:6},{name:'public-hall',x:18,y:20}];
