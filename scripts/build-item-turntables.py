"""Normalize 16-frame turntables, remove connected neutral backdrop, preserve opaque pixel art."""
from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np,json
root=Path(__file__).resolve().parents[1]
src=root/'assets-source/mariomortille/objects/turntables-16.png'
out=root/'public/mariomortille/items'
im=Image.open(src).convert('RGBA');manifest=json.loads((out/'manifest.json').read_text())
names=['coin','pickup-ember','pickup-turbo','pickup-cloud','pickup-cobalt','secret']
for row,name in enumerate(names):
 frames=[]
 for col in range(16):
  a=np.array(im.crop((col*128,row*128,(col+1)*128,(row+1)*128)))
  rgb=a[:,:,:3].astype(int);bg=(rgb.max(2)-rgb.min(2)<32)&(rgb.min(2)>115)
  seen=np.zeros((128,128),bool);q=deque()
  for i in range(128):q.extend([(i,0),(i,127),(0,i),(127,i)])
  while q:
   x,y=q.popleft()
   if not(0<=x<128 and 0<=y<128) or seen[y,x] or not bg[y,x]:continue
   seen[y,x]=True;q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
  a[seen]=0
  # Remove remaining disconnected flecks, retaining the principal enclosed silhouette.
  mask=a[:,:,3]>0;visited=set();components=[]
  for y,x in zip(*np.where(mask)):
   if (x,y) in visited:continue
   todo=[(x,y)];visited.add((x,y));c=[]
   while todo:
    xx,yy=todo.pop();c.append((xx,yy))
    for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
     if 0<=nx<128 and 0<=ny<128 and mask[ny,nx] and (nx,ny) not in visited:visited.add((nx,ny));todo.append((nx,ny))
   components.append(c)
  for c in components:
   if c is not max(components,key=len):
    for x,y in c:a[y,x]=0
  frames.append(Image.fromarray(a))
 boxes=[f.getbbox() for f in frames];scale=28/max(max(b[2]-b[0],b[3]-b[1]) for b in boxes)
 for i,(frame,b) in enumerate(zip(frames,boxes)):
  z=frame.crop(b).resize((max(1,round((b[2]-b[0])*scale)),max(1,round((b[3]-b[1])*scale))),Image.Resampling.NEAREST)
  f=Image.new('RGBA',(32,32));f.paste(z,((32-z.width)//2,(32-z.height)//2));f.save(out/f'{name}-{i+1:02}.png')
  # Approved hand-repaired opaque shoe panels; the old neutral-color flood removed them.
  repair=root/'assets-source/mariomortille/objects/turbo-repaired'/f'{name}-{i+1:02}.png'
  if name=='pickup-turbo' and repair.exists():
   f=Image.open(repair).convert('RGBA');f.save(out/f'{name}-{i+1:02}.png')
  if i==0 and name.startswith('pickup-'):f.save(out/f'{name}.png')
 manifest['animations'][name]={'frames':[f'{name}-{i+1:02}' for i in range(16)],'fps':15,'loop':True}
manifest['source']='16-view item turntables; connected background removal; opaque alpha; shared clip scale'
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
