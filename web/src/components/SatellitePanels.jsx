const SATS = [
  {
    name: 'FV-1 Aurora',
    cls: 'GEO Relay · Ku / Ka-band',
    img: `${import.meta.env.BASE_URL}assets/satellite.png`,
    desc: 'Geostationary relay anchoring high-throughput backhaul for maritime and remote-site fleets across the Atlantic basin.',
    stats: [
      { k: 'Altitude', v: 35786, dec: 0, u: 'km' },
      { k: 'Velocity', v: 11070, dec: 0, u: 'km/h' },
      { k: 'Downlink', v: 4.8, dec: 1, u: 'Gbps' },
      { k: 'Uplink', v: 2.4, dec: 1, u: 'Gbps' },
      { k: 'Sites linked', v: 18, dec: 0, u: '' },
      { k: 'Uptime', v: 99.98, dec: 2, u: '%' },
    ],
  },
  {
    name: 'FV-2 Vanta',
    cls: 'LEO Mesh · Optical inter-sat',
    img: `${import.meta.env.BASE_URL}assets/satellite-2.png`,
    desc: 'Low-earth-orbit mesh node with optical cross-links, delivering sub-40 ms coverage to mining operations and mobile ISP relays.',
    stats: [
      { k: 'Altitude', v: 550, dec: 0, u: 'km' },
      { k: 'Velocity', v: 27000, dec: 0, u: 'km/h' },
      { k: 'Downlink', v: 3.1, dec: 1, u: 'Gbps' },
      { k: 'Uplink', v: 1.2, dec: 1, u: 'Gbps' },
      { k: 'Sites linked', v: 22, dec: 0, u: '' },
      { k: 'Latency', v: 38, dec: 0, u: 'ms' },
    ],
  },
  {
    name: 'FV-3 Meridian',
    cls: 'Polar LEO · Gold MLI relay',
    img: `${import.meta.env.BASE_URL}assets/satellite-3.png`,
    desc: 'Polar-orbit relay in full thermal wrap, holding the high-latitude corridor — Svalbard, the Aleutians and every site the geostationary belt can barely see.',
    stats: [
      { k: 'Altitude', v: 780, dec: 0, u: 'km' },
      { k: 'Velocity', v: 26900, dec: 0, u: 'km/h' },
      { k: 'Downlink', v: 2.2, dec: 1, u: 'Gbps' },
      { k: 'Uplink', v: 0.9, dec: 1, u: 'Gbps' },
      { k: 'Sites linked', v: 14, dec: 0, u: '' },
      { k: 'Latency', v: 42, dec: 0, u: 'ms' },
    ],
  },
  {
    name: 'FV-4 Halcyon',
    cls: 'MEO backhaul · Truss bus',
    img: `${import.meta.env.BASE_URL}assets/satellite-4.png`,
    desc: 'Mid-orbit workhorse on a long truss spine, trunking aggregated fleet telemetry between continents with wide-span arrays and cold-plate radiators.',
    stats: [
      { k: 'Altitude', v: 8062, dec: 0, u: 'km' },
      { k: 'Velocity', v: 19600, dec: 0, u: 'km/h' },
      { k: 'Downlink', v: 5.6, dec: 1, u: 'Gbps' },
      { k: 'Uplink', v: 2.8, dec: 1, u: 'Gbps' },
      { k: 'Sites linked', v: 26, dec: 0, u: '' },
      { k: 'Uptime', v: 99.95, dec: 2, u: '%' },
    ],
  },
  {
    name: 'FV-5 Corvus',
    cls: 'LEO swarm · CubeSat node',
    img: `${import.meta.env.BASE_URL}assets/satellite-5.png`,
    desc: 'Shoebox-class swarm node with petal arrays — dozens of these fill coverage gaps over mining districts and short-dwell maritime lanes.',
    stats: [
      { k: 'Altitude', v: 510, dec: 0, u: 'km' },
      { k: 'Velocity', v: 27400, dec: 0, u: 'km/h' },
      { k: 'Downlink', v: 1.4, dec: 1, u: 'Gbps' },
      { k: 'Uplink', v: 0.6, dec: 1, u: 'Gbps' },
      { k: 'Sites linked', v: 9, dec: 0, u: '' },
      { k: 'Latency', v: 34, dec: 0, u: 'ms' },
    ],
  },
  {
    name: 'FV-6 Solstice',
    cls: 'GEO wide-beam · Mesh reflector',
    img: `${import.meta.env.BASE_URL}assets/satellite-6.png`,
    desc: 'The heavy lifter: a deployed gold-mesh umbrella throwing one wide beam across an ocean basin, anchoring coverage where nothing else reaches.',
    stats: [
      { k: 'Altitude', v: 35786, dec: 0, u: 'km' },
      { k: 'Velocity', v: 11070, dec: 0, u: 'km/h' },
      { k: 'Downlink', v: 6.2, dec: 1, u: 'Gbps' },
      { k: 'Uplink', v: 3.0, dec: 1, u: 'Gbps' },
      { k: 'Sites linked', v: 31, dec: 0, u: '' },
      { k: 'Uptime', v: 99.99, dec: 2, u: '%' },
    ],
  },
];

