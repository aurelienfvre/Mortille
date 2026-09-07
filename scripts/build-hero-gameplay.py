from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
p=root/'public/mariomortille/characters/aurelien';dest=p/'gameplay';dest.mkdir(exist_ok=True)
manifest=json.loads((p/'manifest.json').read_text());known={f['file']:f for f in manifest['frames']};rows=[]
for f in sorted(p.glob('*-??.png')):
 im=Image.open(f).convert('RGBA');assert im.size==(96,96)
 a=im.getchannel('A');assert a.getextrema()==(0,255);b=a.getbbox()
 # Source exports stay intact. Runtime textures bake the old fractional scale
 # once using nearest sampling, then draw at 1:1 with a shared sole anchor.
 aligned=Image.new('RGBA',(96,96));aligned.paste(im,(0,88-b[3]));small=aligned.resize((56,56),Image.Resampling.NEAREST)
 runtime=Image.new('RGBA',(64,64));runtime.paste(small,(4,8));runtime.save(dest/f.name)
 if f.name not in known:known[f.name]={'file':f.name,'source':f'new equipped PNG {f.name}'}
 rows.append({'file':f.name,'sourceVerticalOffset':88-b[3],'bounds':runtime.getbbox()})
manifest['frames']=list(known.values());manifest['runtime']={'size':[64,64],'anchor':[32,59],'scale':1,'sourceSampleSize':[56,56],'filter':'nearest','frames':rows};manifest['status']='new PNGs in all hero states; no legacy hero atlas; gait and equipped walk share corrected base';(p/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(rows)} gameplay PNGs prepared at integer scale.')
