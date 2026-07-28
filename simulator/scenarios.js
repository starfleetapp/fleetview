// Initial fault injection so the dashboard immediately shows a realistic mix of
// healthy / degraded / down sites. Tweak live via the control API (see fleet.js).
export const INITIAL_SCENARIOS = {
  'mv-magellan': 'offline', // vessel gone dark in the Drake Passage
  'oyu-tolgoi': 'obstructed', // mine site with a new obstruction
  'mv-bering-tide': 'high_latency', // congested / rough seas
  'permian-pad-14': 'degraded', // packet loss on an oil pad
  'sakha-diamond': 'thermal', // extreme cold -> thermal throttle
};

export const MODES = ['normal', 'offline', 'obstructed', 'high_latency', 'degraded', 'thermal'];
