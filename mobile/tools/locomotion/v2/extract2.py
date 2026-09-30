import cv2, numpy as np
from scipy import ndimage as ndi
im = cv2.imread('sheet.png').astype(int)
FIG = {'player_down': (368,155,484,346), 'player_left': (508,155,628,344), 'player_right': (640,155,760,344), 'player_up': (782,155,908,344),'guard_down': (362,515,490,748), 'guard_left': (508,515,622,730), 'guard_right': (648,515,768,730), 'guard_up': (782,515,912,748)}
def evidence(c):
    b,g,r = c[...,0],c[...,1],c[...,2]
    mx = c.max(-1)
    outline = mx < 11
    warm = (r - b) > 4
    neutral = ((b - r) < 4) & (mx < 90) & (mx > 6)
    return outline | warm | neutral
res={}
for name,(x0,y0,x1,y1) in FIG.items():
    pad=6
    c = im[y0-pad:y1+pad, x0-pad:x1+pad]
    E = evidence(c).astype(np.uint8)
    E = cv2.morphologyEx(E, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
    filled = ndi.binary_fill_holes(E)
    lab,n = ndi.label(filled)
    sizes = ndi.sum(filled, lab, range(1,n+1))
    m = np.isin(lab, [i+1 for i,sz in enumerate(sizes) if sz>=40])
    res[name]=m
    np.save(f'm2_{name}.npy', m)
tiles=[]
for name,m in res.items():
    x0,y0,x1,y1=FIG[name]; c=im[y0-6:y1+6,x0-6:x1+6].astype(np.uint8)
    t=np.where(m[...,None],np.clip(c.astype(int)*3,0,255),np.array([255,0,255])).astype(np.uint8)
    tiles.append(cv2.resize(t,(t.shape[1]*3,t.shape[0]*3),interpolation=cv2.INTER_NEAREST))
H=max(t.shape[0] for t in tiles)
cv2.imwrite('board_m2.png',np.hstack([cv2.copyMakeBorder(t,0,H-t.shape[0],0,6,cv2.BORDER_CONSTANT) for t in tiles]))
