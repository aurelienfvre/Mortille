import type { MeshStandardMaterial } from 'three';

/** Keep a sliding lid on the orange mascot's curved eye while morphs interpolate. */
export function fitYetiEyelidCurvatureV2(material: MeshStandardMaterial) {
  if (material.userData.yetiLidCurvatureV2) return material;
  material.userData.yetiLidCurvatureV2 = true;
  const before = material.onBeforeCompile;
  const cache = material.customProgramCacheKey.bind(material);
  const layer = /Ligne paupiere/.test(material.name) ? 0.010 : 0.009;
  material.onBeforeCompile = function (shader, renderer) {
    before.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nfloat yetiLidPow(float v, float exponent) { return pow(abs(v), exponent); }',
    ).replace(
      '#include <morphtarget_vertex>',
      `#include <morphtarget_vertex>
      // Asset coordinates: X right, Y up, Z toward the viewer.
      float lidCheekScale = 1.0 + 0.045 * exp(-yetiLidPow((transformed.y - 1.16) / 0.105, 2.0));
      float lidSourceX = transformed.x / lidCheekScale;
      float lidH = transformed.y - 1.272;
      float lidRz = lidH > 0.0 ? 0.342 : 0.43;
      float lidS = sqrt(max(0.0001, 1.0 - yetiLidPow(lidH / lidRz, 2.0)));
      float lidFront = sqrt(max(0.0001, 1.0 - yetiLidPow(lidSourceX / (0.365 * lidS), 2.0)));
      float lidCheek = 0.030 * exp(-yetiLidPow((abs(lidSourceX) - 0.205) / 0.092, 2.0)
                                     -yetiLidPow((transformed.y - 1.17) / 0.12, 2.0));
      float lidSmileZ = 1.08 + 0.11 * yetiLidPow(lidSourceX / 0.255, 2.0);
      float lidSmile = 0.009 * exp(-yetiLidPow((transformed.y - lidSmileZ) / 0.045, 2.0))
                             * exp(-yetiLidPow(lidSourceX / 0.28, 8.0));
      float lidFaceZ = -0.013 + 0.88 * (0.307 * lidS * lidFront + lidFront * (lidCheek - lidSmile));
      float lidCx = sign(lidSourceX) * 0.143;
      float lidRadial = max(0.0, 1.0 - yetiLidPow((lidSourceX - lidCx) / 0.095, 2.0)
                                      -yetiLidPow((transformed.y - 1.335) / 0.109, 2.0));
      transformed.z = lidFaceZ + 0.88 * (${layer.toFixed(3)} + 0.042 * lidRadial);
      `,
    );
  };
  material.customProgramCacheKey = () => `${cache()}|yeti-lid-surface-v2|${layer}`;
  material.needsUpdate = true;
  return material;
}
