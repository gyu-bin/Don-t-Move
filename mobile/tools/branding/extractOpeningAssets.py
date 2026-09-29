"""Rebuild assets/branding/opening/* from the user-supplied sheets in art/branding-source/.
   python3 tools/branding/extractOpeningAssets.py   (needs numpy, scipy, pillow, opencv-python)
Sources:
  bg_museum_portrait_src.png   853x1844 portrait museum -> bg_museum.png (alpha holes at top/bottom inpainted, opaque RGB)
  thief_poses_hires_src.png    1942x809 thief peek/sneak/freeze (higher-res thief set, real alpha)
  asset_sheet_transparent_src  1536x1024 guard_away/guard_turn/fg_column_left (real alpha)
  asset_sheet_preview_unused   1536x1024 preview on a baked dark glow background -> NOT used
"""
import json, numpy as np, cv2
from PIL import Image
from scipy import ndimage
SRC='art/branding-source/'; OUT='assets/branding/opening/'
def load(n):
    a=np.array(Image.open(SRC+n)).astype(np.float32); m=ndimage.binary_closing(a[...,3]>40,iterations=3); lab,_=ndimage.label(m); return a,lab
def region(lab,ids):
    own=np.isin(lab,ids); others=(lab>0)&~own
    return ndimage.binary_dilation(own,iterations=5)&~ndimage.binary_dilation(others,iterations=3)
def place(a,reg,anchor,ground,canvas,ac,gc,mirror=False,keep=None):
    H,W=canvas; out=np.zeros((H,W,4),np.float32); src=a.copy(); src[...,3]*=reg
    if keep is not None: src[...,3]*=keep
    ys,xs=np.where(src[...,3]>0); dx=xs-anchor; dx=-dx if mirror else dx
    cx=ac+dx; cy=gc+(ys-ground); ok=(cx>=0)&(cx<W)&(cy>=0)&(cy<H); out[cy[ok],cx[ok]]=src[ys[ok],xs[ok]]; return out
save=lambda o,n: Image.fromarray(o.clip(0,255).astype(np.uint8),'RGBA').save(OUT+n+'.png',optimize=True)
# background
a=np.array(Image.open(SRC+'bg_museum_portrait_src.png')); mask=(a[...,3]<235).astype(np.uint8); mask[160:1680,:]=0
mask=cv2.dilate(mask,np.ones((7,7),np.uint8))
fixed=cv2.inpaint(cv2.cvtColor(a[...,:3],cv2.COLOR_RGB2BGR),mask*255,9,cv2.INPAINT_TELEA)
Image.fromarray(cv2.cvtColor(fixed,cv2.COLOR_BGR2RGB)).save(OUT+'bg_museum.png',optimize=True)
# thief: one 700x700 canvas, feet centre (350,690) for every pose (same source scale -> no size jump)
A,labA=load('thief_poses_hires_src.png'); yy,xx=np.mgrid[0:A.shape[0],0:A.shape[1]]
peek_keep=((xx>=372)&(yy<590)).astype(np.float32)*np.clip((xx-371)/2.0,0,1)  # drop the baked column; fg_column_left covers the cut
save(place(A,region(labA,[1]),472,721,(700,700),350,690,keep=peek_keep),'thief_peek')
save(place(A,region(labA,[3]),899,721,(700,700),350,690),'thief_sneak')
save(place(A,region(labA,[2,4,5,6]),1581,721,(700,700),350,690),'thief_freeze')
# guard: one 460x460 canvas, feet centre (230,440); guard_turn mirrored to face the thief, baked beam removed at the lens
B,labB=load('asset_sheet_transparent_src.png'); yB,xB=np.mgrid[0:B.shape[0],0:B.shape[1]]
inside=((xB-1479.5)/9.5)**2+((yB-343)/18)**2<=1; cream=(B[...,0]>170)&(B[...,1]>150)&(B[...,2]>110)
cone=(xB>1486)|(cream&~inside&(xB>1468)); keep=ndimage.gaussian_filter((~cone).astype(np.float32),0.7)*(~cone)
save(place(B,region(labB,[4]),1054,533,(460,460),230,440),'guard_away')
save(place(B,region(labB,[3]),1358,533,(460,460),230,440,mirror=True,keep=keep),'guard_turn')   # lens -> (108.5, 250)
reg=region(labB,[13]); c=B.copy(); c[...,3]*=reg; ys,xs=np.where(c[...,3]>0)
save(c[ys.min():ys.max()+1,xs.min():xs.max()+1],'fg_column_left')
