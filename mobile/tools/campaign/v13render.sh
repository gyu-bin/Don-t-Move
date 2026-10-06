#!/bin/zsh
# Compose the given V13 missions and draw them with the real game renderer (offline, whole map, 40 px per tile).
# Usage: tools/campaign/v13render.sh <mission>...   → Reports/V13Phase2/render/<id>-OPEN-DebugOFF.png
cd "$(dirname "$0")/../.." || exit 1
out=Reports/V13Phase2/render; mkdir -p $out
V13_IDS="$*" node --import tsx -e "
import fs from 'node:fs';import raw from './docs/design/v12/phase4d/SOURCE_STAGES.json';
import {composeV13} from './tools/campaign/v13Builder';import {V13_MISSIONS} from './tools/campaign/v13Build';
const ids=process.env.V13_IDS!.split(' ');
fs.writeFileSync('$out/cand.json',JSON.stringify(V13_MISSIONS.filter(m=>ids.includes(m.id)).map(m=>composeV13(m,raw as any))));" || exit 1
CAMPAIGN_JSON=$out/cand.json QA_OUT=$out TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/renderV124c.ts 2>&1 | grep -E "^[0-9]{2}-[0-9]{2}"
