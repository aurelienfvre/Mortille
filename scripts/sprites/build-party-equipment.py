"""Import reviewed 64px equipment clips, then rebuild the party atlas from durable sources.
Usage: python merge-party-equipment.py --character ben --power turbo --frames /reviewed/frames --durations 80,90,120,150,150,120,90,80
No --frames: rebuild approved sources only. Existing base pixels are preserved byte-for-byte.
"""
from pathlib import Path
from PIL import Image
import argparse,json,math,hashlib
root=Path(__file__).resolve().parents[2];src=root/'assets-source/mariomortille/party';out=root/'public/mariomortille/party';base=src/'base';base.mkdir(parents=True,exist_ok=True)
a=argparse.ArgumentParser();a.add_argument('--character',choices=['ben','juju']);a.add_argument('--power',choices=['none','ember','turbo','cloud','cobalt']);a.add_argument('--action',default='equip');a.add_argument('--pattern');a.add_argument('--frames',type=Path);a.add_argument('--durations');args=a.parse_args()
def validate(im,label):
 assert im.mode=='RGBA' and im.size==(64,64),f'{label}: must be RGBA64'
 pixels=list(im.getdata());assert all(p[3] in (0,255) for p in pixels),f'{label}: partial alpha'
 assert all(p[3] or p[:3]==(0,0,0) for p in pixels),f'{label}: hidden RGB'
 assert im.getbbox(),f'{label}: empty'
# Bootstrap the exact already-published base once, not a render-dependent source.
if not (base/'manifest.json').exists():
 old=json.loads((out/'party-atlas.json').read_text());atlas=Image.open(out/'party-atlas.png').convert('RGBA');entries={}
 for key,entry in old['frames'].items():
  if '-equip-' in key:continue
  f=entry['frame'];im=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));validate(im,key);im.save(base/f'{key}.png');entries[key]=hashlib.sha256(im.tobytes()).hexdigest()
 (base/'manifest.json').write_text(json.dumps(entries,indent=2))
manifestPath=src/'equipment.json';clips=json.loads(manifestPath.read_text()) if manifestPath.exists() else {}
actionsPath=src/'actions.json';actions=json.loads(actionsPath.read_text()) if actionsPath.exists() else {}
if args.frames:
 assert args.character and args.power and args.durations,'character/power/durations required'
 files=sorted(args.frames.glob(args.pattern or f'*-{args.action}-[0-9][0-9].png'));durations=list(map(int,args.durations.split(',')))
 assert len(files)==len(durations) and 1<=len(files)<=24,'one duration per PNG required'
 assert all(20<=v<=2000 for v in durations),'invalid duration'
 images=[]
 for file in files:
  im=Image.open(file);validate(im,file);images.append(im.copy())
 dest=src/args.character/f'{args.action}-{args.power}';dest.mkdir(parents=True,exist_ok=True)
 keys=[]
 for i,im in enumerate(images,1):
  key=f'party-{args.character}-{args.power+"-" if args.power!="none" else ""}{args.action}-{i:02}';im.save(dest/f'{key}.png');keys.append(key)
 target=clips if args.action=='equip' else actions
 clipKey=f'{args.character}-{args.power}' if args.action=='equip' else f'{args.character}-{args.power+"-" if args.power!="none" else ""}{args.action}'
 target[clipKey]={'frames':keys,'durations':durations,'anchor':[32,58],'source':str(dest.relative_to(root))}
 if args.action=='cast':
  metadata=json.loads((args.frames/'manifest.json').read_text()) if (args.frames/'manifest.json').exists() else {}
  target[clipKey]['releaseFrame']=metadata.get('releaseFrame') or 5
manifestPath.write_text(json.dumps(clips,indent=2)+'\n')
actionsPath.write_text(json.dumps(actions,indent=2)+'\n')
frames={}
baseManifest=json.loads((base/'manifest.json').read_text())
for key,sha in baseManifest.items():
 im=Image.open(base/f'{key}.png');validate(im,key);assert hashlib.sha256(im.tobytes()).hexdigest()==sha,'base pixels changed';frames[key]=im
for clip in [*clips.values(),*actions.values()]:
 for key in clip['frames']:
  im=Image.open(root/clip['source']/f'{key}.png');validate(im,key);frames[key]=im
columns=16 if len(frames)<=512 else 31
width=columns*66;height=math.ceil(len(frames)/columns)*66;atlas=Image.new('RGBA',(width,height));entries={}
for i,(key,im) in enumerate(frames.items()):
 x=(i%columns)*66+1;y=(i//columns)*66+1;atlas.alpha_composite(im,(x,y));entries[key]={'frame':{'x':x,'y':y,'w':64,'h':64},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':64,'h':64},'sourceSize':{'w':64,'h':64}}
atlas.save(out/'party-atlas.png');(out/'party-atlas.json').write_text(json.dumps({'frames':entries,'meta':{'image':'party-atlas.png','format':'RGBA8888','size':{'w':width,'h':height},'scale':'1'}},separators=(',',':')))
(root/'app/mariomortille/party-equipment.json').write_text(json.dumps(clips,indent=2)+'\n')
(root/'app/mariomortille/party-actions.json').write_text(json.dumps(actions,indent=2)+'\n')
replaced=sum(key in baseManifest for clip in actions.values() for key in clip['frames'])
print(f'{len(frames)} atlas frames; {len(clips)} equipment clips; {len(actions)} action clips; {replaced} base poses replaced by reviewed actions')
