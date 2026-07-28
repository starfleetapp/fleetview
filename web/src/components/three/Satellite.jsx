import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Solar-array texture: dark cells with glowing grid lines (reads as a Starlink wing).
function solarTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#040a14';
  x.fillRect(0, 0, 512, 128);
  const cols = 28, rows = 6, cw = 512 / cols, ch = 128 / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const b = 60 + Math.floor(Math.random() * 60);
      x.fillStyle = `rgb(${Math.floor(b * 0.25)}, ${Math.floor(b * 0.55)}, ${b + 70})`;
      x.fillRect(i * cw + 1, j * ch + 1, cw - 2, ch - 2);
    }
  }
  x.strokeStyle = 'rgba(130,185,255,0.55)'; x.lineWidth = 1;
  for (let i = 0; i <= cols; i++) { x.beginPath(); x.moveTo(i * cw, 0); x.lineTo(i * cw, 128); x.stroke(); }
  for (let j = 0; j <= rows; j++) { x.beginPath(); x.moveTo(0, j * ch); x.lineTo(512, j * ch); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

// Phased-array texture: rows of glowing emitters (the Earth-facing antenna).
function arrayTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#03080f'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      const on = Math.random() > 0.25;
      x.fillStyle = on ? `rgba(80,150,255,${0.5 + Math.random() * 0.5})` : 'rgba(20,40,80,0.4)';
      x.beginPath(); x.arc(8 + i * 16, 8 + j * 16, 4.5, 0, Math.PI * 2); x.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

export default function Satellite(props) {
  const solar = useMemo(solarTexture, []);
  const array = useMemo(arrayTexture, []);
  const beacon = useRef();
  useFrame((s) => {
    if (beacon.current) beacon.current.material.emissiveIntensity = 1.5 + Math.sin(s.clock.elapsedTime * 4) * 1.5;
  });

  return (
    <group {...props}>
      {/* chassis */}
      <mesh>
        <boxGeometry args={[1.5, 0.95, 0.12]} />
        <meshStandardMaterial color="#0c1119" metalness={0.9} roughness={0.32} />
      </mesh>
      {/* phased-array antenna (earth-facing) */}
      <mesh position={[0, 0, -0.075]} rotation={[Math.PI, 0, 0]}>
        <planeGeometry args={[1.35, 0.82]} />
        <meshStandardMaterial color="#0a1830" emissive="#2e7bff" emissiveIntensity={1.4} emissiveMap={array} map={array} toneMapped={false} />
      </mesh>
      {/* top deck detail */}
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[1.35, 0.82]} />
        <meshStandardMaterial color="#141b27" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* arm to the wing */}
      <mesh position={[1.05, 0, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.05]} />
        <meshStandardMaterial color="#1b2433" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* solar wing (single, like Starlink) */}
      <mesh position={[3.35, 0, 0]}>
        <boxGeometry args={[4.4, 0.86, 0.03]} />
        <meshStandardMaterial color="#0a1426" metalness={0.35} roughness={0.5} emissive="#1b4fb0" emissiveIntensity={0.9} emissiveMap={solar} map={solar} />
      </mesh>
      {/* beacon */}
      <mesh ref={beacon} position={[-0.72, 0.42, 0.09]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#ff3b5c" emissive="#ff2d55" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* thruster */}
      <mesh position={[-0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.11, 0.18, 16]} />
        <meshStandardMaterial color="#10161f" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}
