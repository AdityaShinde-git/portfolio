export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 640;
const MAP_SCALE = 6;
export const WORLD_WIDTH = MAP_WIDTH * MAP_SCALE;
export const WORLD_DEPTH = MAP_HEIGHT * MAP_SCALE;
export const SETTLEMENT_MAP_POSITION = { x: 865, y: 160 };
export const SETTLEMENT_GATE_OFFSET = { x: -100, z: 0 };
const SETTLEMENT_GATE_POINT = [SETTLEMENT_GATE_OFFSET.x, SETTLEMENT_GATE_OFFSET.z];
const SETTLEMENT_GATE_MAP_POSITION = [
  SETTLEMENT_MAP_POSITION.x + SETTLEMENT_GATE_OFFSET.x / MAP_SCALE,
  SETTLEMENT_MAP_POSITION.y - SETTLEMENT_GATE_OFFSET.z / MAP_SCALE
];

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
  if (Math.hypot(mapX - SETTLEMENT_MAP_POSITION.x, mapY - SETTLEMENT_MAP_POSITION.y) <= 70) {
    return 'ashenCoast';
  }
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

function defineRoad(from, to, kind, mapPoints, closed = false, surface = 'dirt', width = null) {
  return { from, to, kind, mapPoints, points: mapRoute(mapPoints), closed, surface, width };
}

function defineSettlementRoad(from, to, kind, offsets, closed = false, surface = 'cobblestone', width = null) {
  const mapPoints = offsets.map(([x, z]) => [
    SETTLEMENT_MAP_POSITION.x + x / MAP_SCALE,
    SETTLEMENT_MAP_POSITION.y - z / MAP_SCALE
  ]);
  return defineRoad(from, to, kind, mapPoints, closed, surface, width);
}

export const WORLD_DESTINATIONS = [
  { id: 'trailhead', title: 'THE TRAILHEAD', ...mapPosition(130, 150), accent: 0xd5b77d },
  { id: 'crossing', title: 'THE RIVER CROSSING', ...mapPosition(385, 185), accent: 0x82b8ad },
  {
    id: 'settlement',
    title: 'THE ASHEN SETTLEMENT',
    ...mapPosition(SETTLEMENT_MAP_POSITION.x, SETTLEMENT_MAP_POSITION.y),
    markerX: mapPosition(SETTLEMENT_MAP_POSITION.x - 4, SETTLEMENT_MAP_POSITION.y - 2).x,
    markerZ: mapPosition(SETTLEMENT_MAP_POSITION.x - 4, SETTLEMENT_MAP_POSITION.y - 2).z,
    accent: 0xc99a68
  },
  { id: 'bones', title: 'THE OLD GIANT', ...mapPosition(700, 300), accent: 0xd4af73 },
  { id: 'signal', title: 'THE LAST SIGNAL', ...mapPosition(950, 110), accent: 0xc1a2b8 },
  { id: 'high-pass', title: 'THE HIGH PASS', ...mapPosition(640, 500), accent: 0x9eafcb }
];

export const ZONE_CENTRES = Object.fromEntries(
  WORLD_DESTINATIONS.map(({ id, x, z }) => [id, { x, z }])
);

export const GARAGE_POSITION = mapPosition(200, 520);

export const WORLD_LANDMARKS = [
  { id: 'waterfall', title: 'Silver Drop Waterfall', type: 'water', map: [468, 122], ...mapPosition(468, 122) },
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
  { id: 'horizon-light', title: 'The night light', ...mapPosition(947, 68), requiresSignals: 6, nightOnly: true }
];

export const ASHEN_SETTLEMENT_BUILDINGS = [
  { name: 'The Saffron Bell Inn', district: 'NORTH MARKET', type: 'merchant', w: 14, h: 11, d: 12, x: -60, z: -33, rot: 0, roof: 'hip', color: 0 },
  { name: 'Westgate Apothecary', district: 'NORTH MARKET', type: 'merchant', w: 12, h: 9, d: 10, x: -42, z: -33, rot: 0, roof: 'gable', color: 1 },
  { name: 'The River Ledger House', district: 'NORTH MARKET', type: 'townhouse', w: 13, h: 10, d: 11, x: -12, z: -33, rot: 0, roof: 'parapet', color: 2 },
  { name: 'Cinder & Brass Foundry', district: 'NORTH MARKET', type: 'warehouse', w: 15, h: 9, d: 14, x: 50, z: -33, rot: 0, roof: 'gable', color: 3 },
  { name: 'The Reed & Salt Market', district: 'EAST MARKET', type: 'merchant', w: 14, h: 9, d: 12, x: 40, z: -8, rot: -Math.PI / 2, roof: 'shed', color: 4 },
  { name: 'The Wheelwright Yard', district: 'EAST MARKET', type: 'merchant', w: 14, h: 10, d: 12, x: 90, z: 33, rot: -Math.PI / 2, roof: 'gable', color: 5 },
  { name: 'Stone & Reed Exchange', district: 'SOUTH MARKET', type: 'townhouse', w: 13, h: 10, d: 11, x: 40, z: 33, rot: Math.PI, roof: 'hip', color: 6 },
  { name: 'The Wayfarers’ Hall', district: 'SOUTH MARKET', type: 'townhouse', w: 14, h: 11, d: 12, x: 56, z: 33, rot: Math.PI, roof: 'gable', color: 7 },
  { name: 'The Lanternwrights’ Court', district: 'SOUTH MARKET', type: 'merchant', w: 13, h: 9, d: 11, x: -42, z: 33, rot: Math.PI, roof: 'hip', color: 0 },
  { name: 'The Pass Registry', district: 'GATE STREET', type: 'townhouse', w: 12, h: 10, d: 10, x: -60, z: 0, rot: -Math.PI / 2, roof: 'parapet', color: 1 }
];

