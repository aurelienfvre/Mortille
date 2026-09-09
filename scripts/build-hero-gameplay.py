from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
p=root/'assets-source/mariomortille/aurelien';dest=root/'public/mariomortille/characters/aurelien/gameplay';dest.mkdir(parents=True,exist_ok=True)
manifest=json.loads((p/'manifest.json').read_text());known={f['file']:f for f in manifest['frames']};rows=[]
files=sorted(p.glob('*-??.png'))
# Align each clip once: airborne stride poses must not be individually pulled to the floor.
clipBottom={}
for f in files:
 clip=f.stem.rsplit('-',1)[0]
 bottom=Image.open(f).getchannel('A').getbbox()[3]
 clipBottom[clip]=max(clipBottom.get(clip,0),bottom)
for f in files:
 im=Image.open(f);assert im.mode=='RGBA', f'{f.name}: actual RGBA required';assert im.size==(96,96)
 a=im.getchannel('A');assert {value for _,value in a.getcolors(256)}=={0,255}, f'{f.name}: hard transparent pixels required';b=a.getbbox()
 # Source exports stay intact. Runtime textures bake the old fractional scale
 # once using nearest sampling, then draw at 1:1 with a shared sole anchor.
 offset=88-clipBottom[f.stem.rsplit('-',1)[0]]
 aligned=Image.new('RGBA',(96,96));aligned.paste(im,(0,offset));small=aligned.resize((56,56),Image.Resampling.NEAREST)
 runtime=Image.new('RGBA',(64,64));runtime.paste(small,(4,8));runtime.save(dest/f.name)
 if f.name not in known:known[f.name]={'file':f.name,'source':f'new equipped PNG {f.name}'}
 rows.append({'file':f.name,'sourceVerticalOffset':offset,'bounds':runtime.getbbox()})
manifest['frames']=list(known.values());manifest['runtime']={'size':[64,64],'anchor':[32,59],'scale':1,'sourceSampleSize':[56,56],'filter':'nearest','alignment':'one vertical offset per complete clip; suspension preserved','frames':rows};manifest['status']='new PNGs in all hero states; no legacy hero atlas; gait and equipped walk share corrected base';(p/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'{len(rows)} gameplay PNGs prepared at integer scale.')

# Ship one lossless atlas; loose PNGs are reproducible intermediate exports.
import subprocess, sys
subprocess.run([sys.executable, str(root/"scripts/pack-hero-atlas.py"), "--remove-frames"], check=True)

# Keep explicitly approved replacements across rebuilds.
subprocess.run([sys.executable, str(root/"scripts/apply-approved-hero-art.py")], check=True)
