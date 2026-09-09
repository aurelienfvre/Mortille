from pathlib import Path
from PIL import Image
import numpy as np,json
from collections import deque
root=Path(__file__).resolve().parents[1];src=root/'assets-source/mariomortille/objects';out=root/'public/mariomortille/items';out.mkdir(exist_ok=True);clips={}
for filename,groups,size in [('collectibles.png',['coin','pickup-ember','pickup-turbo','pickup-cloud','pickup-cobalt','secret'],32),('effects.png',['fireball','impact','pickup-burst'],32)]:
 im=Image.open(src/filename).convert('RGBA')
 for row,name in enumerate(groups):
  parts=[]
  for col in range(8):
   c=im.crop((round(col*im.width/8),round(row*im.height/len(groups)),round((col+1)*im.width/8),round((row+1)*im.height/len(groups))))
   a=np.array(c);a[a[:,:,3]<180]=0;a[a[:,:,3]>=180,3]=255;parts.append(Image.fromarray(a))
  boxes=[p.getbbox() for p in parts];extent=max(max(b[2]-b[0],b[3]-b[1]) for b in boxes if b);scale=28/extent
  for i,(p,b) in enumerate(zip(parts,boxes)):
   f=Image.new('RGBA',(size,size))
   if b:
    if name in ['impact','pickup-burst']:
     # Fixed source canvas: expansion must stay an expansion, never fit each pose.
     z=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.NEAREST);f.alpha_composite(z,((size-z.width)//2,(size-z.height)//2))
    else:
     z=p.crop(b).resize((max(1,round((b[2]-b[0])*scale)),max(1,round((b[3]-b[1])*scale))),Image.Resampling.NEAREST);f.alpha_composite(z,((size-z.width)//2,29-z.height if name=='pickup-ember' else (size-z.height)//2))
   a=np.array(f)
   if name=='secret':
    mask=a[:,:,3]>0;seen=set();components=[]
    for yy,xx in zip(*np.where(mask)):
     if (xx,yy) in seen:continue
     q=deque([(xx,yy)]);seen.add((xx,yy));component=[]
     while q:
      x,y=q.popleft();component.append((x,y))
      for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
       if 0<=nx<size and 0<=ny<size and mask[ny,nx] and (nx,ny) not in seen:seen.add((nx,ny));q.append((nx,ny))
     components.append(component)
    for component in components:
     if len(component)<8:
      for x,y in component:a[y,x]=0
   a[a[:,:,3]==0]=0;f=Image.fromarray(a);f.save(out/f'{name}-{i+1:02}.png')
   if i==0 and name.startswith('pickup-') and name!='pickup-burst':f.save(out/f'{name}.png')
  clips[name]={'frames':[f'{name}-{i+1:02}' for i in range(8)],'fps':10 if name not in ['impact','pickup-burst'] else 16,'loop':name not in ['impact','pickup-burst']}
manifest={'size':[32,32],'alpha':[0,255],'animations':clips,'source':'generated full strips; native alpha threshold180; shared scale per clip; nearest-neighbor'};(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(out)
