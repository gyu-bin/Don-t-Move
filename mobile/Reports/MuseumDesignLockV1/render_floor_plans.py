"""Review-only, hand-authored architectural diagrams. Never imports runtime stages."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
def font(n): return ImageFont.truetype(FONT, n)
def rect(x,y,w,h): return [(x,y),(x+w,y),(x+w,y+h),(x,y+h)]
PLANS = [
 dict(id='01-01',name='ENTRANCE',budget='22 x 15 tiles maximum / 2 guards',
 rooms=[('LOBBY',rect(1,7,4,5),(3,7.8)),('FIRST EXHIBITION',rect(5,4,6,8),(8,5)),('GALLERY RECESS',rect(7,1,7,3),(10.5,1.8)),('OBJECTIVE ROOM',rect(11,4,5,5),(13.5,5)),('SIDE EXIT',rect(16,6,3,3),(17.5,6.8))],
 doors=[((1,9),(1,10),'entry'),((5,9),(5,10),'arch'),((9,4),(10,4),'arch'),((12,4),(13,4),'arch'),((11,7),(11,8),'arch'),((16,7),(16,8),'door'),((19,7),(19,8),'exit')],
 main=[(0.5,9.5),(3,9.5),(7,9.5),(9,7.5),(13,7.5),(17,7.5),(19.5,7.5)],
 alt=[(7,9.5),(8,7),(9.5,3),(12.5,3),(12.5,7.5)],escape=[],
 notes=['FLOW  Lobby > first exhibition > choice > objective > side exit', 'LANDMARK RESERVATION  Grand Statue in First Exhibition (not placed)', 'SECURITY  A: entrance/exhibition doors   B: objective/side-exit threshold']),
 dict(id='01-02',name='MAIN GALLERY',budget='15 x 15 tiles maximum / 2 guards',
 rooms=[('PAINTING GALLERY',rect(1,6,5,5),(3.5,6.8)),('CENTRAL ROTUNDA',[(6,6),(8,5),(10,5),(12,6),(12,10),(10,11),(8,11),(6,10)],(9,6.2)),('SCULPTURE HALL',rect(12,6,4,5),(14,9.7)),('ARTIFACT ROOM',rect(16,2,4,6),(18,3)),('STAFF EXIT',rect(17,8,3,5),(18.5,10))],
 doors=[((1,8),(1,9),'entry'),((6,8),(6,9),'arch'),((12,8),(12,9),'arch'),((16,6.5),(16,7.5),'arch'),((18,8),(19,8),'door'),((18,13),(19,13),'exit')],
 main=[(.5,8.5),(6.5,8.5),(11.5,8.5),(14,8.5),(14,7),(17,7),(18.5,5)],
 alt=[(6.5,8.5),(7,9.8),(9,10.4),(11,9.8),(11.5,8.5)],
 escape=[(18.5,5),(18.5,8),(18.5,13.5)],
 notes=['FLOW  Painting > Rotunda choice > Sculpture Hall > Artifact > staff exit', 'LANDMARK RESERVATION  Architectural Rotunda + Large Sculpture in Hall', 'SECURITY  A: Rotunda crossing   B: Artifact entrance/case inspection']),
 dict(id='01-03',name='ARCHIVE',budget='15 x 14 tiles maximum / 2 guards',
 rooms=[('STAFF CORRIDOR',[(1,1),(7,1),(7,4),(4,4),(4,7),(1,7)],(4,2)),('ARCHIVE SHELVES',rect(4,4,7,6),(7.5,4.8)),('STORAGE',rect(8,10,7,3),(11.5,12.1)),('RESTRICTED ARCHIVE',rect(15,7,5,6),(17.5,7.8))],
 doors=[((2,1),(3,1),'entry'),((4,5.5),(4,6.5),'door'),((9,10),(10,10),'door'),((15,11),(15,12),'door'),((20,10),(20,11),'exit')],
 main=[(2.5,.5),(2.5,3),(2.5,6),(5.5,6),(7,6),(9.5,9),(9.5,11.5),(17,11.5),(17.5,9),(19,10.5),(20.5,10.5)],
 alt=[(7,6),(5,6),(5,8.8),(8,9.2),(9.5,9)],escape=[],
 notes=['FLOW  Staff corridor > Archive shelves > Storage > Restricted Archive > exit', 'LANDMARK RESERVATION  Archive shelving; aisle/cover layout follows approval', 'SECURITY  A: staff/storage access   B: restricted archive entrance/rear door']),
 dict(id='01-04',name='SECURITY WING',budget='16 x 14 tiles maximum / 3 guards',
 rooms=[('CCTV ROOM',rect(1,8,5,4),(3.5,9)),('SECURITY HUB',rect(6,6,6,6),(9,7)),('CONTROLLED JUNCTION',rect(8,3,8,3),(12,3.8)),('SECURITY GATE',rect(16,3,4,6),(18,7.7)),('RESTRICTED PASSAGE',rect(17,0,3,3),(18.5,1))],
 doors=[((1,10),(1,11),'entry'),((6,10),(6,11),'door'),((9,6),(10,6),'door'),((16,4.5),(16,5.5),'door'),((18,3),(19,3),'door'),((18,0),(19,0),'exit')],
 main=[(.5,10.5),(9.5,10.5),(9.5,5),(18.5,5),(18.5,-.5)],
 alt=[(9.5,10.5),(7,10),(7,8),(9.5,8),(9.5,5)],escape=[],
 notes=['FLOW  CCTV > Hub > timed Junction > Gate > Restricted Passage', 'LANDMARK RESERVATION  Security Control Room; no new hacking/keycard mechanic', 'SECURITY  A: CCTV/Hub   B: Junction   C: Gate; alternate = wait/re-observe']),
 dict(id='01-05',name='DIAMOND HALL',budget='17 x 15 tiles maximum / 3 guards',
 rooms=[('GRAND EXHIBITION',[(1,6),(6,6),(7,8),(7,13),(1,13)],(4,7)),('FINAL SECURITY AREA',rect(7,4,6,9),(10,5)),('DIAMOND CHAMBER',[(13,2),(18,2),(20,4),(20,8),(18,10),(13,10)],(16.5,3)),('SERVICE PASSAGE',[(13,10),(18,10),(20,8),(22,8),(22,13),(13,13)],(16,12.2))],
 doors=[((3,13),(4,13),'entry'),((7,10),(7,11),'arch'),((13,6),(13,7),'door'),((18.5,9.5),(19.5,8.5),'door'),((22,10),(22,11),'exit')],
 main=[(3.5,13.5),(3.5,10.5),(8,10.5),(11,6.5),(16.5,6.5)],
 alt=[(8,10.5),(8,7.5),(9,6),(11,6.5)],
 escape=[(16.5,6.5),(18,7),(19,9),(19.7,10.5),(22.5,10.5)],
 notes=['FLOW  Grand Exhibition > Final Security > Diamond Chamber > Service Exit', 'LANDMARK RESERVATION  Warm spotlight / Glass Case / Master Diamond / Pedestal', 'SECURITY  A: Exhibition   B: Final Security   C: Case; preserve silent escape']),
]

def render(p):
 im=Image.new('RGB',(1200,900),'white');d=ImageDraw.Draw(im)
 d.text((45,25),f"{p['id']}  /  {p['name']}",font=font(32),fill='black')
 d.text((45,72),'MUSEUM DESIGN LOCK  /  FLOOR PLAN REVIEW  /  NOT TO SCALE',font=font(16),fill='#555555')
 d.text((45,101),p['budget']+'  |  footprint proposal, not runtime data',font=font(17),fill='#555555')
 def xy(q):return (70+q[0]*48,175+q[1]*37)
 for name,poly,pos in p['rooms']:
  pts=list(map(xy,poly));d.polygon(pts,fill='#eeeeee');d.line(pts+[pts[0]],fill='#171717',width=7)
 for a,b,kind in p['doors']:
  d.line([xy(a),xy(b)],fill='#eeeeee',width=13)
  if kind=='door':d.line([xy(a),xy(b)],fill='#aaaaaa',width=2)
  if kind in ('entry','exit'):
   x,y=xy(((a[0]+b[0])/2,(a[1]+b[1])/2));d.ellipse((x-8,y-8,x+8,y+8),fill='black')
   d.text((x+13,y-8),kind.upper(),font=font(15),fill='black')
 def route(points,dashed=False,width=3):
  for a,b in zip(points,points[1:]):
   x,y=xy(a);u,v=xy(b);length=((u-x)**2+(v-y)**2)**.5
   if dashed:
    for k in range(0,int(length),14):
     t=k/length;s=min((k+7)/length,1);d.line((x+(u-x)*t,y+(v-y)*t,x+(u-x)*s,y+(v-y)*s),fill='#555555',width=width)
   else:d.line((x,y,u,v),fill='black',width=width)
  if len(points)>1:
   import math
   a,b=map(xy,points[-2:]);ang=math.atan2(b[1]-a[1],b[0]-a[0]);
   d.polygon([b,(b[0]-12*math.cos(ang-.45),b[1]-12*math.sin(ang-.45)),(b[0]-12*math.cos(ang+.45),b[1]-12*math.sin(ang+.45))],fill='black')
 route(p['main']);route(p['alt'],True);route(p['escape'],True,5)
 for name,poly,pos in p['rooms']:
  x,y=xy(pos);f=font(15);box=d.textbbox((0,0),name,font=f);w=box[2];
  d.rectangle((x-w/2-4,y-2,x+w/2+4,y+19),fill='#eeeeee');d.text((x-w/2,y),name,font=f,fill='black')
 d.line((45,720,1155,720),fill='#999999',width=1)
 d.text((45,738),'SOLID: MAIN / RISK     DASHED: SAFE / OBSERVE     HEAVY DASH: ESCAPE',font=font(17),fill='black')
 d.text((45,764),'Wall gaps = doors / archways. Room labels reserve function; no props placed.',font=font(16),fill='#555555')
 for i,line in enumerate(p['notes']):d.text((45,803+i*27),line,font=font(17),fill='black')
 im.save(OUT/f"{p['id']}-Floor-Plan.png")
 return im

images=[render(p) for p in PLANS]
overview=Image.new('RGB',(1800,1550),'white');d=ImageDraw.Draw(overview)
d.text((40,25),'MUSEUM / FIVE CONNECTED MISSIONS',font=font(36),fill='black')
d.text((40,76),'01-01 RIGHT > LEFT 01-02 BOTTOM > TOP 01-03 RIGHT > LEFT 01-04 TOP > BOTTOM 01-05',font=font(20),fill='#444444')
for i,im in enumerate(images):overview.paste(im.resize((600,450)),((i%3)*600,135+(i//3)*670))
d.text((1230,850),'REVIEW GATE',font=font(30),fill='black')
for j,s in enumerate(['Architecture and connections only.','No StageDefinition changes.','No decorative prop placement.','Guard Walk: ASSET REQUIRED.','All dimensions remain proposals.']):d.text((1230,910+j*40),s,font=font(20),fill='#333333')
overview.save(OUT/'Museum-Chapter-Floor-Plans.png')

connection=Image.new('RGB',(1800,420),'white');d=ImageDraw.Draw(connection)
d.text((40,25),'ONE MUSEUM / PUBLIC GALLERIES TO THE SECURE CORE',font=font(30),fill='black')
d.text((40,75),'Connection diagram: portal pairs share a threshold. Local floor plans are not a stitched world map.',font=font(19),fill='#555555')
edges=[('LEFT','RIGHT'),('LEFT','BOTTOM'),('TOP','RIGHT'),('LEFT','TOP'),('BOTTOM','RIGHT')]
for i,p in enumerate(PLANS):
 x=40+i*350;d.rectangle((x,150,x+285,295),outline='black',width=3)
 d.text((x+16,170),p['id'],font=font(26),fill='black');d.text((x+16,213),p['name'],font=font(19),fill='black')
 d.text((x+16,254),f'IN {edges[i][0]}  /  OUT {edges[i][1]}',font=font(16),fill='#444444')
 if i<4:
  d.line((x+285,222,x+341,222),fill='black',width=3);d.polygon([(x+341,222),(x+330,215),(x+330,229)],fill='black')
d.text((40,345),'Visitor entrance > galleries > staff archive > security control > Diamond Chamber > exterior service exit',font=font(22),fill='black')
connection.save(OUT/'Museum-Space-Connections.png')

html='<!doctype html><meta charset="utf-8"><title>Museum Floor Plan Review</title><style>body{margin:30px auto;max-width:1200px;font:18px system-ui;background:#eee}img{width:100%;display:block;margin:20px 0}a{color:#222}</style><h1>Museum Floor Plan — 승인 검토</h1><p>게임에 적용하지 않은 건축 프리뷰. 각 이미지를 열면 원본 크기로 볼 수 있습니다.</p><p><a href="LEVEL_DESIGN_BIBLE.md">Level Design Bible</a></p>'
for p in PLANS:html+=f'<h2>{p["id"]} {p["name"]}</h2><a href="{p["id"]}-Floor-Plan.png"><img src="{p["id"]}-Floor-Plan.png"></a>'
(OUT/'index.html').write_text(html)
