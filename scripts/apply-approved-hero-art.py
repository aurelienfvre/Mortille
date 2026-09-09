"""Overlay the currently integrated Aurel poses; retain this pass on atlas rebuilds."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1]
folder=root/'public/mariomortille/characters/aurelien/gameplay'
source=root/'assets-source/mariomortille/aurel-approved'
meta=json.loads((folder/'hero-atlas.json').read_text())
atlas=Image.open(folder/'hero-atlas.png').convert('RGBA')
manifest=json.loads((source/'integrated.json').read_text())
# Keep the atlas gutter layout when adding dedicated action slots; do not relocate existing frames.
missing=[name for name in manifest['frames'] if 'hero-'+name not in meta['frames']]
if missing:
 columns=atlas.width//66; start_y=atlas.height
 expanded=Image.new('RGBA',(atlas.width,start_y+((len(missing)+columns-1)//columns)*66))
 expanded.paste(atlas,(0,0));atlas=expanded
 for index,name in enumerate(missing):
  meta['frames']['hero-'+name]={'frame':{'x':(index%columns)*66+1,'y':start_y+(index//columns)*66+1,'w':64,'h':64},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':64,'h':64},'sourceSize':{'w':64,'h':64}}
 meta['meta']['size']={'w':atlas.width,'h':atlas.height}
count=0
for name in manifest['frames']:
 im=Image.open(source/f'{name}.png').convert('RGBA'); b=im.getbbox()
 assert im.size==(256,256) and set(im.getchannel('A').getdata()) <= {0,255},name
 # One scale for every pose, including crouch and horizontal dash. Never fit each pose to height.
 scale=41/204
 z=im.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.NEAREST)
 f=Image.new('RGBA',(64,64)); x=round(32+(b[0]-128)*scale);y=round(59+(b[1]-246)*scale)
 assert x>=0 and y>=0 and x+z.width<=64 and y+z.height<=64,name
 f.paste(z,(x,y))
 slot=meta['frames']['hero-'+name];r=slot['frame'];assert r['w']==r['h']==64
 atlas.paste(f,(r['x'],r['y']));slot['pixelSha256']=hashlib.sha256(f.tobytes()).hexdigest();count+=1
atlas.save(folder/'hero-atlas.png',optimize=True)
(folder/'hero-atlas.json').write_text(json.dumps(meta,separators=(',',':'))+'\n')
print(f'{count} current Aurel poses applied with common scale and anchor')
