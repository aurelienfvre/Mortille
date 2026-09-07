from PIL import Image,ImageDraw
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/mariomortille';OUT.mkdir(exist_ok=True)
P={'.':(0,0,0,0),'o':'#211d2b','h':'#38251f','H':'#624132','l':'#92614a','s':'#efb081','S':'#ffd0a1','r':'#c98561','w':'#f6efd9','e':'#382f32','t':'#262b39','T':'#424856','p':'#252b38','P':'#475266','b':'#738397','g':'#dee4e9','G':'#a7b4c3','c':'#51d6c3','y':'#ffd267'}
# Hand-placed pixels: tousled brown hair, thick brows, dark tee, baggy trousers, white sneakers.
HEAD=[
'.........oo.............','.....oooohhoo...oo......','...oohHHHHHhhoohho......','..ohHHlHHHHHHHhhho......','.ohHHHHHHhHHlHHHHho.....','ohHHHhHHHhhHHHHHHHho....','ohHHHhHHHhhHHhHHHHho....','ohHHhhHHHhhhHHhhHHhho...','ohhhhShhhSSShhhSShhho...','.ohhSSShSSSSShSSSSho....','.ohSSSSSSSSSSSSSSSho....','oosSSooooSSSooooSSSsoo..','osSSSwwweSSSwwweSSSSso..','osSSSwwweSSSwwweSSSSso..','.orSSSSSSSSSSSSSSSro...','..orSSSSSSSrSSSSSro....','...orSSSSSSSSSSSro.....','....orSSSooooSSro......','.....orrSSSSSrro.......','.......orrrroo.........']
def pixels(im,rows,x,y,pal=P):
 for j,row in enumerate(rows):
  for i,k in enumerate(row):
   if k!='.': im.putpixel((x+i,y+j),ImageColor(pal[k]))
def ImageColor(s):
 from PIL.ImageColor import getrgb
 return getrgb(s)+(255,)
BODY=['......oooooo......','....ootTTTToo....','..ootTTTTTTTToo..','.otTTTTTTTTTTTTo.','otTTTTTTTTTTTTTTo','otTTTTTTTTTTTTTTo','otTTTTTTTTTTTTTTo','.otTTTTTTTTTTTTo.','..otTTTTTTTTTTo..','..otTTTTTTTTTTo..','..otTTTTTTTTTTo..','..ottttttttttto..','...oooooooooo....']
atlas=Image.new('RGBA',(32*12,48*5))
for power in range(5):
 for frame in range(12):
  im=Image.new('RGBA',(32,48));d=ImageDraw.Draw(im);bob=3 if frame == 11 else 1 if frame in [1,3,5] else 0
  pixels(im,HEAD,3,1+bob);pixels(im,BODY,7,20+bob)
  # Open hands with separated thumb pixels, independently posed in the run cycle.
  swing=[0,0,-2,0,2,0,-2,0,-3,-3,2,1][frame]
  for side,x in [(-1,5),(1,25)]:
   y=(19 if side == 1 else 27) if frame == 8 else 23 if frame == 9 else 30 if frame == 10 else 27+bob+swing*side;d.rectangle((x,y,x+2,y+7),fill=P['o']);d.rectangle((x,y+1,x+2,y+5),fill=P['s']);d.point((x-side,y+4),fill=P['S'])
  stride=[0,0,-3,0,3,1,-2,0,-2,2,0,0][frame]
  for side,x in [(-1,10),(1,18)]:
   shift=stride*side;top=33+bob;bottom=37 if frame == 8 and side == -1 else 39 if frame == 10 else 43
   d.polygon([(x,top),(x+6,top),(x+7+shift,bottom),(x-1+shift,bottom)],fill=P['o'])
   d.polygon([(x+1,top),(x+5,top),(x+5+shift,bottom-1),(x+shift,bottom-1)],fill=P['p'])
   d.line([(x+4,top+2),(x+2+shift,bottom-3),(x+5+shift,bottom-1)],fill=P['P'])
   sx=x+shift;d.rectangle((sx-1,bottom,sx+7,bottom+3),fill=P['o']);d.rectangle((sx,bottom,sx+6,bottom+2),fill=P['g']);d.line((sx,bottom+2,sx+6,bottom+2),fill=P['G']);d.point((sx+2,bottom),fill=P['w'])
   if power==1:d.line((sx,bottom,sx+6,bottom),fill=P['c'])
  if power==2:d.rectangle((26,30+bob-swing,28,34+bob-swing),fill='#ff844f')
  if power==3:d.rectangle((10,24+bob,12,32+bob),fill='#c8f2f2');d.rectangle((21,24+bob,23,32+bob),fill='#c8f2f2')
  if power==4:d.rectangle((8,25+bob,10,32+bob),fill='#408ad0');d.line((9,25+bob,9,31+bob),fill='#94cfff')
  if frame==1:
   d.rectangle((8,13+bob,12,14+bob),fill=P['S']);d.rectangle((17,13+bob,21,14+bob),fill=P['S'])
   d.line((8,14+bob,12,14+bob),fill=P['r']);d.line((17,14+bob,21,14+bob),fill=P['r'])
  atlas.alpha_composite(im,(frame*32,power*48))
