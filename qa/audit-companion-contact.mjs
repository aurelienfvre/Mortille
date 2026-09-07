import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';import * as T from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const read=async name=>{const b=fs.readFileSync('public/models/'+name+'.glb');return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'CPU_TEXTURE',loadTexture:()=>Promise.resolve(new T.Texture())})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const human=await read('cucu-sculpt-v1'),dog=await read('steve-jack-russell');
const hroot=new T.Group();hroot.scale.setScalar(1.55);hroot.add(human.scene);
const droot=new T.Group();droot.scale.setScalar(.65);droot.add(dog.scene);
const hm=new T.AnimationMixer(human.scene),ha=hm.clipAction(human.animations.find(c=>c.name==='Catch'));ha.play();ha.paused=true;
const dm=new T.AnimationMixer(dog.scene),da=dm.clipAction(dog.animations.find(c=>c.name==='Kiss'));da.play();da.paused=true;
const left=human.scene.getObjectByName('handL'),right=human.scene.getObjectByName('handR'),head=human.scene.getObjectByName('head'),neck=dog.scene.getObjectByName('neck'),tongue=dog.scene.getObjectByName('tongue');
const neckBase=neck.quaternion.clone(),a=new T.Vector3(),b=new T.Vector3(),support=new T.Vector3(),tip=new T.Vector3(),v=new T.Vector3(),axis=new T.Vector3(1,0,0),q=new T.Quaternion();
const rows=[];
for(const t of [2.6,3.2,4.2,4.8,5.4,6,7.4]){
 ha.time=t;hm.update(0);hroot.updateMatrixWorld(true);a.set(0,.025,0).applyMatrix4(left.matrixWorld);b.set(0,.025,0).applyMatrix4(right.matrixWorld);support.copy(a).add(b).multiplyScalar(.5);
 const cuddle=t>=4.2&&t<=6?1:0;
 droot.rotation.set(-.20*cuddle,Math.PI/2+.36*cuddle,0,'YXZ');droot.position.copy(support).sub(v.set(0,.22*.65,0).applyQuaternion(droot.quaternion));
 neck.quaternion.copy(neckBase);da.time=Math.max(0,t-4.2)*2/1.8;dm.update(0);neck.quaternion.multiply(q.setFromAxisAngle(axis,-.25*cuddle));droot.updateMatrixWorld(true);tip.set(0,.06873,0).applyMatrix4(tongue.matrixWorld);
 const headPos=head.getWorldPosition(new T.Vector3());let closest=Infinity,nearest=null;
 human.scene.traverse(o=>{if(!o.isSkinnedMesh || !o.material.name.startsWith('Peau'))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);if(v.y<headPos.y+.1)continue;const dist=v.distanceTo(tip);if(dist<closest){closest=dist;nearest=v.toArray();}}});
 let dogBottom=Infinity;dog.scene.traverse(o=>{if(!o.isSkinnedMesh)return;o.computeBoundingBox();dogBottom=Math.min(dogBottom,o.boundingBox.clone().applyMatrix4(o.matrixWorld).min.y);});
 if(cuddle)assert(closest<.025,'The animated tongue must reach the cheek while belly remains on palms');
 if(t===7.4)assert(dogBottom>=-.005 && dogBottom<.05,'Steve must be released just above the floor');
 rows.push({t,palms:support.toArray(),head:headPos.toArray(),dogRoot:droot.position.toArray(),tip:tip.toArray(),nearestSkin:nearest,skinDistance:closest,dogBottom});
}
fs.writeFileSync('work/qa-companion-contact.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
