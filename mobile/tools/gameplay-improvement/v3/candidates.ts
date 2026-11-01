/**
 * Gameplay Improvement v3 — level-structure candidates for 07-01 and 06-03 (patches on the finished mission, see
 * tools/campaign/v13Rework.ts). Nothing here reaches the campaign until a candidate is copied into REWORK.
 */
import type {ReworkPatch} from '../../campaign/v13Rework';

export const V3_CANDIDATES:Record<string,ReworkPatch>={
  // ---- 07-01 Loading Aisles. Base: mirror of 01-01 (west hall → wall gallery → south door of the collection, or the
  // court crossing), plus a crossing guard in each east gallery and two generated cameras.
  '07-01:A':{why:'Freight door: the lobby opens straight into the West Gallery, so the east aisles become an approach that reaches the collection from its north (foyer) door, behind the objective guard; the court crossing stays as the short line.',
    cells:[[17,13,'w'],[18,13,'w'],[19,13,'w']],
    routes:{risk:['lobby','westGallery','sideGallery','foyer','collection']},
    dropEdges:[['hall','court','risk'],['court','wallGallery','risk']],
    addEdges:[
      {from:'lobby',to:'westGallery',role:'risk',via:[{x:18.5,y:13.5}]},
      {from:'westGallery',to:'sideGallery',role:'risk',via:[{x:18,y:6.5}]},
      {from:'sideGallery',to:'foyer',role:'risk',via:[{x:14.5,y:3.5}]},
      {from:'foyer',to:'collection',role:'risk',via:[{x:8.5,y:3.5}]},
    ] as ReworkPatch['addEdges'],
    cover:{risk:['Lobby Security Desk','Side Wall','Side Wall Cases']},
    topology:'Loop'},
  // ---- 06-03 Private Courtyard. Base: mirror of 02-03 (zigzag through the glass hall, or the west-column short cut,
  // then the threshold door), escape down the stair or through the lab and the art store; crossing guards in the lab
  // and the store were added for the chapter.
  '06-03:A':{why:'Service wing: the entrance gallery opens into the art store, so the servants\' way (store → conservation lab → threshold) becomes an approach of its own, past the two crossing guards and the objective guard\'s step-out post; the glass hall zigzag stays.',
    cells:[[12,16,'b'],[12,17,'b'],[12,18,'b']],
    routes:{risk:['entrance','store','lab','threshold','privateGlass']},
    dropEdges:[['southLane','westColumn','risk'],['westColumn','northLane','risk']],
    addEdges:[
      {from:'entrance',to:'store',role:'risk',via:[{x:12.5,y:17.25}]},
      {from:'store',to:'lab',role:'risk',via:[{x:16,y:13.5}]},
      {from:'lab',to:'threshold',role:'risk',via:[{x:16.5,y:7.5}]},
    ] as ReworkPatch['addEdges'],
    cover:{risk:['Entrance Sculpture','Stored Art Wall','Lab Plinth North','Threshold Jamb']},
    topology:'Ring'},
  '07-01:B':{why:'Central breach: a three-wide opening (the court pier loses one cell) from the court into the foyer, right under the foyer camera, with its own lockdown door; the short line now ends at the collection\'s north door instead of the wall gallery, and the alarm shuts it.',
    cells:[[9,6,'t'],[10,6,'t'],[11,6,'t'],[11,7,'t']],
    routes:{risk:['lobby','hall','court','foyer','collection']},
    dropEdges:[['court','wallGallery','risk']],
    addEdges:[
      {from:'court',to:'foyer',role:'risk',door:{at:{x:10.5,y:6.5},orientation:'horizontal',lockdown:true,style:'warehouseIndustrial'}},
      {from:'foyer',to:'collection',role:'risk',via:[{x:8.5,y:3.5}]},
    ] as ReworkPatch['addEdges'],
    cover:{risk:['Lobby Security Desk','Court Statue','Foyer Pedestal']},
    topology:'Crossroads'},
  '06-03:B':{why:'West gate: the entrance gallery opens straight into the west end of the glass hall, so the east-turn column under the sweeping camera can be taken directly instead of after the south lane; the bench by the gate moves to the south wall.',
    cells:[[3,13,'a'],[4,13,'a']],
    routes:{risk:['entrance','eastTurn','northLane','threshold','privateGlass']},
    dropEdges:[['southLane','westColumn','risk'],['westColumn','northLane','risk']],
    addEdges:[{from:'entrance',to:'eastTurn',role:'risk',via:[{x:4,y:13.5},{x:4,y:7.5}]}] as ReworkPatch['addEdges'],
    structures:{'Entrance Bench':{x:2.05,y:18.6}},
    cover:{risk:['Entrance Sculpture','East Turn Sculpture','Bay Sculpture','Threshold Jamb']},
    topology:'Zigzag with west gate'},
};