atlas.save(OUT/'aurelien.png')
preview=atlas.crop((0,0,32*12,48)).resize((32*12*3,48*3),Image.Resampling.NEAREST);preview.save(ROOT.parents[1]/'outputs/Aurelien-pixel-premieres-poses.png')
# Tiles are drawn on their final 16-pixel grid, no resampling or generated imagery.
tiles=Image.new('RGBA',(16*12,16));d=ImageDraw.Draw(tiles)
for k in range(12):
 x=k*16
 if k==0:
  d.rectangle((x,0,x+15,15),fill='#76523e');d.rectangle((x,0,x+15,3),fill='#80bf64');d.line((x,0,x+15,0),fill='#c3df91')
  for a,b in [(2,8),(10,6),(6,13),(14,12)]:d.line((x+a,b,x+a+2,b),fill='#ac7850')
 elif k==1:
  d.rectangle((x,0,x+15,15),fill='#a9664f');d.line((x,0,x+15,0),fill='#e2a075');d.line((x,7,x+15,7),fill='#593e3c');d.line((x+7,1,x+7,6),fill='#593e3c');d.line((x+3,8,x+3,15),fill='#593e3c')
 elif k==2:
  d.rectangle((x,0,x+15,15),fill='#302c3b');d.rectangle((x+1,1,x+14,14),fill='#e9a94e');d.line((x+2,2,x+13,2),fill='#fff0a7');pixels(tiles,['.ooo.','o...o','....o','..oo.','..o..','.....','..o..'],x+5,4,{'o':'#694331'})
 elif k==3:
  d.ellipse((x+4,1,x+11,14),fill='#65443a');d.ellipse((x+5,1,x+12,13),fill='#ffc963');d.line((x+8,4,x+8,10),fill='#fff1b3')
 elif k==4:
  d.rectangle((x+2,6,x+12,12),fill='#212b38');d.rectangle((x+3,5,x+10,10),fill='#5bdfc0');d.line((x+2,12,x+13,12),fill='#ebfff5')
 elif k==5:
  d.rectangle((x,0,x+15,15),fill='#76523e')
  for a,b in [(2,8),(10,6),(6,13),(14,12)]:d.line((x+a,b,x+a+2,b),fill='#ac7850')
 elif k==6:
  pixels(tiles,['.......oo.......','......oyyo......','......oyyo......','..ooooyyyyoooo..','.oyyyyyyyyyyyyo.','..oyyyyyyyyyyo..','...oyyyyyyyyo...','....oyyyyyyo....','...oyyyyyyyyo...','...oyyoooyyyo...','..oyyo...oyyyo..','..ooo.....ooo...'],0+x,2,{'o':'#493d58','y':'#ffdb81'})
 elif k==7:
  pixels(tiles,['.....oo.....','..ooorrroo..','.orrRrrrRro.','.orRRRRRRro.','..oRRRRRRo..','..oRRRRRRo..','...oooooo...'],x+2,4,{'o':'#482d3c','r':'#c75349','R':'#ff965d'})
 elif k==8:
  pixels(tiles,['...oooooo...','..oWWooWWo..','.oWWWooWWWo.','oWWWWooWWWWo','oWoooWWoooWo','.o..oWWo..o.','....oWWo....','....oooo....'],x+2,3,{'o':'#456181','W':'#d2f6ed'})
 elif k==9:
  pixels(tiles,['....oooo....','..ooBBBBoo..','.oBbbBBbbBo.','oBbbBBBBbbBo','oBBBBooBBBBo','oBBBBoWBBBBo','.oBBBBBBBBo.','..oooooooo..'],x+2,3,{'o':'#293c66','B':'#4d92d1','b':'#86cce3','W':'#d3eef0'})
 elif k==10:
  d.rectangle((x,0,x+15,15),fill='#669fc3');d.rectangle((x+1,1,x+14,14),fill='#b4e4e8');d.line((x+2,10,x+10,2),fill='#f3fff7',width=2);d.line((x+6,13,x+13,6),fill='#e2f9f2')
 else:
  d.rectangle((x,0,x+15,15),fill='#293d58');d.rectangle((x+1,1,x+14,14),fill='#65829c');d.line((x+3,3,x+12,12),fill='#b6d6df',width=2);d.line((x+12,3,x+3,12),fill='#b6d6df',width=2)
