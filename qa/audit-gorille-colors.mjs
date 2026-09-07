import fs from 'node:fs';import {NodeIO}from'/Users/aurelien/.npm/_npx/a6797f7ff67bb1f2/node_modules/@gltf-transform/core/dist/index.js';import{ALL_EXTENSIONS}from'/Users/aurelien/.npm/_npx/a6797f7ff67bb1f2/node_modules/@gltf-transform/extensions/dist/index.js';import{MeshoptDecoder}from'/Users/aurelien/.npm/_npx/a6797f7ff67bb1f2/node_modules/meshoptimizer/index.js';await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});const d=await io.read('public/models/gorille-mortizle-v1.glb');let checked=0;for(const p of d.getRoot().listMeshes()[0].listPrimitives()){
if(!p.getMaterial().getName().includes('Fur_Fibres_Gorille'))continue;
const a=p.getAttribute('COLOR_0');if(!a)throw Error('Missing actual gorilla fur pigment');
const colors=a.getArray();let sum=0,min=Infinity,max=0;for(const v of colors){sum+=v;min=Math.min(min,v);max=Math.max(max,v);}const mean=sum/colors.length;
if(mean>.12||mean<.005||max-min<.008)throw Error('Gorilla fur lost its dark varying pigment '+mean);
console.log(JSON.stringify({material:p.getMaterial().getName(),mean,min,max,components:colors.length}));checked++;
}if(checked!==1)throw Error('Expected one gorilla fur material');
