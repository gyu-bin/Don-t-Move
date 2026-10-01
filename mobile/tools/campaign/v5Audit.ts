import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditV5Geometry} from './v5Geometry';
import {assertV5Preservation} from './v5Preservation';
const defs:StageDefinition[]=JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON??'Reports/LevelDesignV5/candidate.json','utf8'));
const scope=assertV5Preservation(defs),reports=defs.filter(d=>(d.chapter??0)<=3).map(auditV5Geometry);
const issues=reports.flatMap(r=>r.issues.map(issue=>({id:r.id,issue})));
fs.writeFileSync('Reports/LevelDesignV5/geometry-audit.json',JSON.stringify({scope,reports,issues,qualityApproval:false},null,2)+'\n');
console.log(JSON.stringify({scope,issues}));if(issues.length)process.exitCode=1;
