import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Photoreal Earth from NASA public-domain imagery (day color + night city lights).
export default function Earth(props) {
  const ref = useRef();
  // BASE_URL keeps these working when the app is served from a subpath.
  const B = import.meta.env.BASE_URL;
  const [day, night] = useTexture([`${B}textures/earth-day.jpg`, `${B}textures/earth-night.jpg`]);
  [day, night].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.025; });
  return (
    <group {...props}>
      <mesh ref={ref}>
        <sphereGeometry args={[6, 96, 96]} />
        <meshStandardMaterial map={day} emissive="#fff6e0" emissiveMap={night} emissiveIntensity={1.7} roughness={0.92} metalness={0} />
      </mesh>
      {/* thin limb glow only (no detached outer halo) */}
      <mesh scale={1.013}>
        <sphereGeometry args={[6, 64, 64]} />
        <meshBasicMaterial color="#4ea1ff" transparent opacity={0.16} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