function Stat({ s }) {
  return (
    <div>
      <div className="label mb-1.5">{s.k}</div>
      <div className="flex items-baseline gap-1">
        <span className="stat-num text-[22px] leading-none" style={{ color: 'var(--ink)' }} data-count={s.v} data-dec={s.dec}>0</span>
        {s.u && <span className="mono text-faint text-[11px]">{s.u}</span>}
      </div>
    </div>
  );
}

function SatImg({ sat }) {
  return (
    <div className="relative flex items-center justify-center p-8 lg:p-12 min-h-[280px]">
      <img src={sat.img} alt={sat.name} className="sat-drift relative w-full max-w-[460px]" style={{ filter: 'drop-shadow(0 22px 55px rgba(0,0,0,0.6)) drop-shadow(0 0 55px rgba(78,161,255,0.18))' }} />
    </div>
  );
}

function SatInfo({ sat }) {
  return (
    <div className="p-8 lg:p-12 flex flex-col justify-center">
      <div className="mb-3">
        <span className="label">{sat.cls}</span>
      </div>
      <h3 className="font-display uppercase text-3xl tracking-[-0.01em] mb-3">{sat.name}</h3>
      <p className="text-dim text-[14px] leading-relaxed max-w-lg mb-8">{sat.desc}</p>
      <div className="grid grid-cols-3 gap-x-6 gap-y-7">
        {sat.stats.map((s) => <Stat key={s.k} s={s} />)}
      </div>
      <div className="flex items-end gap-[3px] mt-9 h-8" aria-hidden>
        {Array.from({ length: 32 }).map((_, j) => (
          <span key={j} className="sig-bar inline-block flex-1 rounded-[1px]" style={{ background: 'var(--accent)', opacity: 0.55, height: '100%', animationDelay: `${(j * 0.05).toFixed(2)}s` }} />
        ))}
      </div>
    </div>
  );
}

function SatPanel({ sat, i }) {
  const imgFirst = i % 2 === 0;
  return (
    <div data-reveal className="mb-16 lg:mb-24">
      <div className="reveal grid lg:grid-cols-2 items-center gap-4">
        {imgFirst ? (
          <><SatImg sat={sat} /><SatInfo sat={sat} /></>
        ) : (
          <>
            <div className="order-1 lg:order-2"><SatImg sat={sat} /></div>
            <div className="order-2 lg:order-1"><SatInfo sat={sat} /></div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SatellitePanels() {
  return (
    <section className="relative overflow-hidden py-28 border-t border-line">
      <div className="relative max-w-[1500px] mx-auto px-6 sm:px-16">
        <div data-reveal className="mb-12">
          <div className="reveal label mb-3">The constellation</div>
          <h2 className="reveal font-display uppercase text-3xl sm:text-5xl tracking-[-0.01em]">Built on real satellites</h2>
          <p className="reveal text-dim mt-3 max-w-lg text-[15px]">Every dish on the ground talks to hardware like this. Live orbital telemetry, per spacecraft.</p>
        </div>
        {SATS.map((sat, i) => <SatPanel key={sat.name} sat={sat} i={i} />)}
      </div>
    </section>
  );
}
