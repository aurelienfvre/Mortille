import * as THREE from 'three';

/** Cel lighting keeps Three's shadows, skinning and metal reflections, then draws tonal steps in GLSL. */
export function inkMaterial(source: THREE.Material, clone = true, character = false) {
  if (!(source instanceof THREE.MeshStandardMaterial)) return source;
  const material = clone ? source.clone() : source;
  const eye = /yeux|iris|pupille|eye|pupil|cornea/i.test(source.name);
  const fibres = /Fur_Fibres/i.test(source.name);
  const sculptedSkin=character && /Peau V[34]/i.test(source.name);
  const furMotion = { time: {value:0}, movement: {value:0} };
  if(fibres)material.userData.furMotion=furMotion;
  if (character && !eye) {
    material.roughness = Math.max(.84, material.roughness);
    material.metalness = 0;
    material.envMapIntensity = .18;
  }
  if (!clone && material.userData.inkShaded) return material;
  material.userData.inkShaded = true;
  material.onBeforeCompile = shader => {
    if(fibres){
      shader.uniforms.furTime=furMotion.time;
      shader.uniforms.furMovement=furMotion.movement;
      shader.vertexShader='uniform float furTime;\nuniform float furMovement;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float furTip = uv.y * uv.y;
        float flutter = sin(furTime*3.7 + position.x*19. + position.y*11.)
                      + .35*sin(furTime*6.2 + position.z*31.);
        transformed += vec3(flutter, .22*sin(furTime*4.+position.x*12.), -.4*flutter)
                     * furTip * (.0008 + .0035*furMovement);
      `);
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 inkBase = max(diffuseColor.rgb, vec3(0.025));
      float sceneLight = dot(totalDiffuse / inkBase, vec3(0.2126, 0.7152, 0.0722));
      float shapeLight = 0.5 + 0.5 * dot(normal, normalize(vec3(-0.45, 0.85, 0.7)));
      float inkLight = shapeLight * clamp(sceneLight * 0.55 + 0.4, 0.4, 1.1);
      float aa = max(fwidth(inkLight) * 1.3, 0.008);
      float bands = 0.31 + 0.32 * smoothstep(0.46-aa, 0.46+aa, inkLight)
                         + 0.37 * smoothstep(0.76-aa, 0.76+aa, inkLight);
      ${character ? `bands = mix(bands, 0.35 + 0.65 * clamp(inkLight,0.,1.), ${sculptedSkin ? '0.65' : '0.22'});` : ''}
      vec3 shadowTint = mix(vec3(0.72,0.79,1.0), vec3(1.0,0.96,0.87), bands);
      vec3 inkSpec = totalSpecular;
      float specLevel = dot(inkSpec,vec3(0.2126,0.7152,0.0722));
      inkSpec *= ${character && !eye ? '0.20' : '0.5 + 0.7 * smoothstep(0.2,0.25,specLevel)'};
      outgoingLight = diffuseColor.rgb * bands * shadowTint + inkSpec + totalEmissiveRadiance;
      float facing = abs(dot(normal, normalize(vViewPosition)));
      float contour = smoothstep(0.045,0.14,facing);
      outgoingLight *= mix(${sculptedSkin ? '0.82' : character ? '0.70' : '0.19'},1.0,contour);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => `arcade-ink-cel-v6-${character}-${eye}-${fibres}-${sculptedSkin}`;
  material.needsUpdate = true;
  return material;
}

/** Textured cel shading and an inverted hull, following the same skin and facial shapes. */
export function addCharacterInk(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse(o => {if ((o as THREE.Mesh).isMesh && o.name!=='Ink_Outline') meshes.push(o as THREE.Mesh);});
  const outline = new THREE.MeshBasicMaterial({color:'#131822',side:THREE.BackSide});
  outline.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(objectNormal) * 0.0022;');
  };
  outline.customProgramCacheKey=()=> 'arcade-ink-hull-v3';
  for(const mesh of meshes){
    const sourceMaterials=Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m=>inkMaterial(m,true,true)) : inkMaterial(mesh.material,true,true);
    mesh.castShadow=true;mesh.receiveShadow=true;
    // Eye layers and fine seams must not become concentric black rings.
    if(/eyelid|paupi|iris|cornea|oral_cavity|mouth_interior|teeth|tongue/i.test(mesh.name)||sourceMaterials.every(m=>/yeux|iris|pupille|eye|pupil|cornea|tooth|teeth|tongue|couture|oreilles|Fur_Fibres/i.test(m.name)))continue;
    const skin=mesh as THREE.SkinnedMesh;
    const hull = skin.isSkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry,outline) : new THREE.Mesh(mesh.geometry,outline);
    hull.name='Ink_Outline';
    if(hull instanceof THREE.SkinnedMesh){
      hull.skeleton=skin.skeleton;hull.bindMode=skin.bindMode;
      hull.bindMatrix.copy(skin.bindMatrix);hull.bindMatrixInverse.copy(skin.bindMatrixInverse);
    }
    hull.position.copy(mesh.position);hull.quaternion.copy(mesh.quaternion);hull.scale.copy(mesh.scale);
    // Facial outlines must deform with the same blink and mouth shapes as the skin.
    hull.morphTargetDictionary=mesh.morphTargetDictionary;
    hull.morphTargetInfluences=mesh.morphTargetInfluences;
    hull.frustumCulled=false;hull.raycast=()=>{};mesh.parent?.add(hull);
  }
  return root;
}
