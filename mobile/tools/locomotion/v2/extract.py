import cv2, numpy as np, json
im = cv2.imread('sheet.png')
FIG = {  # x0,y0,x1,y1 in sheet px (generous)
 'player_down': (368,155,484,346), 'player_left': (508,155,628,344), 'player_right': (640,155,760,344), 'player_up': (782,155,908,344),
 'guard_down': (362,515,490,748), 'guard_left': (508,515,622,730), 'guard_right': (648,515,768,730), 'guard_up': (782,515,912,748),
}
out = {}
for name,(x0,y0,x1,y1) in FIG.items():
    pad=10
    crop = im[y0-pad:y1+pad, x0-pad:x1+pad].copy()
    mask = np.zeros(crop.shape[:2], np.uint8)
    rect = (pad-2, pad-2, x1-x0+4, y1-y0+4)
    bgd=np.zeros((1,65)); fgd=np.zeros((1,65))
    cv2.grabCut(crop, mask, rect, bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
    fg = np.where((mask==1)|(mask==3),255,0).astype(np.uint8)
    # keep the largest component
    n,lab,st,_ = cv2.connectedComponentsWithStats(fg)
    if n>1:
        k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); fg=np.where(lab==k,255,0).astype(np.uint8)
    rgba = np.dstack([crop, fg])
    cv2.imwrite(f'raw_{name}.png', rgba)
    out[name]=int((fg>0).sum())
print(out)
# inspection board: each cutout on light gray and on magenta
tiles=[]
for name in FIG:
    a=cv2.imread(f'raw_{name}.png',cv2.IMREAD_UNCHANGED)
    h,w=a.shape[:2]
    for bgc in [(200,200,200),(255,0,255)]:
        bg=np.full((h,w,3),bgc,np.uint8); al=a[:,:,3:]/255.0
        t=(a[:,:,:3]*al+bg*(1-al)).astype(np.uint8)
        tiles.append(cv2.resize(t,(w*2,h*2),interpolation=cv2.INTER_NEAREST))
H=max(t.shape[0] for t in tiles)
tiles=[cv2.copyMakeBorder(t,0,H-t.shape[0],0,4,cv2.BORDER_CONSTANT,value=(40,40,40)) for t in tiles]
board=np.hstack(tiles[:8]); board2=np.hstack(tiles[8:])
W=max(board.shape[1],board2.shape[1])
board=cv2.copyMakeBorder(board,0,0,0,W-board.shape[1],cv2.BORDER_CONSTANT); board2=cv2.copyMakeBorder(board2,0,0,0,W-board2.shape[1],cv2.BORDER_CONSTANT)
cv2.imwrite('board_raw.png', np.vstack([board,board2]))
