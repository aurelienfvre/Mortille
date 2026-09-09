import type * as Phaser from 'phaser';
import { houseArt, houseEntrance } from './house-level';
export function preloadHouseArt(scene:Phaser.Scene){for(const [key,path] of Object.entries(houseArt))scene.load.image(`house-${key}`,path);}
/** Split sprites share one176×192 canvas, so facade/roof/door never drift during reveal. */
export function createHouseExterior(scene:Phaser.Scene){
 const {x,y}=houseEntrance.exterior;
 const opening=scene.add.image(x,y,'house-opening').setOrigin(0).setDepth(-2);
 const facade=scene.add.image(x,y,'house-facade').setOrigin(0).setDepth(-1.9);
 const roof=scene.add.image(x,y,'house-roof').setOrigin(0).setDepth(-1.8);
 const door=scene.add.image(x,y,'house-door').setOrigin(0).setDepth(-1.7);
 return { update:(reveal:number)=>{
  const t=Math.max(0,Math.min(1,reveal));door.setAlpha(1-t);
  // Optional dollhouse reveal, when the parent keeps the exterior during transition.
  facade.setAlpha(1-t*.9);roof.setAlpha(1-t*.9);opening.setAlpha(1-t*.4);
 }, destroy:()=>{opening.destroy();facade.destroy();roof.destroy();door.destroy();} };
}
/** Room art already contains the platforms; use houseLevel.tiles for collision only. */
export function createHouseInterior(scene:Phaser.Scene){
 const image=scene.add.image(0,0,'house-interior').setOrigin(0).setDepth(-20);
 return {destroy:()=>image.destroy()};
}
