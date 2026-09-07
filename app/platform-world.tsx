'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Hero from './character';
import { inkMaterial } from './ink-shading';
import { createEngine } from './engine';
function Drone({ position = [0, 0, 0] }: any) {
  const asset = useGLTF('/models/drone-enemy.glb');
  const object = useMemo(() => asset.scene.clone(true), [asset.scene]);
  return (
    <group position={position} scale={0.3}>
      <primitive object={object} />
    </group>
  );
}
function World({ id, input, phase, report, sound }: any) {
  const { size } = useThree();
  const engine = useMemo(() => createEngine(id, sound), [id]);
  const state = engine.world!();
  const player = useRef<THREE.Group>(null),
    enemies = useRef<THREE.Group>(null),
    coins = useRef<THREE.Group>(null),
    bullets = useRef<THREE.Group>(null);
  const timer = useRef(0);
  const [walking, setWalking] = useState(false);
  const motion = useRef({speed:0,paused:false});
  const {scene}=useThree();
  useFrame(()=>scene.traverse((o:any)=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.isMeshStandardMaterial && !m.userData.inkShaded)inkMaterial(m,false);}}),-2);
  const wasWalking = useRef(false);
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    if (phase.current === 'play') {
      engine.update(dt, input.current);
      input.current.pressed.clear();
      timer.current += dt;
      const s = engine.snapshot();
      if (timer.current > 0.1 || s.result) {
        report(s);
        timer.current = 0;
      }
    }
    const s = engine.world!();
    if (player.current) {
      player.current.position.set(
        (s.player.x + 16) / 100,
        (600 - s.player.y - 45) / 100,
        0,
      );
      player.current.rotation.y = THREE.MathUtils.lerp(
        player.current.rotation.y,
        s.player.face > 0 ? 1.15 : -1.15,
        0.13,
      );
      player.current.visible = s.immune <= 0 || Math.sin(s.time * 30) > 0;
    }
    motion.current={speed:s.player.vx/100,paused:phase.current!=='play'};
    const walk = phase.current === 'play' && s.player.ground && Math.abs(s.player.vx) > 0;
    if (walk !== wasWalking.current) {
      wasWalking.current = walk;
      setWalking(walk);
    }
    enemies.current?.children.forEach((e, i) => {
      e.position.set(s.enemies[i].x / 100, (600 - s.enemies[i].y) / 100, 0);
      e.visible = !s.enemies[i].dead;
    });
    coins.current?.children.forEach((c, i) => {
      c.visible = !s.coins[i].got;
      c.rotation.y = s.time * 2;
      c.position.y =
        (600 - s.coins[i].y) / 100 + Math.sin(s.time * 3 + i) * 0.04;
    });
    bullets.current?.children.forEach((b, i) => {
      const shot = s.bullets[i];
      b.visible = !!shot;
      if (shot) b.position.set(shot.x / 100, (600 - shot.y) / 100, 0);
    });
    const cx = s.cam / 100 + 4.8;
    camera.position.set(cx, 4.5, 9);
    camera.lookAt(cx, 3, 0);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = Math.min(
      86,
      (2 * Math.atan(9.6 / (18 * (size.width / size.height))) * 180) / Math.PI,
    );
    cam.updateProjectionMatrix();
  });
  return (
    <>
      <color attach="background" args={['#97c4cf']} />
      <fog attach="fog" args={['#97c4cf', 18, 55]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff0d8', '#648769', 1.1]} />
      <directionalLight position={[0, 10, 5]} intensity={2.1} color="#ffebc8" />
      {state.platforms.map((p: any, i: number) => (
        <group
          key={i}
          position={[(p.x + p.w / 2) / 100, (600 - p.y - p.h / 2) / 100, 0]}
        >
          <mesh>
            <boxGeometry args={[p.w / 100, p.h / 100, 1.7]} />
            <meshStandardMaterial
              color={p.h > 50 ? '#668377' : '#668c94'}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, p.h / 200 + 0.025, 0]}>
            <boxGeometry args={[p.w / 100, 0.05, 1.76]} />
            <meshStandardMaterial color="#b4c98e" />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <group key={i} position={[i * 2, 1.1, -3 - (i % 3)]}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1.4, 2.1 + (i % 3) * 0.25, 1.3]} />
            <meshStandardMaterial
              color={['#b7cabc', '#d3d8c1', '#aec5b8'][i % 3]}
            />
          </mesh>
          {[0, 1].map((j) => (
            <mesh key={j} position={[-0.32 + j * 0.64, 1.35, 0.66]}>
              <boxGeometry args={[0.32, 0.5, 0.02]} />
              <meshStandardMaterial color="#7fa5b0" />
            </mesh>
          ))}
          <mesh
            position={[0, 2.4 + (i % 3) * 0.125, 0]}
            rotation={[0, Math.PI / 4, 0]}
          >
            <coneGeometry args={[1.15, 0.6, 4]} />
            <meshStandardMaterial color="#b78d70" />
          </mesh>
        </group>
      ))}
      <group ref={player}>
        <Hero hero action={walking?"Run":"Idle"} motion={motion} scale={0.32} />
      </group>
      <group ref={enemies}>
        {state.enemies.map((_: any, i: number) => (
          <group key={i}>
            <Drone />
          </group>
        ))}
      </group>
      <group ref={coins}>
        {state.coins.map((coin: any, i: number) => (
          <mesh
            key={i}
            position={[coin.x / 100, (600 - coin.y) / 100, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.074, 0.025, 6, 12]} />
            <meshStandardMaterial
              color="#f8d56f"
              metalness={0.65}
              roughness={0.22}
              emissive="#b48b27"
              emissiveIntensity={0.45}
            />
          </mesh>
        ))}
      </group>
      <group ref={bullets}>
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i} visible={false}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshBasicMaterial color="#ffe9a0" />
          </mesh>
        ))}
      </group>
      <group position={[34, 1.2, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.3, 1.2, 1.4]} />
          <meshStandardMaterial color="#e5dfbf" />
        </mesh>
        <mesh position={[0, 1.48, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.15, 0.7, 4]} />
          <meshStandardMaterial color="#cc8f63" />
        </mesh>
        <mesh position={[0, 0.4, 0.71]}>
          <planeGeometry args={[0.35, 0.8]} />
          <meshStandardMaterial color="#5b998d" />
        </mesh>
      </group>
    </>
  );
}
export default function PlatformWorld(props: any) {
  return (
    <Canvas camera={{ position: [4.8, 4.5, 9], fov: 39 }} dpr={[1, 1.5]}>
      <World {...props} />
    </Canvas>
  );
}