tiles.save(OUT/'tiles.png')
# Beetle patrol: explicit pixel grid, four anchored walk frames.
beetle=['......oooo......','....ooRRRRoo....','...oRRrrrRRRo...','..oRRrrrrrRRRo..','.oRRrrrrrrrRRRo.','oRRRRRRRRRRRRRRo','oRRRRooooRRRRRRo','oRRRoWWWWoRRRRRo','.oooWeWWeWoooo..','...oWWWWWWo.....','....oooooo......']
enemies=Image.new('RGBA',(24*4,24))
for frame in range(4):
 im=Image.new('RGBA',(24,24));pixels(im,beetle,4,5+frame%2,{'o':'#282534','R':'#654874','r':'#a56b95','W':'#eee4c7','e':'#2a2533'})
 d=ImageDraw.Draw(im)
 for x in [5,11,17]:
  dx=1 if (frame+x)%2 else -1
  d.line((x,17,x+dx,20),fill='#282534',width=2);d.point((x+dx+1,20),fill='#d49a77')
 enemies.alpha_composite(im,(frame*24,0))
enemies.save(OUT/'beetle.png')
# Raphaël: 48x80 pixel drawing; long neck, ears, muzzle, spots, shirt and jeans.
raph=Image.new('RGBA',(48*4,80))
for frame in range(4):
 im=Image.new('RGBA',(48,80));d=ImageDraw.Draw(im); bob=frame%2
 d.rectangle((20,24+bob,29,47+bob),fill='#714633');d.rectangle((21,25+bob,28,46+bob),fill='#e6ad65')
 for x,y in [(22,29),(26,36),(22,41)]:d.rectangle((x,y+bob,x+2,y+3+bob),fill='#a9673e')
 pixels(im,['....oo.......oo......','....oho.....oho......','....oho.....oho......','.....ooooooo.........','...ooSSSSSSSoo.......','oooSSSSSSSSSSSooo....','oSSooSSSSSSSooSSo....','.oooSSSSSSSSSooo.....','...oSooooSooooSo.....','...oSwwweSwwweSo.....','...oSSSSSSSSSSSo.....','....oSSSSSSSSSSooo...','....oSSSSSSSSSSSSSo..','.....oSSSSSShhSSSSo..','......oSSSSShhSSSo...','.......oooooooooo....'],13,9+bob,{'o':'#352c31','h':'#9c6745','S':'#efba75','w':'#fff0cf','e':'#352c31'})
 d.polygon([(14,46+bob),(34,46+bob),(38,61),(12,61)],fill='#343440');d.rectangle((16,48+bob,32,59),fill='#ece0be');d.line((18,49,30,49),fill='#fff1d7')
 for side,x in [(-1,8),(1,34)]:
  d.rectangle((x,49+bob,x+5,57+bob),fill='#e6ad65');d.rectangle((x,57+bob,x+5,61+bob),fill='#553d36')
 for x in [16,26]:
  dx=(frame%2)*(-1 if x==16 else 1)
  d.rectangle((x,61,x+7,73),fill='#30425c');d.line((x+3,63,x+1+dx,72),fill='#66758b');d.rectangle((x-1+dx,74,x+8+dx,77),fill='#292c35');d.line((x-1+dx,78,x+8+dx,78),fill='#e2d9bb')
 raph.alpha_composite(im,(frame*48,0))
raph.save(OUT/'raphael.png')