/** C = A and B together (both connections open). The risk route is A's; B's line is measured as an extra route. */
const both=(a:ReworkPatch,b:ReworkPatch,why:string):ReworkPatch=>({...a,why,cells:[...(a.cells??[]),...(b.cells??[])],
  dropEdges:[...new Map([...(a.dropEdges??[]),...(b.dropEdges??[])].map(e=>[e.join('|'),e])).values()],
  addEdges:[...(a.addEdges??[]),...(b.addEdges??[]).filter(e=>!(a.addEdges??[]).some(x=>x.from===e.from&&x.to===e.to))],
  structures:{...a.structures,...b.structures}});
V3_CANDIDATES['07-01:C']=both(V3_CANDIDATES['07-01:A'],V3_CANDIDATES['07-01:B'],'Freight door and central breach together: three lines into two collection doors.');
V3_CANDIDATES['06-03:C']=both(V3_CANDIDATES['06-03:A'],V3_CANDIDATES['06-03:B'],'Service wing and west gate together: three ways from the entrance to the threshold.');

/** Extra routes measured per candidate: the risk route (testRoutes[1]) of the named candidates. */
export const V3_EXTRA_ROUTES:Record<string,string[]>={'07-01:C':['07-01:B'],'06-03:C':['06-03:B']};

// ---- Refinements of C: make the new lines readable (measured blind-run windows were 0 % for Sneak/Walk).
/** 07-01 D0: C, with the West Gallery plank stack half a tile west so the freight line climbs the east side of the gallery
 *  (out of the gallery camera's cone) instead of passing under it. */
V3_CANDIDATES['07-01:D0']={...V3_CANDIDATES['07-01:C'],why:'C, and the plank stack in the West Gallery moves half a tile west: the freight line climbs the east side of the gallery, out of the gallery camera\'s cone, and crosses the gallery guard\'s beat once.',
  structures:{'Side Wall':{x:17.5}},
  addEdges:[...(V3_CANDIDATES['07-01:C'].addEdges??[]).filter(e=>!(e.from==='westGallery'&&e.to==='sideGallery')),
    {from:'westGallery',to:'sideGallery',role:'risk',via:[{x:20,y:11.5},{x:20,y:7.75},{x:18.75,y:7.75},{x:18.75,y:6.5}]}] as ReworkPatch['addEdges']};
V3_EXTRA_ROUTES['07-01:D0']=['07-01:B'];
/** 06-03 D0: A, with the service door at the NORTH end of the entrance's east wall: the thief comes into the art store
 *  above the stored-art screen (which hides him from the store guard's beat) and goes straight on into the lab. */
V3_CANDIDATES['06-03:D0']={...V3_CANDIDATES['06-03:A'],why:'Service door at the north end of the entrance gallery\'s east wall: into the art store above the stored-art screen, which hides the door from the store guard, then into the conservation lab.',
  cells:[[12,13,'b'],[12,14,'b'],[12,15,'b']],
  addEdges:[{from:'entrance',to:'store',role:'risk',via:[{x:12.5,y:14.6}]},{from:'store',to:'lab',role:'risk',via:[{x:15.5,y:13.5}]},
    {from:'lab',to:'threshold',role:'risk',via:[{x:16.5,y:7.5}]}] as ReworkPatch['addEdges']};
/** 06-03 D1: A, and the art store and lab are re-laid so the service line passes BESIDE each crossing guard's beat
 *  instead of along it (guard cones are ±30°): the stored-art screen is shortened and moved to the store's west half,
 *  the store guard walks the store's east edge, the lab guard the lab's west side. */
V3_CANDIDATES['06-03:D1']={...V3_CANDIDATES['06-03:A'],why:'A, with the art store and the lab re-laid: a shorter stored-art screen in the west half of the store, the store guard on the store\'s east edge and the lab guard on the lab\'s west side, so the service line runs beside each beat, not along it.',
  structures:{'Stored Art Wall':{x:14.05,scale:1.5}},
  guards:{1:{stops:[{x:13.75,y:8.5,look:{x:13.75,y:12.5},wait:3},{x:13.75,y:12.5,look:{x:13.75,y:8.5},wait:3}]},
    2:{stops:[{x:17.5,y:14.5,look:{x:17.5,y:18},wait:3},{x:17.5,y:18,look:{x:17.5,y:14.5},wait:3}]}}};

