// Deterministic FleetView demo fleet — 40 sites across maritime, mining/energy,
// remote offices and ISP relays. Pure data (no randomness at load) so the
// simulator, edge agent and cloud backend all derive the EXACT same fleet,
// ports and per-site tokens. In production these live in the backend DB and an
// agent receives a single token via enrollment.

const SITES = [
  // --- Maritime (vessels at sea) ---
  { id: 'mv-pacific-voyager', name: 'MV Pacific Voyager', type: 'vessel', region: 'North Pacific',  lat: 35.0,  lon: -150.0 },
  { id: 'mv-atlantic-pioneer', name: 'MV Atlantic Pioneer', type: 'vessel', region: 'North Atlantic', lat: 45.0, lon: -35.0 },
  { id: 'mv-coral-sea',       name: 'MV Coral Sea',        type: 'vessel', region: 'Coral Sea',      lat: -16.0, lon: 152.0 },
  { id: 'mv-bering-tide',     name: 'MV Bering Tide',      type: 'vessel', region: 'Bering Sea',     lat: 58.0,  lon: -178.0 },
  { id: 'mv-adriatic-queen',  name: 'MV Adriatic Queen',   type: 'vessel', region: 'Adriatic Sea',   lat: 43.0,  lon: 15.0 },
  { id: 'mv-gulf-trader',     name: 'MV Gulf Trader',      type: 'vessel', region: 'Gulf of Guinea', lat: 2.0,   lon: 5.0 },
  { id: 'mv-andaman-star',    name: 'MV Andaman Star',     type: 'vessel', region: 'Andaman Sea',    lat: 10.0,  lon: 95.0 },
  { id: 'mv-magellan',        name: 'MV Magellan',         type: 'vessel', region: 'Drake Passage',  lat: -57.0, lon: -65.0 },
  { id: 'fv-kodiak',          name: 'FV Kodiak',           type: 'vessel', region: 'Gulf of Alaska', lat: 57.0,  lon: -150.0 },
  { id: 'mv-caspian',         name: 'MV Caspian',          type: 'vessel', region: 'Caspian Sea',    lat: 41.0,  lon: 51.0 },

  // --- Mining / energy (remote land sites) ---
  { id: 'pilbara-iron',         name: 'Pilbara Iron Mine',    type: 'mine', region: 'W. Australia',   lat: -22.5, lon: 118.5 },
  { id: 'atacama-copper',       name: 'Atacama Copper',       type: 'mine', region: 'Chile',          lat: -24.3, lon: -69.1 },
  { id: 'carajas-ore',          name: 'Carajás Ore',          type: 'mine', region: 'Brazil',         lat: -6.0,  lon: -50.2 },
  { id: 'oyu-tolgoi',           name: 'Oyu Tolgoi',           type: 'mine', region: 'Mongolia',       lat: 43.0,  lon: 106.8 },
  { id: 'sakha-diamond',        name: 'Sakha Diamond',        type: 'mine', region: 'Siberia',        lat: 66.4,  lon: 112.3 },
  { id: 'kalgoorlie-gold',      name: 'Kalgoorlie Gold',      type: 'mine', region: 'W. Australia',   lat: -30.75, lon: 121.47 },
  { id: 'nevada-lithium',       name: 'Nevada Lithium',       type: 'mine', region: 'Nevada, USA',    lat: 41.7,  lon: -118.0 },
  { id: 'bakken-rig-7',         name: 'Bakken Rig 7',         type: 'mine', region: 'N. Dakota, USA', lat: 47.8,  lon: -103.3 },
  { id: 'north-sea-platform-b', name: 'North Sea Platform B', type: 'mine', region: 'North Sea',      lat: 58.5,  lon: 1.9 },
  { id: 'permian-pad-14',       name: 'Permian Pad 14',       type: 'mine', region: 'Texas, USA',     lat: 31.9,  lon: -102.3 },

  // --- Remote offices / field camps ---
  { id: 'mcmurdo-relay',     name: 'McMurdo Relay',       type: 'office', region: 'Antarctica',     lat: -77.8, lon: 166.7 },
  { id: 'amazon-field-camp', name: 'Amazon Field Camp',   type: 'office', region: 'Brazil',         lat: -3.1,  lon: -60.0 },
  { id: 'sahara-survey',     name: 'Sahara Survey',       type: 'office', region: 'Algeria',        lat: 25.0,  lon: 2.0 },
  { id: 'greenland-outpost', name: 'Greenland Outpost',   type: 'office', region: 'Greenland',      lat: 72.6,  lon: -38.5 },
  { id: 'himalaya-basecamp', name: 'Himalaya Basecamp',   type: 'office', region: 'Nepal',          lat: 28.0,  lon: 86.8 },
  { id: 'outback-lodge',     name: 'Outback Lodge',       type: 'office', region: 'Australia',      lat: -25.3, lon: 131.0 },
  { id: 'patagonia-ranch',   name: 'Patagonia Ranch',     type: 'office', region: 'Argentina',      lat: -49.3, lon: -72.9 },
  { id: 'denali-lodge',      name: 'Denali Lodge',        type: 'office', region: 'Alaska, USA',    lat: 63.1,  lon: -151.0 },

  // --- ISP relays / fixed towers ---
  { id: 'montana-tower-3', name: 'Montana Tower 3', type: 'tower', region: 'Montana, USA',  lat: 47.0,  lon: -109.6 },
  { id: 'highlands-relay', name: 'Highlands Relay', type: 'tower', region: 'Scotland',      lat: 57.1,  lon: -4.7 },
  { id: 'tasman-relay',    name: 'Tasman Relay',    type: 'tower', region: 'New Zealand',   lat: -42.0, lon: 172.7 },
  { id: 'yukon-node',      name: 'Yukon Node',      type: 'tower', region: 'Canada',        lat: 63.1,  lon: -135.5 },
  { id: 'karoo-node',      name: 'Karoo Node',      type: 'tower', region: 'South Africa',  lat: -32.3, lon: 22.5 },
  { id: 'hebrides-relay',  name: 'Hebrides Relay',  type: 'tower', region: 'Scotland',      lat: 58.0,  lon: -7.0 },
  { id: 'faroe-relay',     name: 'Faroe Relay',     type: 'tower', region: 'Faroe Islands', lat: 62.0,  lon: -6.8 },
  { id: 'aleutian-node',   name: 'Aleutian Node',   type: 'tower', region: 'Alaska, USA',   lat: 52.0,  lon: -174.0 },
  { id: 'cape-york-relay', name: 'Cape York Relay', type: 'tower', region: 'Australia',     lat: -12.7, lon: 142.5 },
  { id: 'svalbard-node',   name: 'Svalbard Node',   type: 'tower', region: 'Norway',        lat: 78.2,  lon: 15.6 },
  { id: 'falkland-relay',  name: 'Falkland Relay',  type: 'tower', region: 'Falklands',     lat: -51.7, lon: -59.0 },
  { id: 'azores-node',     name: 'Azores Node',     type: 'tower', region: 'Portugal',      lat: 38.5,  lon: -28.0 },
];

const HW = ['rev3_proto2', 'rev4_prod3'];

const ALL = SITES.map((s, i) => ({
  ...s,
  index: i,
  grpcPort: 9201 + i,
  token: 'flv_' + s.id.replace(/-/g, ''),
  deviceId: 'ut' + String(100000 + i),
  hardware_version: HW[i % HW.length],
  software_version: '2026.05.2.cr53207',
}));

// FLEET_SIZE lets a memory-constrained host run fewer simulated dishes.
// The 5 scripted "problem" sites all sit within the first 20, so a trimmed
// fleet still shows the full range of states.
export const fleet = ALL.slice(0, Number(process.env.FLEET_SIZE) || ALL.length);

export const fleetByToken = Object.fromEntries(fleet.map((s) => [s.token, s]));
export const fleetById = Object.fromEntries(fleet.map((s) => [s.id, s]));

export const TYPE_LABELS = {
  vessel: 'Vessel',
  mine: 'Mine / Energy',
  office: 'Remote Office',
  tower: 'ISP Relay',
};
