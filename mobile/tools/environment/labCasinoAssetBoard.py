"""Independent QA boards from runtime PNG files; never imported by the application.
Pixel checks cannot certify style, absence of text, or physical footprint semantics.
"""
import json
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'Reports/LabCasinoKitV1'
OUT.mkdir(parents=True, exist_ok=True)
GROUPS = {
    'lab': {
        'architecture': 'wall glass_wall sliding_door glass_corridor sterile_partition',
        'major': 'experiment_machine large_table cryo_unit equipment_rack sample_storage observation_console',
        'soft': 'workstation cart sample_case small_machine stool',
        'decoration': 'monitor warning_sign specimen_container cable wall_screen floor_marker',
        'landmark': 'prototype_machine cryo_chamber central_experiment observation_room',
    },
    'casino': {
        'architecture': 'wall velvet_partition gold_arch vip_door bar_counter',
        'major': 'slot_bank roulette_table blackjack_table cashier_cage bar_island security_station',
        'soft': 'slot_machine chair cocktail_table divider chip_cart',
        'decoration': 'chandelier wall_art drink_tray neon_sign_generic carpet_pattern chip_stack',
        'landmark': 'roulette_centerpiece high_roller_table cashier_vault vip_room',
    },
}
manifest = json.loads((ROOT / 'assets/environment/environment-assets.json').read_text())
specs = {a['id']: a for a in manifest['assets']}
result = {'method': 'Actual runtime PNG alpha/bounds inspection; review-only boards. No semantic, native or FPS approval.', 'chapters': []}
for chapter, groups in GROUPS.items():
    entries = [(f'{chapter}_{name}', category) for category, names in groups.items() for name in names.split()]
    board = Image.new('RGB', (1500, 7*360), '#14212a')
    small = Image.new('RGB', (1500, 7*360), '#14212a')
    draw, small_draw = ImageDraw.Draw(board), ImageDraw.Draw(small)
    checks = []
    for i, (ident, category) in enumerate(entries):
        x, y = (i % 4)*375, (i // 4)*360
        sx, sy = (i % 4)*375, (i // 4)*360
        for d, yy, height in [(draw, y, 360), (small_draw, sy, 360)]:
            d.rectangle((x+5, yy+5, x+370, yy+height-5), fill='#23343e', outline='#48606b')
        spec = specs.get(ident)
        path = ROOT / (spec['path'] if spec else f'assets/environment/{chapter}/{category}/{ident}.png')
        row = {'id': ident, 'category': category, 'path': str(path.relative_to(ROOT)), 'registered': spec is not None, 'errors': []}
        if not path.exists():
            row['errors'].append('MISSING_FILE')
            draw.text((x+15,y+30), 'PENDING: '+ident, fill='#ffb084')
            small_draw.text((sx+15,sy+30), 'PENDING: '+ident, fill='#ffb084')
            checks.append(row)
            continue
        src = Image.open(path)
        rgba = src.convert('RGBA')
        alpha = rgba.getchannel('A')
        bounds = alpha.getbbox()
        if src.mode != 'RGBA': row['errors'].append('NOT_RGBA')
        if src.format != 'PNG': row['errors'].append('NOT_PNG')
        if not bounds: row['errors'].append('EMPTY_ALPHA')
        pixels = list(alpha.get_flattened_data())
        transparent = sum(a == 0 for a in pixels)
        if not transparent: row['errors'].append('NO_TRANSPARENCY')
        edge_pixels = sum(alpha.getpixel((xx, yy)) > 0 for yy in range(src.height) for xx in range(src.width) if xx in (0,src.width-1) or yy in (0,src.height-1))
        if edge_pixels: row['errors'].append('EDGE_TOUCHING_OBJECT')
        row.update(mode=src.mode, resolution=[src.width,src.height], alphaBounds=bounds, transparentFraction=transparent/(src.width*src.height), edgePixels=edge_pixels, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        if spec:
            row.update(drawWidth=spec['drawWidth'], defaultScale=spec['defaultScale'], collision=spec['collision'], losBehavior=spec['losBehavior'], footprint=spec['footprint'])
            if [src.width,src.height] != [spec['resolution']['width'],spec['resolution']['height']]: row['errors'].append('REGISTRY_RESOLUTION_MISMATCH')
        if bounds:
            crop = rgba.crop(bounds)
            large = crop.copy()
            large.thumbnail((340,250), Image.Resampling.LANCZOS)
            board.paste(large, (x+(375-large.width)//2,y+20+(250-large.height)//2), large)
            world_width = round(spec['drawWidth']*spec['defaultScale']*40) if spec else 0
            if world_width:
                object_bounds = spec.get('objectBounds')
                runtime_crop = rgba.crop((object_bounds['x'], object_bounds['y'], object_bounds['x']+object_bounds['w'], object_bounds['y']+object_bounds['h'])) if object_bounds else crop
                runtime = runtime_crop.resize((world_width, max(1,round(runtime_crop.height*world_width/runtime_crop.width))), Image.Resampling.LANCZOS)
                small.paste(runtime, (sx+(375-runtime.width)//2,sy+285-runtime.height), runtime)
            else:
                small_draw.text((sx+15,sy+80), 'Awaiting world-scale metadata', fill='#ffb084')
            row['runtimeWidthWorldUnits'] = world_width
        draw.text((x+15,y+286),ident,fill='#eef1ed')
        draw.text((x+15,y+307),f'{src.width}x{src.height} | {category}',fill='#9ebfc9')
        draw.text((x+15,y+328),f'World width {row.get("runtimeWidthWorldUnits",0)} | '+('CHECK' if row['errors'] else 'alpha OK'),fill='#9ebfc9')
        small_draw.text((sx+15,sy+307),ident,fill='#eef1ed')
        small_draw.text((sx+15,sy+328),'1 world unit = 1 pixel; no scale fitting',fill='#9ebfc9')
        checks.append(row)
    board.save(OUT / f'{chapter.capitalize()}-26-Sprite-Catalog.png')
    small.save(OUT / f'{chapter.capitalize()}-26-World-Scale.png')
    result['chapters'].append({'chapter':chapter,'expected':len(entries),'present':sum('MISSING_FILE' not in c['errors'] for c in checks),'invalid':sum(bool(c['errors']) for c in checks),'assets':checks})
(OUT / 'sprite-alpha-review.json').write_text(json.dumps(result,indent=2)+'\n')
print([(c['chapter'],c['present'],c['invalid']) for c in result['chapters']])
