import cv2, numpy as np, json
from scipy import ndimage as ndi
im = cv2.imread('sheet.png')
FIG = {
 'player_down': (368,155,484,346), 'player_left': (508,155,628,344), 'player_right': (640,155,760,344), 'player_up': (782,155,908,344),
 'guard_down': (362,515,490,748), 'guard_left': (508,515,622,730), 'guard_right': (648,515,768,730), 'guard_up': (782,515,912,748),
}
info={}
for name,(x0,y0,x1,y1) in FIG.items():
    raw = cv2.imread(f'raw_{name}.png', cv2.IMREAD_UNCHANGED)[:,:,3] > 0   # pad 10
    m2 = np.load(f'm2_{name}.npy')  # pad 6
    m2p = np.zeros_like(raw); m2p[4:4+m2.shape[0], 4:4+m2.shape[1]] = m2
    m = m2p if name=='player_up' else (m2p | raw)
    m = ndi.binary_fill_holes(m)
    clamp=np.zeros_like(m); clamp[10:10+(y1-y0), 10:10+(x1-x0)]=True; m &= clamp
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2,2),np.uint8)).astype(bool)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3,3),np.uint8)).astype(bool); m = ndi.binary_fill_holes(m)
    lab,n = ndi.label(m); sizes=ndi.sum(m,lab,range(1,n+1)); m = np.isin(lab, [i+1 for i,sz in enumerate(sizes) if sz>=40])
    crop = im[y0-10:y1+10, x0-10:x1+10]
    ys,xs = np.nonzero(m); t,b,l,r = ys.min(),ys.max(),xs.min(),xs.max()
    rgba = np.dstack([crop, (m*255).astype(np.uint8)])[t-2:b+3, l-2:r+3]
    cv2.imwrite(f'master_{name}.png', rgba)
    info[name] = {'w': int(rgba.shape[1]), 'h': int(rgba.shape[0]), 'sheetX': int(x0-10+l-2), 'sheetY': int(y0-10+t-2)}
json.dump(info, open('masters.json','w'), indent=1)
print(info)
# board at 3x on mid gray
tiles=[]
for name in FIG:
    a=cv2.imread(f'master_{name}.png',cv2.IMREAD_UNCHANGED); al=a[:,:,3:]/255
    t=(a[:,:,:3]*al+np.array([110,100,95])*(1-al)).astype(np.uint8)
    tiles.append(cv2.resize(t,(t.shape[1]*3,t.shape[0]*3),interpolation=cv2.INTER_NEAREST))
H=max(t.shape[0] for t in tiles)
cv2.imwrite('board_masters.png',np.hstack([cv2.copyMakeBorder(t,0,H-t.shape[0],0,6,cv2.BORDER_CONSTANT,value=(0,0,0)) for t in tiles]))
