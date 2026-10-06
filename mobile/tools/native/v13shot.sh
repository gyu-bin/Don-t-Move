#!/bin/zsh
# Bake, wait for Metro fast refresh, capture and crop the whole-map view of the given missions.
# Usage: tools/native/v13shot.sh <tag> <mission>...
cd "$(dirname "$0")/../.." || exit 1
node --import tsx tools/campaign/v13Build.ts | tail -1 || exit 1
python3 -c "import time;time.sleep(7)"
tag=$1; shift
(cd tools/native && python3 v13MapShot.py $tag "$@") | tail -${#@}
for id in "$@"; do sips -c 1150 1206 --cropOffset 800 0 Reports/V13Phase1/sim/$id-$tag.png --out Reports/V13Phase1/sim/$id-$tag-crop.png >/dev/null 2>&1; done
