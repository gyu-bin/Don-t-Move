import type { V13Mission, V13Structure } from './v13Types';
import { distinctSecurityFloor, patrol, surveillance } from './v13HqDistinct';

const crate = (name: string, x: number, y: number, scale = 1.15): V13Structure =>
  ({ name, x, y, scale, kind: 'equipment', asset: 'vault_armored_crate', roles: ['hiding', 'losBreak'] });
const cases = (name: string, x: number, y: number, scale = 1.2): V13Structure =>
  ({ name, x, y, scale, kind: 'equipment', asset: 'vault_black_cases', roles: ['hiding', 'losBreak'] });
const screen = (name: string, x: number, y: number, scale = 1): V13Structure =>
  ({ name, x, y, scale, kind: 'labMonitorStation', asset: 'vault_blast_screen', roles: ['hiding', 'losBreak'] });

const bullionSpine = distinctSecurityFloor({
  id: '09-03', title: 'Layered Vault Spine',
  topology: 'Transverse bullion spine with a north-side vault and a separate perimeter freight turn after lockdown',
  rooms: [
    ['e','West intake','public',1,9,7,6], ['t','Transfer audit','restricted',1,1,7,6],
    ['u','Upper record checks','restricted',10,1,7,6], ['c','Direct bullion crossing','restricted',10,9,7,6],
    ['o','North bullion vault','objective',19,1,7,6,{x:20.6,y:5.7}], ['j','Armoured transfer junction','restricted',19,9,7,6],
    ['p','East blast-lock recess','escape',28,1,7,6], ['a','Clearance loading gallery','escape',28,9,7,6],
    ['v','Freight stair','escape',28,17,7,6], ['l','Bullion sorting spine','escape',19,17,7,6],
    ['x','South transport exit','escape',10,17,7,6],
  ],
  links: [
    ['A','e','t',2], ['B','t','u',3], ['C','u','o',4,false],
    ['D','e','c',10], ['E','c','j',12], ['F','j','o',19], ['G','j','l',22,true],
    ['H','l','x',19], ['I','o','p',4], ['J','p','a',30], ['K','a','v',31], ['L','v','l',20],
    ['M','u','c',12], ['N','j','a',10],
  ],
  entry:{x:2.2,y:13.3}, objective:{x:20.2,y:4.6}, exit:{x:11.4,y:21.4}, entryEdge:'left', exitEdge:'bottom',
  lanes:{
    approach:'e A t B u C o', risk:'e D c E j F o',
    quickEscape:'o F j G l H x', alternateEscape:'o I p J a K v L l H x',
  },
  piers:[['Bullion chamber masonry',22,1,1,4]],
  structures:[
    cases('Intake case shoulder',5.9,13.5), screen('Audit blast screen',4.5,2.9),
    crate('Record case',13.5,2.3), screen('Bullion crossing screen',13.4,10.2),
    cases('Armoured transfer case',24.0,12.3), crate('Blast-lock recess case',32.7,2.5),
    screen('Clearance control screen',30.1,11.9), crate('Freight stair crate',31.5,20.5),
    cases('Sorting spine case island',22.2,20.4), crate('Transport exit case',14.7,21.7),
  ],
  guards:[
    patrol('restricted','t','Reads audit receipts along the upper edge, with brief checks of the entry stair.',[7.1,1.9,5.0,2.9,2],[2.1,1.9,2.1,3.9,4]),
    patrol('crossing','u','Inspects records from the north aisle and checks the vault threshold from the east end.',[11.0,1.8,13,2.4,2],[16.0,1.8,17.7,4,4]),
    patrol('crossing','j','Faces the lower transfer gate from an east-side post, then turns to the loading panel.',[25.2,13.8,22.5,14,2],[25.2,10.5,26.9,10.5,4]),
    patrol('escape','a','Reads freight clearance from the west wall, watching the upper landing before moving to the loading panel.',[29.05,10.3,31.5,8,2],[29.05,13.8,28,13.8,4]),
    patrol('escape','l','Checks the sorting gate from the north shoulder, then looks across the east sorting head.',[20.4,18.0,22.5,16.0,2],[25.0,18.0,25.8,17,4]),
    patrol('objective','o','Reads the stand from the west shoulder and checks the upper service panel before returning.',[21.1,4.0,20.2,4.6,2],[20.0,1.9,19.3,1.9,5]),
  ],
  cameras:[
    surveillance('c',10.4,12.5,0,'Sweeps the exposed bullion crossing through the centre of the facility.'),
    surveillance('p',34.6,4.8,Math.PI,'Observes the east blast-lock turn into freight.'),
    surveillance('v',34.6,18.4,Math.PI,'Watches the upper part of the freight stair near its landing.'),
  ],
  cover:{safe:['Intake case shoulder','Audit blast screen','Record case','Bullion chamber masonry'],risk:['Bullion crossing screen','Armoured transfer case'],escape:['Bullion chamber masonry','Blast-lock recess case','Freight stair crate','Sorting spine case island']},
}, 'Vault');

