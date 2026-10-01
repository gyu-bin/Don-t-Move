"""Review board derived from approved runtime PNGs. Never used as a runtime asset."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'Reports/BankKitV1'
OUT.mkdir(parents=True, exist_ok=True)
FILES = sorted((ROOT / 'assets/environment/bank').glob('*/*.png'))
FILES = [p for p in FILES if p.parent.name != '_source']
board = Image.new('RGB', (1500, 5 * 360), '#14212a')
draw = ImageDraw.Draw(board)
checks = []
manifest = json.loads((ROOT / 'assets/environment/environment-assets.json').read_text())
asset_specs = {a['id']: a for a in manifest['assets']}
for i, path in enumerate(FILES):
    src = Image.open(path)
    rgba = src.convert('RGBA')
    alpha = rgba.getchannel('A')
    bounds = alpha.getbbox()
    x, y = (i % 4) * 375, (i // 4) * 360
    draw.rectangle((x+5,y+5,x+370,y+355), fill='#23343e', outline='#48606b')
    crop = rgba.crop(bounds)
    crop.thumbnail((340, 255), Image.Resampling.LANCZOS)
    board.paste(crop, (x + (375-crop.width)//2, y+20+(255-crop.height)//2), crop)
    draw.text((x+15,y+286), path.stem, fill='#eef1ed')
    draw.text((x+15,y+306), f'{src.width}x{src.height} | {path.parent.name}', fill='#9ebfc9')
    spec = asset_specs.get(path.stem, {})
    world_width = spec.get('drawWidth', 0) * spec.get('defaultScale', 1) * 40
    draw.text((x+15,y+328), f'Runtime width {world_width:g} world units', fill='#9ebfc9')
    # Alpha edges are checked directly, not inferred from checkerboard previews.
    edges = list(alpha.crop((0,0,src.width,1)).get_flattened_data()) + list(alpha.crop((0,src.height-1,src.width,src.height)).get_flattened_data()) + list(alpha.crop((0,0,1,src.height)).get_flattened_data()) + list(alpha.crop((src.width-1,0,src.width,src.height)).get_flattened_data())
    checks.append({'id':path.stem,'path':str(path.relative_to(ROOT)),'mode':src.mode,'resolution':[src.width,src.height],'alphaBounds':list(bounds),'nonzeroEdgePixels':sum(v>0 for v in edges),'transparentPixels':sum(v==0 for v in alpha.get_flattened_data())})
board.save(OUT / 'Bank-20-Sprite-Catalog.png')
(OUT / 'sprite-alpha-review.json').write_text(json.dumps({'source':'actual normalized runtime PNGs','assetCount':len(checks),'assets':checks},indent=2)+'\n')
print(f'{len(checks)} runtime sprites; catalog and alpha review saved')