export const SETTLEMENT_ROWHOUSE_LAYOUT = (() => {
  const reserved = new Set([
    '-60:-33', '-42:-33', '-12:-33', '56:-33', '40:-7',
    '90:33', '40:33', '56:33', '-42:33', '-60:-7', '-60:7',
    '90:-7', '110:-7', '90:7', '110:7', '110:-72'
  ]);
  const frontages = [
    [-72, 0], [-48, Math.PI], [-33, 0], [-7, Math.PI],
    [7, 0], [33, Math.PI], [48, 0], [72, Math.PI]
  ];
  const lots = [-60, -42, -12, 12, 40, 56, 90, 110];
  return frontages.flatMap(([z, rot], rowIndex) => lots.flatMap((x, lotIndex) => {
    if ((Math.abs(z) === 7 && Math.abs(x) === 12) || reserved.has(`${x}:${z}`)) return [];
    return [{
      x,
      z,
      w: 12 + ((rowIndex + lotIndex) % 3),
      d: 11 + ((rowIndex * 2 + lotIndex) % 3),
      rot
    }];
  }));
})();

export const SETTLEMENT_HIGHLAND_HOMESTEADS = [
  { id: 'highland-home-1', label: 'HERDKEEPER’S CROFT', x: -126, z: -92, w: 12, d: 10, h: 7, rot: 0.42, color: 0, trade: 'HERDS & HAY' },
  { id: 'highland-home-2', label: 'STONECUTTER’S HOUSE', x: -158, z: -111, w: 13, d: 11, h: 7.5, rot: 0.72, color: 1, trade: 'ROAD STONE' },
  { id: 'highland-home-3', label: 'ASH-GARDENER’S CROFT', x: -162, z: -157, w: 12, d: 10, h: 6.5, rot: 0.18, color: 2, trade: 'ROOT CELLAR' },
  { id: 'highland-home-4', label: 'WOODCUTTER’S HOUSE', x: -193, z: -174, w: 13, d: 11, h: 7.5, rot: -0.32, color: 3, trade: 'FIREWOOD' },
  { id: 'highland-home-5', label: 'SHEPHERD’S CROFT', x: -213, z: -122, w: 12, d: 10, h: 6.5, rot: -0.62, color: 4, trade: 'WOOL & MILK' }
];

export const SETTLEMENT_ROADSIDE_HOMESTEADS = [
  { id: 'roadside-inn', label: 'GATEWARD INN', x: -179, z: -86, w: 16, d: 13, h: 8, type: 'inn', color: 1 },
  { id: 'roadside-cottage', label: 'GATEWARD COTTAGE', x: -239, z: -100, w: 13, d: 11, h: 6.4, type: 'cottage', color: 4 },
  { id: 'roadside-farm', label: 'CROFT & WELL', x: -222, z: -195, w: 14, d: 12, h: 6.8, type: 'farm', color: 5 }
];

export const SETTLEMENT_MAP_LANDMARKS = [
  { id: 'west-gate', label: 'WEST GATE', type: 'gate', x: -101, z: 0, w: 9, d: 8 },
  { id: 'market-square', label: 'MARKET SQUARE', type: 'plaza', x: -5, z: 0, w: 37, d: 25 },
  { id: 'council-hall', label: 'COUNCIL HALL', type: 'civic', x: 105, z: 0, w: 25, d: 18 },
  { id: 'chapel', label: 'CHAPEL', type: 'civic', x: 118, z: -105, w: 18, d: 14 },
  { id: 'stables', label: 'STABLES', type: 'service', x: 155, z: 100, w: 24, d: 17 },
  { id: 'harbor-quay', label: 'HARBOR QUAY', type: 'harbor', x: 190, z: -53, w: 82, d: 11 },
  { id: 'upper-cistern', label: 'UPPER CISTERN', type: 'service', x: -88, z: -52, w: 8, d: 8 },
  { id: 'highland-well', label: 'CROFT WELL', type: 'service', x: -187, z: -142, w: 8, d: 8 }
];