const nestedAudit = distinctSecurityFloor({
  id:'09-05',title:'Final Vault Core',
  topology:'Nested audit and clearing wings approach a lower core; freight routing breaks from the direct blast-lock return',
  rooms:[
    ['e','West audit arrival','public',1,9,7,6], ['f','Audit reception','restricted',10,9,7,6],
    ['a','Senior records','restricted',10,1,7,6], ['b','Upper verifier hall','restricted',19,1,7,6],
    ['c','Verifier overlooks','transition',28,1,7,6], ['p','Clearing wing','restricted',19,9,7,6],
    ['q','Transfer office','restricted',28,9,7,6], ['g','Exposed west control','restricted',1,17,7,6],
    ['h','Blast-lock approach','restricted',10,17,7,6], ['o','Final vault core','objective',19,17,7,6,{x:23.7,y:21.7}],
    ['i','East freight intake','escape',28,17,7,6], ['x','Southwest emergency exit','escape',1,25,7,6],
    ['j','Release cage','escape',10,25,7,6], ['k','Freight bypass','escape',19,25,7,6], ['l','Lower dispatch','escape',28,25,7,6],
  ],
  links:[
    ['A','e','f',10], ['B','f','a',11], ['C','a','b',2], ['D','b','p',22], ['E','p','o',23,false],
    ['F','e','g',3], ['G','g','h',20], ['H','h','o',20], ['I','g','x',3,true],
    ['J','o','i',18], ['K','i','l',31], ['L','l','k',26], ['M','k','j',27], ['N','j','x',26],
    ['O','p','q',10], ['P','q','i',30], ['Q','b','c',3], ['R','c','q',30],
  ],
  entry:{x:2.2,y:12.6}, objective:{x:24.15,y:20.2}, exit:{x:2.3,y:29.6}, entryEdge:'left', exitEdge:'bottom',
  lanes:{approach:'e A f B a C b D p E o',risk:'e F g G h H o',quickEscape:'o H h G g I x',alternateEscape:'o J i K l L k M j N x'},
  piers:[['Deep core blind side',22,17,1,4]],
  structures:[
    cases('Audit arrival cases',7.4,12.6), screen('Reception sorting bench',15.4,12.7), cases('Senior records pallet',13.8,5.4),
    crate('Verifier hall shield',21.0,4.3), cases('Overlook instrument crates',30.2,4.8), screen('Clearing screen',21.4,12.1),
    crate('Transfer floor case',31.6,12.7), screen('West control partition',5.7,19.7), crate('Blast-lock protective case',13.9,20.3),
    screen('Freight intake blast screen',30.4,21.0), crate('Dispatch case island',32.0,28.6), cases('Freight bypass corner',22.6,28.6),
    crate('Release cage bench',13.8,27.4), cases('Exit safety cabinet',5.6,28.5),
  ],
  guards:[
    patrol('restricted','f','Checks the audit queue from the south end and sweeps the upper threshold at the return.',[15.9,14.1,13.9,14.1,2],[11.4,14.1,11.4,15.2,4]),
    patrol('crossing','g','Faces the blast-lock approach from the west post, then rotates toward the intake.',[2.0,21.9,5.9,21.9,2],[2.0,18.1,3.1,16.8,4]),
    patrol('restricted','p','Checks the clearing screen from its far west edge, then looks north at the verifier.',[19.8,13.7,23.5,13.7,2],[19.8,10.0,21.3,9.1,4]),
    patrol('escape','i','Checks the intake doors from the east wall and moves above the freight exit.',[34.2,20.6,31.9,22.1,2],[34.2,18.0,34.8,18.0,4]),
    patrol('escape','k','Patrols the lower bypass between the landing and the release-cage door.',[25.0,30.2,23.0,30.2,2],[20.0,30.2,18.9,30.2,4]),
    patrol('objective','o','Checks the core stand from the east and later moves up to the inspection panel.',[25.2,20.3,24.15,20.2,2],[25.2,17.8,26.3,17.8,5]),
  ],
  cameras:[
    surveillance('g',7.6,18.4,Math.PI,'Sweeps the short west approach where the arrival steps meet the blast lock.'),
    surveillance('q',34.6,13.8,Math.PI,'Guards the optional transfer office and upper side of the freight path.'),
    surveillance('l',34.6,29.9,Math.PI,'Watches the southern dispatch floor across the long lockdown route.'),
  ],
  cover:{safe:['Audit arrival cases','Reception sorting bench','Verifier hall shield','Clearing screen'],risk:['West control partition','Blast-lock protective case','Deep core blind side'],escape:['Deep core blind side','Freight intake blast screen','Freight bypass corner','Release cage bench']},
},'Vault');

export const V13_VAULT_DISTINCT: V13Mission[] = [bullionSpine,nestedAudit];
