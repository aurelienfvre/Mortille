'use client';
import Yeti from './character';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { Input, Snapshot } from './engine';
const box = (p: any, s: any, c: string) => (
  <mesh position={p} castShadow receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={0.7} />
  </mesh>
);
function Car() {
  return (
    <group>
      {box([0, 0.38, 0], [1.25, 0.18, 2.05], '#243c43')}
      <RoundedBox
        args={[1.14, 0.37, 1.63]}
        radius={0.15}
        position={[0, 0.57, 0.05]}
      >
        <meshStandardMaterial
          color="#f7b167"
          metalness={0.2}
          roughness={0.27}
        />
      </RoundedBox>
      {box([0, 0.81, 0.58], [0.64, 0.36, 0.35], '#263d42')}
      {[-1, 1].map((x) =>
        [-0.68, 0.68].map((z) => (
          <group
            key={`${x}${z}`}
            position={[x * 0.7, 0.32, z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <mesh>
              <cylinderGeometry args={[0.3, 0.3, 0.23, 24]} />
              <meshStandardMaterial color="#1c292d" roughness={0.85} />
            </mesh>
            <mesh position={[0, x * -0.12, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.02, 16]} />
              <meshStandardMaterial
                color="#adbdbc"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        )),
      )}
      <Yeti
        hero
        scale={0.53}
        position={[0, 0.58, 0.1]}
        rotation={[0, Math.PI, 0]}
      />
      {box([0, 0.63, -1], [0.95, 0.15, 0.13], '#fcdb99')}
      {box([0, 0.82, 0.9], [1.35, 0.08, 0.24], '#29434a')}
    </group>
  );
}
function Race({ input, phase, report, sound }: any) {
  const car = useRef<THREE.Group>(null);
  const world = useRef<THREE.Group>(null);
  const objects = useRef<THREE.Group>(null);
  const sim = useRef({
    x: 0,
    distance: 0,
    health: 100,
    score: 0,
    result: null as Snapshot['result'],
    time: 0,
    report: 0,
  });
  const obstacles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        distance: 70 + i * 49,
        x: (((i * 7) % 3) - 1) * 2.5,
        hit: false,
        energy: i % 3 === 0,
      })),
    [],
  );
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30),
      s = sim.current;
    if (phase.current === 'play' && !s.result) {
      const h = input.current.held;
      const dir =
        Number(h.has('ArrowRight') || h.has('d')) -
        Number(h.has('ArrowLeft') || h.has('a') || h.has('q'));
      const turbo = h.has(' ') && s.health > 15;
      const speed = turbo ? 47 : 31;
      s.x = THREE.MathUtils.clamp(s.x + dir * 6 * dt, -3.65, 3.65);
      s.distance += speed * dt;
      s.time += dt;
      s.health -= dt * (turbo ? 1.35 : 0.22);
      for (const ob of obstacles)
        if (
          !ob.hit &&
          s.distance >= ob.distance - 1 &&
          s.distance <= ob.distance + 2 &&
          Math.abs(s.x - ob.x) < 1.1
        ) {
          ob.hit = true;
          if (ob.energy) {
            s.health = Math.min(100, s.health + 15);
            s.score += 200;
            sound(720);
          } else {
            s.health -= 24;
            sound(130);
          }
        }
      if (s.distance >= 1600) {
        s.result = 'won';
        s.score += Math.max(0, Math.floor(s.health)) * 10 + 1000;
      }
      if (s.health <= 0) {
        s.health = 0;
        s.result = 'lost';
      }
      s.report += dt;
      if (s.report > 0.1 || s.result) {
        s.report = 0;
        report({
          score: s.score,
          health: Math.ceil(s.health),
          result: s.result,
          objective: `Arrivée : ${Math.min(100, Math.floor(s.distance / 16))} %`,
        });
      }
      input.current.pressed.clear();
    }
    if (car.current) {
      car.current.position.x = s.x;
      car.current.rotation.z = THREE.MathUtils.lerp(
        car.current.rotation.z,
        -(s.x - car.current.userData.oldX || 0) * 0.6,
        0.1,
      );
      car.current.userData.oldX = s.x;
    }
    if (world.current) world.current.position.z = s.distance % 40;
    if (objects.current)
      objects.current.children.forEach((o, i) => {
        o.position.set(
          obstacles[i].x,
          0.65,
          4 + s.distance - obstacles[i].distance,
        );
        o.visible =
          !obstacles[i].hit && o.position.z > -160 && o.position.z < 12;
        if (obstacles[i].energy) o.rotation.y = s.time * 2;
      });
    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x,
      s.x * 0.35,
      0.025,
    );
    state.camera.lookAt(s.x * 0.2, 0.8, -9);
  });
  return (
    <>
      <color attach="background" args={['#90c4ce']} />
      <fog attach="fog" args={['#90c4ce', 35, 170]} />
      <ambientLight intensity={1.3} />
      <hemisphereLight args={['#fff2d9', '#6b9878', 2]} />
      <directionalLight position={[-8, 16, 10]} intensity={2.6} />
      {box([0, -0.2, -80], [260, 0.2, 300], '#87ae80')}
      {box([0, -0.04, -75], [9, 0.2, 200], '#4c6065')}
      <group ref={world}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} position={[0, 0, -i * 40]}>
            {[-1, 1].map((x) => (
              <group key={x}>
                {box(
                  [x * 4.6, 0.05, 0],
                  [0.35, 0.12, 39.8],
                  i % 2 ? '#e8dbc1' : '#d58462',
                )}
                {box([x * 1.5, 0.08, 0], [0.12, 0.01, 12], '#e1debf')}
                <group position={[x * (10 + (i % 3) * 3), 0, -10]}>
                  {box([0, 2, 0], [3.2, 4, 4], '#e1ddc7')}
                  <mesh position={[0, 4.65, 0]} rotation={[0, Math.PI / 4, 0]}>
                    <coneGeometry args={[3, 1.5, 4]} />
                    <meshStandardMaterial color="#c68868" />
                  </mesh>
                  {box([0, 2.7, 2.01], [1.5, 1.2, 0.03], '#739faa')}
                  {box([0, 3.9, 1.8], [2.4, 0.08, 1.5], '#365f70')}
                </group>
                <mesh position={[x * 7, 2.3, 8]}>
                  <coneGeometry args={[1.25, 4.3, 8]} />
                  <meshStandardMaterial color="#477e68" />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>
      <group ref={objects}>
        {obstacles.map((o, i) => (
          <group key={i}>
            {o.energy ? (
              <>
                <mesh>
                  <boxGeometry args={[0.68, 0.85, 0.45]} />
                  <meshStandardMaterial
                    color="#e9d479"
                    emissive="#b59234"
                    emissiveIntensity={0.35}
                  />
                </mesh>
                {box([0, 0.52, 0], [0.3, 0.14, 0.3], '#587e6b')}
              </>
            ) : (
              <>
                <mesh>
                  <coneGeometry args={[0.6, 1.3, 12]} />
                  <meshStandardMaterial color="#e99265" />
                </mesh>
                {box([0, -0.5, 0], [1.15, 0.14, 1.15], '#e9dfbc')}
              </>
            )}
          </group>
        ))}
      </group>
      <group ref={car} position={[0, 0, 4]}>
        <Car />
      </group>
    </>
  );
}
export default function Kart(props: {
  input: RefObject<Input>;
  phase: RefObject<string>;
  report: (s: Snapshot) => void;
  sound: (n?: number) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 4.3, 10.5], fov: 57 }} dpr={[1, 1.5]}>
      <Race {...props} />
    </Canvas>
  );
}
