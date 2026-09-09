"""Pack lossless runtime frames into a Phaser JSON-hash atlas; no resampling."""
from pathlib import Path
from PIL import Image
import json, math, hashlib, argparse
root=Path(__file__).resolve().parents[1]
folder=root/'public/mariomortille/characters/aurelien/gameplay'
args=argparse.ArgumentParser();args.add_argument('--remove-frames',action='store_true');options=args.parse_args()
files=sorted(folder.glob('*-??.png'))
assert files, 'Run build-hero-gameplay.py first'
slot=66; columns=20
sheet=Image.new('RGBA',(slot*columns,slot*math.ceil(len(files)/columns)))
frames={}
for i,p in enumerate(files):
 im=Image.open(p);assert im.size==(64,64) and im.mode=='RGBA' and im.format=='PNG'
 x=(i%columns)*slot+1;y=(i//columns)*slot+1;sheet.paste(im,(x,y))
 frames['hero-'+p.stem]={'frame':{'x':x,'y':y,'w':64,'h':64},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':64,'h':64},'sourceSize':{'w':64,'h':64},'pixelSha256':hashlib.sha256(im.tobytes()).hexdigest()}
sheet.save(folder/'hero-atlas.png',optimize=True)
# Reopen the actual exported PNG and compare every RGBA byte before any cleanup.
check=Image.open(folder/'hero-atlas.png')
for p in files:
 f=frames['hero-'+p.stem]['frame'];crop=check.crop((f['x'],f['y'],f['x']+64,f['y']+64))
 assert crop.tobytes()==Image.open(p).tobytes(),p.name
(folder/'hero-atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':'hero-atlas.png','format':'RGBA8888','size':{'w':sheet.width,'h':sheet.height},'scale':'1'}},separators=(',',':'))+'\n')
if options.remove_frames:
 for p in files:p.unlink()
print(f'{len(files)} frames packed losslessly into two files; {sheet.width}x{sheet.height}.')
