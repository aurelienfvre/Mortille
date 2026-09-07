import type { MeshStandardMaterial } from 'three';

/** Keep a sliding lid on the orange mascot's curved eye while morphs interpolate. */
export function fitYetiEyelidCurvature(material: MeshStandardMaterial) {
  if (material.userData.yetiLidCurvature) return material;
  material.userData.yetiLidCurvature = true;
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
      float lidH = transformed.y - 1.272;
      float lidRz = lidH > 0.0 ? 0.342 : 0.43;
      float lidS = sqrt(max(0.0001, 1.0 - yetiLidPow(lidH / lidRz, 2.0)));
      float lidFront = sqrt(max(0.0001, 1.0 - yetiLidPow(transformed.x / (0.365 * lidS), 2.0)));
      float lidCheek = 0.030 * exp(-yetiLidPow((abs(transformed.x) - 0.205) / 0.092, 2.0)
                                     -yetiLidPow((transformed.y - 1.17) / 0.12, 2.0));
      float lidSmileZ = 1.08 + 0.11 * yetiLidPow(transformed.x / 0.255, 2.0);
      float lidSmile = 0.009 * exp(-yetiLidPow((transformed.y - lidSmileZ) / 0.045, 2.0))
                             * exp(-yetiLidPow(transformed.x / 0.28, 8.0));
      float lidFaceZ = -0.013 + 0.307 * lidS * lidFront + lidFront * (lidCheek - lidSmile);
      float lidCx = sign(transformed.x) * 0.143;
      float lidRadial = max(0.0, 1.0 - yetiLidPow((transformed.x - lidCx) / 0.095, 2.0)
                                      -yetiLidPow((transformed.y - 1.335) / 0.109, 2.0));
      transformed.z = lidFaceZ + ${layer.toFixed(3)} + 0.042 * lidRadial;
      `,
    );
  };
  material.customProgramCacheKey = () => `${cache()}|yeti-lid-surface-v1|${layer}`;
  material.needsUpdate = true;
  return material;
}
