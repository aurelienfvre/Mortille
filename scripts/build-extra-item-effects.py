from pathlib import Path
from PIL import Image
import numpy as np,json
root=Path(__file__).resolve().parents[1];src=root/'assets-source/mariomortille/objects/extra-effects.png';out=root/'public/mariomortille/items';im=Image.open(src).convert('RGBA');manifest=json.loads((out/'manifest.json').read_text());names=['transformation','dash-trail','flag-wave','flag-activate'];groups=[]
for row,name in enumerate(names):
 parts=[]
 for i in range(8):
  p=im.crop((round(i*im.width/8),round(row*im.height/4),round((i+1)*im.width/8),round((row+1)*im.height/4)));a=np.array(p);a[a[:,:,3]<180]=0;a[a[:,:,3]>=180,3]=255;parts.append(Image.fromarray(a))
 groups.append(parts)
# Use fixed crop size for effects, fixed pole anchor for flags.
for row,(name,parts) in enumerate(zip(names,groups)):
 for i,p in enumerate(parts):
  f=Image.new('RGBA',(32,32))
  if row<2:
   z=p.resize((32,32),Image.Resampling.NEAREST);f.paste(z,(0,0))
  else:
   a=np.array(p);r,g,b=[a[:,:,j].astype(float) for j in range(3)];pole=(a[:,:,3]>0)&(r>35)&(r>g*1.4)&(g>b*1.15)&(g<115)
   x=int(np.argmax(pole.sum(0)));ys=np.where(pole[:,x])[0];y0,y1=int(ys.min()),int(ys.max());scale=25/(y1-y0+1)
   z=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.NEAREST);f.paste(z,(8-round(x*scale),30-round((y1+1)*scale)))
  approved=root/'assets-source/mariomortille/decor-fixed'/f'{name}-{i+1:02}.png'
  if approved.exists(): f=Image.open(approved).convert('RGBA')
  f.save(out/f'{name}-{i+1:02}.png')
 manifest['animations'][name]={'frames':[f'{name}-{i+1:02}' for i in range(8)],'fps':12 if row<2 else 10,'loop':name in ['flag-wave','flag-activate']}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
