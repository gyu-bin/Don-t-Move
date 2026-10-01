/** All V5 evidence is immutable-source bound. Run with CAMPAIGN_JSON / OUT_DIR. */
import {execFileSync} from 'node:child_process';
const env={...process.env,TSX_TSCONFIG_PATH:'tools/sprites/tsconfig.runtime.json',CAMPAIGN_JSON:process.env.CAMPAIGN_JSON??'Reports/LevelDesignV5/before/campaignStages.json',OUT_DIR:process.env.OUT_DIR??'Reports/LevelDesignV5/before/render'};
for(const tool of ['tools/environment/v3Render.ts','tools/environment/v5Evidence.ts'])execFileSync(process.execPath,['--import','tsx',tool],{env,stdio:'inherit'});
