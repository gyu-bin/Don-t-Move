"""PNG sequence folders → GIFs (30 fps).  python3 tools/locomotion/gif.py <dir>"""
import os, sys
from PIL import Image
root = sys.argv[1]
for name in sorted(os.listdir(root)):
    d = os.path.join(root, name)
    if not os.path.isdir(d): continue
    frames = [Image.open(os.path.join(d, f)).convert('RGB') for f in sorted(os.listdir(d)) if f.endswith('.png')]
    if not frames: continue
    pal = [f.convert('P', palette=Image.ADAPTIVE, colors=128) for f in frames]
    pal[0].save(os.path.join(root, name + '.gif'), save_all=True, append_images=pal[1:], duration=33, loop=0)
    print(name, len(frames))
