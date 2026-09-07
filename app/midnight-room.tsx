'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.24, 'rgba(255,255,255,.65)');
  gradient.addColorStop(.60, 'rgba(255,255,255,.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function MidnightDust() {
  const { geometry, material } = useMemo(() => {
    const count = 128, positions = new Float32Array(count * 3), phases = new Float32Array(count);
    const random = (seed: number) => { const x = Math.sin(seed * 117.13 + 319.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < count; i++) {
      positions.set([(random(i + 1) - .5) * 16, .4 + random(i + 51) * 5.2, -5.8 + random(i + 101) * 11.5], i * 3);
      phases[i] = random(i + 201) * 6.283;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { time: { value: 0 } },
      vertexShader: `attribute float phase; uniform float time; varying float brightness;
        void main(){ vec3 p=position; p.y=.4+mod(p.y-.4+time*(.021+.009*sin(phase)),5.2);
          p.x+=.10*sin(time*.23+phase); p.z+=.08*cos(time*.17+phase);
          vec4 view=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*view;
          gl_PointSize=clamp(25./max(1.,-view.z),1.2,3.8); brightness=.20+.10*sin(time*.7+phase); }`,
      fragmentShader: `varying float brightness; void main(){float r=length(gl_PointCoord-.5);
        gl_FragColor=vec4(.52,.77,.90,(1.-smoothstep(.05,.5,r))*brightness);}`,
    });
    return { geometry, material };
  }, []);
  useFrame(({ clock }) => { material.uniforms.time.value = clock.elapsedTime; });
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <points name="Midnight_Air_Particles" geometry={geometry} material={material} frustumCulled={false} />;
}

/** Blender-authored perimeter only: Y0 floor, central CRT shaft and all actor routes stay clear. */
export default function MidnightRoom() {
  const asset = useGLTF('/models/midnight-room.glb?v=2');
  useMemo(() => RectAreaLightUniformsLib.init(), []);
  const decor = useMemo(() => {
    const scene = asset.scene.clone(true);
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = true;
      const prepare = (source: THREE.Material) => {
        const material = source.clone();
        // This architectural shell uses diffuse PBR lighting; the actors retain their cel shader.
        material.userData.inkShaded = true;
        if (material instanceof THREE.MeshStandardMaterial) {
          material.envMapIntensity = .32;
          if (material.emissiveIntensity > 0 && material.emissive.getHex() !== 0) material.toneMapped = false;
        }
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(prepare) : prepare(object.material);
    });
    return scene;
  }, [asset.scene]);
  const texture = useMemo(glowTexture, []);
  useEffect(() => () => {
    texture.dispose();
    decor.traverse(object => {
      if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    });
  }, [decor, texture]);
  return <>
    <color attach="background" args={['#070b1d']} />
    <fog attach="fog" args={['#101932', 19, 35]} />
    <group name="Midnight_Arcade_Room" dispose={null}>
    <primitive object={decor} />
    {/* One shadowed key follows the animated feet; the other lights remain diffuse fills. */}
    <directionalLight position={[-3,8,4]} color="#d8e5f6" intensity={.65} castShadow
      shadow-mapSize={[1024,1024]} shadow-camera-left={-9} shadow-camera-right={9}
      shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={.5}
      shadow-camera-far={24} shadow-bias={-.0003} shadow-normalBias={.012} />
    <hemisphereLight args={['#cad7f0', '#24213d', .78]} />
    <rectAreaLight position={[0, 5.1, 4.0]} rotation={[-.38, 0, 0]} color="#d8e5f6" intensity={2.8} width={7} height={3.8} />
    <rectAreaLight position={[-7.8, 3.6, -.5]} rotation={[0, -Math.PI / 2, 0]} color="#65d0e5" intensity={1.65} width={5} height={3.4} />
    <rectAreaLight position={[7.2, 4.5, -3.4]} rotation={[-.1, Math.PI / 2, 0]} color="#ffd5a5" intensity={2.0} width={4.6} height={3.1} />
    {[-1, 1].map(side => <group key={side}>
      <mesh name="Midnight_Amber_Floor_Wash" position={[side * 4.8, .013, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 4.4]} />
        <meshBasicMaterial map={texture} color="#c39053" transparent opacity={.065} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh name="Midnight_Cyan_Wall_Wash" position={[side * 3.35, 2.65, -6.10]}>
        <planeGeometry args={[2.05, 4.25]} />
        <meshBasicMaterial map={texture} color="#47a3be" transparent opacity={.075} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>)}
    <MidnightDust />
    </group>
  </>;
}
useGLTF.preload('/models/midnight-room.glb?v=2');
