import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Html, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

const R = 1;
const DEG = Math.PI / 180;
const colorFor = (s) => (s === 'online' ? '#45d08a' : s === 'degraded' ? '#d9a441' : '#df5857');
function latLon(lat, lon, r = R) {
  const phi = (90 - lat) * DEG, theta = (lon + 180) * DEG;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function EarthMesh() {
  // BASE_URL keeps these working when the app is served from a subpath.
  const B = import.meta.env.BASE_URL;
  const [day, night] = useTexture([`${B}textures/earth-day.jpg`, `${B}textures/earth-night.jpg`]);
  [day, night].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  return (
    <>
      <mesh>
        <sphereGeometry args={[R, 96, 96]} />
        <meshStandardMaterial map={day} emissive="#fff4e0" emissiveMap={night} emissiveIntensity={0.85} roughness={0.95} metalness={0} />
      </mesh>
      <mesh scale={1.015}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshBasicMaterial color="#3a86ff" transparent opacity={0.07} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

function Marker({ site, onSelect, onHover }) {
  const ref = useRef();
  const pos = useMemo(() => latLon(site.lat, site.lon, R * 1.008), [site.lat, site.lon]);
  const col = colorFor(site.status);
  const alert = site.status !== 'online';
  useFrame((s) => { if (ref.current && alert) ref.current.scale.setScalar(1 + (Math.sin(s.clock.elapsedTime * 3) + 1) * 0.35); });
  return (
    <group position={pos}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(site); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(site); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.013, 12, 12]} />
        <meshBasicMaterial color={col} toneMapped={false} />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[0.024, 12, 12]} />
        <meshBasicMaterial color={col} transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GlobeScene({ sites, controlsRef }) {
  const nav = useNavigate();
  const [hover, setHover] = useState(null);
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 5]} intensity={2.1} color="#ffffff" />
      <EarthMesh />
      {sites.map((s) => <Marker key={s.id} site={s} onSelect={(x) => nav(`/app/site/${x.id}`)} onHover={setHover} />)}
      {hover && (
        <Html position={latLon(hover.lat, hover.lon, R * 1.04)} center distanceFactor={5} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="card px-2 py-1 whitespace-nowrap" style={{ transform: 'translateY(-130%)' }}>
            <div className="text-[11px] font-medium">{hover.name}</div>
            <div className="mono text-faint text-[9px] uppercase tracking-wide">{hover.status}</div>
          </div>
        </Html>
      )}
      <OrbitControls ref={controlsRef} autoRotate autoRotateSpeed={0.45} enableZoom={false} enablePan={false} rotateSpeed={0.4} minPolarAngle={0.4} maxPolarAngle={Math.PI - 0.4} />
    </>
  );
}

const BTN = 'w-8 h-8 rounded-md border border-line text-dim hover:text-ink hover:border-[color:var(--line-2)] flex items-center justify-center text-[15px] transition';

export default function Globe3D({ sites }) {
  const controls = useRef();
  const zoom = (f) => {
    const c = controls.current; if (!c) return;
    const v = c.object.position.clone().sub(c.target);
    v.setLength(THREE.MathUtils.clamp(v.length() * f, 1.7, 4.2));
    c.object.position.copy(c.target).add(v); c.update();
  };
  const reset = () => { const c = controls.current; if (!c) return; c.target.set(0, 0, 0); c.object.position.set(0.2, 0.3, 2.7); c.update(); };

  return (
    <div className="relative w-full" style={{ height: 'clamp(330px, 42vw, 500px)' }}>
      <Canvas camera={{ position: [0.2, 0.3, 2.7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#070a10']} />
        <Suspense fallback={null}>
          <Stars radius={50} depth={30} count={1500} factor={2} fade speed={0.3} />
          <GlobeScene sites={sites} controlsRef={controls} />
          <EffectComposer disableNormalPass>
            <Bloom intensity={0.7} luminanceThreshold={0.3} luminanceSmoothing={0.5} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div className="absolute top-3 left-3 flex items-center gap-3.5 text-[10px] mono uppercase tracking-wide pointer-events-none">
        {[['Online', 'var(--online)'], ['Degraded', 'var(--degraded)'], ['Offline', 'var(--offline)']].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5 text-faint"><span className="dot" style={{ background: c }} />{l}</span>
        ))}
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-1.5" style={{ background: 'rgba(7,11,18,0.4)', borderRadius: 8, padding: 2 }}>
        <button onClick={() => zoom(0.83)} className={BTN} title="Zoom in">+</button>
        <button onClick={() => zoom(1.2)} className={BTN} title="Zoom out">−</button>
        <button onClick={reset} className={BTN} title="Reset view">⟳</button>
      </div>
    </div>
  );
}