export const ROAD_DEFINITIONS = [
  defineRoad(1, 2, 'pass', [[130, 150], [200, 115], [290, 140], [385, 185]]),
  defineRoad(2, 3, 'pass', [
    [385, 185], [465, 200], [550, 215], [650, 220], [735, 210],
    [810, 195], [830, 178], [840, 160], SETTLEMENT_GATE_MAP_POSITION
  ]),
  defineSettlementRoad(3, 4, 'pass', [
    SETTLEMENT_GATE_POINT,
    [-180, -50], [-240, -100], [-320, -160], [-480, -320], [-650, -500],
    [-820, -670], [-990, -840]
  ]),
  defineRoad(4, 5, 'pass', [[700, 300], [765, 250], [805, 170], [860, 110], [875, 110]], false, 'dirt', 18),
  defineRoad('coast', 5, 'pass', [[875, 110], [900, 104], [925, 105], [940, 106], [950, 110]], false, 'dirt', 18),
  defineSettlementRoad(3, 6, 'pass', [
    [-82, 60], [-140, -120], [-270, -360], [-510, -720],
    [-810, -1140], [-1110, -1620], [-1350, -2040]
  ]),
  defineSettlementRoad('settlement-outskirts-road', 'settlement-highland-hamlet', 'trail', [
    [-180, -50], [-155, -72], [-143, -102], [-150, -136], [-178, -158],
    [-207, -151], [-224, -123], [-220, -91], [-197, -64]
  ], true, 'dirt', 6.5),
  defineRoad(6, 4, 'trail', [[640, 500], [700, 470], [650, 435], [705, 395], [660, 350], [700, 300]]),
  defineSettlementRoad('settlement-gate', 'settlement-market-street', 'trail', [
    SETTLEMENT_GATE_POINT, [-82, 0]
  ]),
  defineSettlementRoad('settlement-market-street', 'settlement-market-street', 'trail', [
    [-82, -20], [-25, -20], [25, -20], [75, -20], [125, -20], [145, -20]
  ]),
  defineSettlementRoad('settlement-south-market-street', 'settlement-south-market-street', 'trail', [
    [-82, 20], [-25, 20], [25, 20], [75, 20], [125, 20], [145, 20]
  ]),
  defineSettlementRoad('settlement-north-street', 'settlement-north-street', 'trail', [
    [-82, -60], [-74, -60], [-25, -60], [25, -60], [75, -60], [125, -60], [145, -60]
  ]),
  defineSettlementRoad('settlement-south-street', 'settlement-south-street', 'trail', [
    [-82, 60], [-74, 60], [-25, 60], [25, 60], [75, 60], [125, 60], [145, 60]
  ]),
  defineSettlementRoad('settlement-west-street', 'settlement-west-street', 'trail', [
    [-82, -60], [-82, -20], [-82, 20], [-82, 60]
  ]),
  defineSettlementRoad('settlement-registry-lane', 'settlement-registry-lane', 'trail', [
    [-25, -60], [-25, -20], [-25, 20], [-25, 60]
  ]),
  defineSettlementRoad('settlement-market-cross-street', 'settlement-market-cross-street', 'trail', [
    [25, -60], [25, -20], [25, 20], [25, 60]
  ]),
  defineSettlementRoad('settlement-civic-street', 'settlement-civic-street', 'trail', [
    [75, -60], [75, -20], [75, 20], [75, 60]
  ]),
  defineSettlementRoad('settlement-harbor-street', 'settlement-harbor-street', 'trail', [
    [125, -60], [125, -20], [125, 20], [125, 60]
  ]),
  defineSettlementRoad('settlement-waterfront-lane', 'settlement-waterfront-lane', 'trail', [
    [145, -60], [145, -20], [145, 20], [145, 60]
  ]),
  defineSettlementRoad('settlement-council-yard', 'settlement-civic-street', 'trail', [
    [75, -20], [82, -16], [88, -13]
  ]),
  defineSettlementRoad('settlement-chapel-lane', 'settlement-north-street', 'trail', [
    [125, -60], [120, -78], [118, -88]
  ]),
  defineSettlementRoad('settlement-quay-road', 'settlement-waterfront-lane', 'pass', [
    [145, -60], [166, -60], [190, -56], [216, -52], [242, -48]
  ], false, 'dirt'),
  defineSettlementRoad('settlement-south-street', 'settlement-stable', 'trail', [
    [125, 60], [145, 82], [176, 82], [184, 102], [184, 123], [155, 123]
  ]),
  defineRoad(1, 'mw', 'trail', [[130, 150], [105, 260], [150, 400], [200, 520]]),
  defineRoad('mw', 3, 'trail', [
    [200, 520], [254, 450], [310, 365], [350, 285], [385, 185],
    [470, 200], [600, 225], [700, 205], [780, 185], [845, 166], SETTLEMENT_GATE_MAP_POSITION
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
export const PIER_POSITION = { x: SIGNAL_PEAK.x + 210, z: SIGNAL_PEAK.z };
