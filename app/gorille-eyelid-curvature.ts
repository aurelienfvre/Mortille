import type { MeshStandardMaterial } from 'three';

/** Reproject the moving lid onto the gorilla's sculpted orbital surface. */
export function fitGorilleEyelidCurvature(material: MeshStandardMaterial) {
  if (material.userData.gorilleLidCurvature) return material;
  material.userData.gorilleLidCurvature = true;
  const before = material.onBeforeCompile;
  const cache = material.customProgramCacheKey.bind(material);
  const layer = /Ligne paupiere/.test(material.name) ? 0.010 : 0.009;
  material.onBeforeCompile = function (shader, renderer) {
    before.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nfloat gorilleLidPow(float v, float exponent) { return pow(abs(v), exponent); }')
      .replace('#include <morphtarget_vertex>', `#include <morphtarget_vertex>
      float gx=transformed.x;
      float gy=transformed.y;
      float ge=max(0.0,1.0-gorilleLidPow((gx-sign(gx)*0.133)/0.079,2.0)-gorilleLidPow((gy-1.335)/0.080,2.0));
      transformed.z=0.311+${layer.toFixed(3)}+0.040*sqrt(ge);
    `);
  };
  material.customProgramCacheKey = () => `${cache()}|gorille-lid-v1|${layer}`;
  material.needsUpdate = true;
  return material;
}
