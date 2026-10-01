"""Screenshot-only comparisons. No game/art edits; pixels stay at original scale."""
from PIL import Image, ImageDraw, ImageOps
from pathlib import Path
import sys
root=Path('Reports/ChaptersFinalAuditV1')
phase=sys.argv[1] if len(sys.argv)>1 else 'before'
out=root/phase
for chapter in ['01','02']:
    files=[out/chapter/f'{chapter}-{i:02d}-Game-Scale-Structure-Focus.png' for i in range(1,11)]
    board=Image.new('RGB',(2000,1656),(7,17,25));d=ImageDraw.Draw(board)
    for i,file in enumerate(files):
        x=(i%5)*400;y=(i//5)*828
        d.text((x+8,y+6),file.stem.split('-Game')[0]+' | STATIC actual game scale',fill='#f4f0dc')
        board.paste(Image.open(file).convert('RGB'),(x,y+28))
    board.save(out/chapter/f'{chapter}-All10-GameScale-Focus.png')
    raw=[Image.open(out/chapter/f'{chapter}-{i:02d}-Debug-OFF.png').convert('RGB') for i in range(1,11)]
    w=max(im.width for im in raw);h=max(im.height for im in raw)
    clean=Image.new('RGB',(w*5,h*2),(7,17,25))
    for i,im in enumerate(raw):clean.paste(im,((i%5)*w,(i//5)*h))
    clean.save(out/chapter/f'{chapter}-All10-DebugOFF-SameScale.png')
comp=root/'comparisons';comp.mkdir(exist_ok=True)
for a,b in [('01-02','02-02'),('01-05','02-05'),('01-08','02-08'),('01-10','02-10')]:
    pair=Image.new('RGB',(800,828),(7,17,25));d=ImageDraw.Draw(pair)
    for i,id in enumerate([a,b]):
        d.text((i*400+8,6),id+' | STATIC actual game scale',fill='#f4f0dc')
        pair.paste(Image.open(out/id[:2]/f'{id}-Game-Scale-Structure-Focus.png').convert('RGB'),(i*400,28))
    pair.save(comp/f'{phase}-{a}-vs-{b}-color.png')
    ImageOps.grayscale(pair).save(comp/f'{phase}-{a}-vs-{b}-grayscale.png')
if phase=='after':
    for id in ['01-05','01-08','01-09','02-03','02-06','02-10']:
        pair=Image.new('RGB',(800,828),(7,17,25));d=ImageDraw.Draw(pair)
        for i,p in enumerate(['before','after']):
            d.text((i*400+8,6),id+' '+p+' | STATIC actual game scale',fill='#f4f0dc')
            pair.paste(Image.open(root/p/id[:2]/f'{id}-Game-Scale-Structure-Focus.png').convert('RGB'),(i*400,28))
        pair.save(comp/f'{id}-Before-After-GameScale.png')
        objective=Image.new('RGB',(800,828),(7,17,25));od=ImageDraw.Draw(objective)
        for i,p in enumerate(['before','after']):
            od.text((i*400+8,6),id+' '+p+' | objective focus; actual game scale',fill='#f4f0dc')
            objective.paste(Image.open(root/p/id[:2]/'objective'/f'{id}-Game-Scale-Objective-Focus.png').convert('RGB'),(i*400,28))
        objective.save(comp/f'{id}-Before-After-Objective-GameScale.png')
        # Full maps preserve 1 world unit/pixel even if the canvas extents differ.
        maps=[Image.open(root/p/id[:2]/f'{id}-Debug-OFF.png').convert('RGB') for p in ['before','after']]
        w=max(m.width for m in maps);h=max(m.height for m in maps)
        full=Image.new('RGB',(w*2,h),(7,17,25))
        for i,m in enumerate(maps):full.paste(m,(w*i,0))
        full.save(comp/f'{id}-Before-After-FullMap.png')
print(out)
if phase=='after' and (root/'after/02/centralcourt/02-06-Game-Scale-CentralCourt-Focus.png').exists():
    court=Image.new('RGB',(800,828),(7,17,25));cd=ImageDraw.Draw(court)
    for i,p in enumerate(['before','after']):
        cd.text((i*400+8,6),'02-06 '+p+' | same central-court camera',fill='#f4f0dc')
        court.paste(Image.open(root/p/'02/centralcourt/02-06-Game-Scale-CentralCourt-Focus.png').convert('RGB'),(i*400,28))
    court.save(comp/'02-06-Before-After-CentralCourt-GameScale.png')
