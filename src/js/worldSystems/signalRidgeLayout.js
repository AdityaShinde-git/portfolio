export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 640;
const MAP_SCALE = 6;
export const WORLD_WIDTH = MAP_WIDTH * MAP_SCALE;
export const WORLD_DEPTH = MAP_HEIGHT * MAP_SCALE;

export function mapPoint(x, y) {
  return [(x - MAP_WIDTH / 2) * MAP_SCALE, (MAP_HEIGHT / 2 - y) * MAP_SCALE];
}

export function worldToMap(x, z) {
  return { x: x / MAP_SCALE + MAP_WIDTH / 2, y: MAP_HEIGHT / 2 - z / MAP_SCALE };
}

export function mapScreenPoint(x, y) {
  return { x: 20 + (x / MAP_WIDTH) * 380, y: 30 + (y / MAP_HEIGHT) * 240 };
}

export function regionAtWorldPosition(x, z) {
  const { x: mapX, y: mapY } = worldToMap(x, z);
  if (mapX >= 760 && mapY < 260) return 'signal';
  if (mapY >= 410 && mapX >= 500) return 'highPass';
  if (mapX >= 560 && mapX < 790) return 'fossil';
  if (mapX < 250 && mapY >= 440) return 'motorYard';
  if (mapX < 300) return 'lowlands';
  if (mapX < 450 && mapY < 270) return 'riverlands';
  if (mapX >= 390 && mapX < 580) return 'ashen';
  return 'lowlands';
}

export function mapPosition(x, y) {
  const [worldX, worldZ] = mapPoint(x, y);
  return { x: worldX, z: worldZ };
}

export function mapRoute(points) {
  return points.map(([x, y]) => mapPoint(x, y));
}

function defineRoad(from, to, kind, mapPoints, closed = false) {
  return { from, to, kind, mapPoints, points: mapRoute(mapPoints), closed };
}

export const WORLD_DESTINATIONS = [
  { id: 'trailhead', title: 'THE TRAILHEAD', ...mapPosition(130, 150), accent: 0xd5b77d },
  { id: 'crossing', title: 'THE RIVER CROSSING', ...mapPosition(385, 185), accent: 0x82b8ad },
  { id: 'settlement', title: 'THE ASHEN SETTLEMENT', ...mapPosition(470, 330), accent: 0xc99a68 },
  { id: 'bones', title: 'THE OLD GIANT', ...mapPosition(700, 300), accent: 0xd4af73 },
  { id: 'signal', title: 'THE LAST SIGNAL', ...mapPosition(860, 110), accent: 0xc1a2b8 },
  { id: 'high-pass', title: 'THE HIGH PASS', ...mapPosition(640, 500), accent: 0x9eafcb }
];

export const ZONE_CENTRES = Object.fromEntries(
  WORLD_DESTINATIONS.map(({ id, x, z }) => [id, { x, z }])
);

export const GARAGE_POSITION = mapPosition(200, 520);

export const WORLD_LANDMARKS = [
  { id: 'waterfall', title: 'Silver Drop Waterfall', type: 'water', map: [468, 122], ...mapPosition(468, 122) },
  { id: 'old-bridge', title: 'Old Timber Bridge', type: 'crossing', map: [337, 408], ...mapPosition(337, 408) },
  { id: 'mirror-tarn', title: 'Mirror Tarn', type: 'lake', map: [630, 250], ...mapPosition(630, 250) },
  { id: 'watchtower', title: 'Watchtower Ruin', type: 'ruin', map: [225, 395], ...mapPosition(225, 395) },
  { id: 'quarry', title: 'High Pass Quarry', type: 'quarry', map: [760, 500], ...mapPosition(760, 500) },
  { id: 'fire-ring', title: 'Ashen Vale Fire Ring', type: 'camp', map: [535, 340], ...mapPosition(535, 340) }
];

export const WORLD_SECRET_SITES = [
  { id: 'cairn', title: 'The cairn tone', ...mapPosition(665, 272), requiresStopped: true },
  { id: 'waterfall-cabin', title: 'The waterfall cabin', ...mapPosition(454, 126) },
  { id: 'watchtower-radio', title: 'The buried radio', ...mapPosition(222, 406), requiresSignals: 6 },
  { id: 'quarry-signature', title: 'The signed quarry stone', ...mapPosition(780, 515) },
  { id: 'bridge-plank', title: 'The secret bridge plank', ...mapPosition(385, 185) },
  { id: 'horizon-light', title: 'The night light', ...mapPosition(947, 68), requiresSignals: 6, nightOnly: true }
];

export const ROAD_DEFINITIONS = [
  defineRoad(1, 2, 'pass', [[128, 151], [130, 150], [200, 115], [290, 140], [385, 185]]),
  defineRoad(2, 3, 'pass', [[385, 185], [425, 250], [445, 295], [470, 330]]),
  defineRoad(3, 4, 'pass', [[470, 330], [540, 365], [610, 335], [700, 300]]),
  defineRoad('settlement-overlook', 4, 'trail', [
    [610, 335], [610, 292], [638, 276], [670, 288], [700, 300]
  ]),
  defineRoad(4, 5, 'pass', [[700, 300], [765, 250], [805, 170], [860, 110]]),
  defineRoad(3, 6, 'pass', [[470, 330], [500, 420], [570, 470], [640, 500]]),
  defineRoad(6, 4, 'trail', [[640, 500], [700, 470], [650, 435], [705, 395], [660, 350], [700, 300]]),
  defineRoad('settlement-loop', 'settlement-loop', 'trail', [
    [470, 330], [464, 323], [463, 315], [470, 312], [478, 315],
    [480, 323], [477, 330], [478, 338], [470, 342], [463, 338]
  ], true),
  defineRoad(1, 'mw', 'trail', [[130, 150], [105, 260], [150, 400], [200, 520]]),
  defineRoad('mw', 3, 'trail', [
    [200, 520], [254, 450], [310, 365], [350, 285], [385, 185], [430, 260], [470, 330]
  ]),
  defineRoad('watchtower-loop', 'watchtower-loop', 'trail', [
    [150, 400], [185, 355], [230, 375], [245, 410], [210, 440]
  ], true),
  defineRoad('quarry-loop', 'quarry-loop', 'trail', [
    [640, 500], [700, 530], [760, 500], [725, 470]
  ], true)
];

const trailheadRoad = ROAD_DEFINITIONS[0].points;
export const TRAILHEAD_SPAWN = { x: trailheadRoad[0][0], z: trailheadRoad[0][1] };
export const TRAILHEAD_HEADING = Math.atan2(
  trailheadRoad[1][0] - trailheadRoad[0][0],
  trailheadRoad[1][1] - trailheadRoad[0][1]
);

export const RIVER_MAP_ROUTE = [
  [560, -10], [530, 70], [470, 120], [420, 150], [385, 185],
  [345, 235], [330, 300], [350, 370], [320, 440], [300, 520], [320, 600], [310, 660]
];
export const RIVER_ROUTE = mapRoute(RIVER_MAP_ROUTE);

export const FORD = WORLD_DESTINATIONS[1];
export const TRAILHEAD = WORLD_DESTINATIONS[0];
export const SETTLEMENT = WORLD_DESTINATIONS[2];
export const FOSSIL_RIDGE = WORLD_DESTINATIONS[3];
export const SIGNAL_PEAK = WORLD_DESTINATIONS[4];
export const HIGH_PASS = WORLD_DESTINATIONS[5];
