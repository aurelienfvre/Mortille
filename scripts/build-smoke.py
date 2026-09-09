from pathlib import Path
from PIL import Image
import numpy as np,json
root=Path(__file__).resolve().parents[1];im=Image.open(root/'assets-source/mariomortille/objects/smoke.png').convert('RGBA');a=np.array(im);a[a[:,:,3]<180]=0;a[a[:,:,3]>=180,3]=255;im=Image.fromarray(a);bottom=im.getbbox()[3];scale=28/(im.width/6);out=root/'public/mariomortille/items'
for i in range(6):
 c=im.crop((round(i*im.width/6),0,round((i+1)*im.width/6),im.height));z=c.resize((28,round(c.height*scale)),Image.Resampling.NEAREST);f=Image.new('RGBA',(32,32));f.alpha_composite(z,(2,round(30-bottom*scale)));f.save(out/f'smoke-{i+1:02}.png')
p=out/'manifest.json';m=json.loads(p.read_text());m['animations']['smoke']={'frames':[f'smoke-{i+1:02}' for i in range(6)],'fps':15,'loop':False};p.write_text(json.dumps(m,indent=2))
