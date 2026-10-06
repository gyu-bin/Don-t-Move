/**
 * Proof for an art-only pass: compares two campaign files with every picture id removed. Anything left that
 * differs (a position, a scale, a kind, a guard, a camera, a route, a door) is printed.
 * Usage: node --import tsx tools/campaign/v13ArtOnlyDiff.ts <before.json> [<after.json>]
 */
import fs from 'node:fs';
const strip=(v:unknown):unknown=>Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v as object).filter(([k])=>k!=='visualAssetId'&&k!=='objectiveVisualAssetId').map(([k,x])=>[k,strip(x)])):v;
const read=(f:string)=>JSON.parse(fs.readFileSync(f,'utf8')) as {id:string;props:{visualAssetId?:string}[]}[];
const before=read(process.argv[2]),after=read(process.argv[3]??'src/game/levels/stages/campaignStages.json');let changed=0;
for(const a of after){const b=before.find(q=>q.id===a.id)!,same=JSON.stringify(strip(a))===JSON.stringify(strip(b));
 const art=a.props.filter((p,i)=>p.visualAssetId!==b.props[i]?.visualAssetId).length;
 if(!same){changed++;console.log(a.id,'DIFFERS beyond art');}else if(art)console.log(a.id,`art only: ${art} of ${a.props.length} pieces repainted`);}
console.log(changed?`${changed} missions differ beyond art`:'no mission differs beyond art');