/** 06-03 E: Courtyard ring. The glass zigzag (two see-through glass walls) becomes a solid courtyard block in the middle
 *  of the hall: the thief goes round it on the camera side (west) or the guard side (east), keeps the block between
 *  himself and the hall guard, and can break a chase by circling it. The glass walls and the middle sculpture go; the
 *  camera moves from the (now walled) east-turn corner to the north wall over the west lane. */
V3_CANDIDATES['06-03:E']={why:'Courtyard ring: a solid courtyard block replaces the glass zigzag; both lanes run round it, one under the camera, one on the hall guard\'s walk.',
  cells:[4,5,6,7,8].flatMap(x=>[5,6,7,8].map(y=>[x,y,'#'] as [number,number,string])),
  structures:{'Lower Glass West':null,'Lower Glass East':null,'Upper Glass West':null,'Upper Glass East':null,'Middle Lane Sculpture':null,'South Lane Art Wall':{y:9.77}},
  routes:{approach:['entrance','southLane','eastTurn','northLane','threshold','privateGlass'],risk:['entrance','southLane','westColumn','northLane','threshold','privateGlass']},
  dropEdges:[['eastTurn','northLane','approach'],['southLane','westColumn','risk'],['westColumn','northLane','risk']],
  addEdges:[{from:'eastTurn',to:'northLane',role:'approach',via:[{x:2,y:3.5}]},
    {from:'southLane',to:'westColumn',role:'risk',via:[{x:10.5,y:11.25}]},{from:'westColumn',to:'northLane',role:'risk',via:[{x:10.5,y:3.5}]}] as ReworkPatch['addEdges'],
  zones:{e:{hub:{x:2,y:7.5}},m:{hub:{x:10.5,y:7.5}}},
  cameras:{0:{at:{x:2.5,y:1.4},facing:1.5708,watches:'The west lane of the courtyard ring, from the north wall'}},
  cover:{safe:['Entrance Sculpture','South Lane Art Wall','Bay Sculpture','Threshold Jamb'],risk:['South Lane Art Wall','Bay Sculpture']},
  topology:'Ring'};
/** 06-03 E2: E with a two-row courtyard island (rows 6–7): a wall island thicker than two cells renders a void inside
 *  (cells with no floor beside them are drawn as outside), so the island is 5 × 2 with the bookshelf against its south face. */
V3_CANDIDATES['06-03:E2']={...V3_CANDIDATES['06-03:E'],why:'Courtyard ring with a 5 × 2 island (a thicker block renders a void inside): both lanes run round it, one under the camera, one on the hall guard\'s walk.',
  cells:[4,5,6,7,8].flatMap(x=>[6,7].map(y=>[x,y,'#'] as [number,number,string])),
  structures:{...V3_CANDIDATES['06-03:E'].structures,'South Lane Art Wall':{y:8.77}}};
/** 07-01 D1: D0, and the side-gallery guard (found by securitySearch, seed 3, #12) watches the West Gallery opening from
 *  mid-gallery, then walks to the foyer corner and looks back: the freight line gets a window behind his walk. */
V3_CANDIDATES['07-01:D1']={...V3_CANDIDATES['07-01:D0'],why:'D0, and the side-gallery guard watches the West Gallery opening from mid-gallery, then walks to the foyer corner and looks back, so the freight line has a window behind his walk.',
  guards:{1:{watches:'The West Gallery opening from mid-gallery, then the side gallery from the foyer corner',stops:[{x:17.5,y:4.5,look:{x:18.75,y:6.5},wait:3},{x:15.5,y:1.5,look:{x:17.5,y:4.5},wait:3}]}}};
/** 07-01 D1b: D0 with search result #6 (watches the foyer mouth, then the gallery from its north-east corner). */
V3_CANDIDATES['07-01:D1b']={...V3_CANDIDATES['07-01:D0'],why:'D0, and the side-gallery guard watches the foyer mouth, then the gallery from its north-east corner.',
  guards:{1:{watches:'The foyer mouth, then the side gallery from its north-east corner',stops:[{x:16.5,y:4.5,look:{x:14.5,y:4},wait:2},{x:20.5,y:2.5,look:{x:16.5,y:4.5},wait:2}]}}};
V3_EXTRA_ROUTES['07-01:D1']=['07-01:B']; V3_EXTRA_ROUTES['07-01:D1b']=['07-01:B'];
