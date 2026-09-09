"""Rebuild supplemental companion atlas using durable assets-source PNGs only."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
clips=json.loads((root/'app/mariomortille/party-extras.json').read_text())
frames=[f for clip in clips.values() for f in clip['frames']]
atlas=Image.new('RGBA',(1024,512));entries={}
assert len(frames)<=128
for n,key in enumerate(frames):
 im=Image.open(root/'assets-source/party-extras'/f'{key}.png').convert('RGBA');assert im.size==(64,64)
 x=n%16*64;y=n//16*64;atlas.alpha_composite(im,(x,y));entries[key]={'frame':{'x':x,'y':y,'w':64,'h':64},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':64,'h':64},'sourceSize':{'w':64,'h':64}}
out=root/'public/mariomortille/party';atlas.save(out/'party-extras.png');(out/'party-extras.json').write_text(json.dumps({'frames':entries,'meta':{'image':'party-extras.png','size':{'w':1024,'h':512},'scale':'1'}},indent=2))
