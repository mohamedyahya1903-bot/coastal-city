// ============================================================================
// houses.js — Los Santos, standing work 2: "every house on every road".
// Builder module: this file ONLY. No other file is edited.
//
// v7 (round 7, map v14, Nov 20 2026): deliberate Hillcrest bench development.
// Round 7: 252 houses, 57,496 tris, 14 draw calls on map v14 (test-place7.mjs 69/69).
// Bench rows: A 3, F 1, B 2, E 1 = 7 Grove-Street bungalows on the hillBenches pads.
//
// v6 (round 6, map v10, Nov 20 2026): sparse-road infill + Vinewood two-storey.
//
// v5 (round 5, map v9, Nov 20 2026): downtown residential character + alley awareness.
// Round 6: 270 houses, 57,825 tris, 14 draw calls on map v10 (test-place6.mjs 59/59).
//
// v4 (round 4, map v7c, Nov 20 2026): infill + front-yard curb appeal.
//v3 (round 3, map v7c, Nov 20 2026): diet + variety pass.
//  - DIET: 59,496 -> 43,294 tris at the same 200-house cap (band 40-45k).
//    Cuts keep the street-level look: street-face windows keep their white trim,
//    side/rear windows drop to glass-only; domes 10x5 -> 8x4 segments; barrel
//    vault full cylinder -> open half-shell with half-disc ends; posts/columns/
//    chimneys 6-8 seg -> 5-6 seg. Rounded shapes stay rounded - no boxy swaps.
//  - VARIETY: per-house roof/wall/door tint jitter from the EXISTING palette via
//    vertex colors (materials unchanged, vertexColors:true, baked near-white
//    multipliers seeded by a hash of the placement index) + 2 street-visible trim
//    variants per archetype (flower box / round attic vent) picked by the same
//    hash. No new textures, 0 new draw calls (same 14 shared materials).
//  - TAXI STOPS: candidate footprints rejected within 6 m of any map.taxiStops
//    stop (stop-to-rect distance in the house's local frame).
//  - v7c roads: Hillcrest upper stretch is now 3 switchbacks (handled by the
//    existing winding-road class); NEW Pelican Court + Grove Court cul-de-sac
//    loops are zoned BY LOCATION (Southside) before the winding check, so they
//    get bungalows, not hillside villas (coordinator's v7c note). The two new
//    narrow downtown secondaries (w=6 between tower lots) classify as grid but
//    every candidate there is correctly rejected by the 4 m lot-clearance rule.
//  - LOTS_L re-verified byte-identical between v7b and v7c (still current).
//
// v7 (this version):
//  - BENCH DEVELOPMENT: map.hillBenches (v14) are flat buildable terraces beside
//    the Hillcrest switchbacks. They are developed BY DESIGN before the road
//    walks: Grove-Street bungalow rows (the 'south' archetype pool - zoned by
//    LOCATION, since the switchbacks read as winding and would attract villas),
//    each home facing its nearest road point. Bench A takes a row of up to 4,
//    B two, E/F one each; every placement goes through validFootprint and
//    map.addBlock like any road-side lot. Slots blocked by an existing
//    addBlock footprint (props/vehicles/lots) are skipped and reported in
//    stats.benches[].displaced - nothing is displaced silently.
//  - HILLCREST CAP: the hillcrest zone tops out at 14 homes total (bench +
//    road-side), per the round-7 brief's 10-14 range.
//  - Bench homes skip front-yard features: the pads are 10 m deep, a hedge or
//    tree would hang off the terrace apron.
//
// v6:
//  - NEW ARCHETYPE: two-storey suburban with a rounded-railed balcony (Vinewood-
//    hills feel), ~220 tris/instance (cap 3.5k); primary pick on the hillcrest climb.
//  - SPARSE-ROAD INFILL: placement walks roads round-robin (was: one road at a
//    time) so the 218-cap no longer starves late-ranked roads; hillcrest walks at
//    6 m steps (was width+2.5) to find the small flat pockets between switchbacks.
//  - Growth-phase picks (past the v5 count) use a lean pool (hip/cottage/barrel)
//    so the infill fits the 58k tri budget; apartment fringe gate closes in the
//    growth phase too (apartment blocks are 470 tris).
//  - map v10: highway-ramp skip now keys on w>=10 (v10 eased the ramp to 7 pts);
//    validFootprint also honours map.isBlocked (v10 coastal median hedges +
//    props/vehicles addBlock footprints) on all 8 sample points.
//  - Coverage audit gains a frontage metric: sum(w + 2.5 m gap) / road length.
//
// v5:
//  - NEW ARCHETYPE: 3-storey apartment block (rounded balcony rails + entrance
//    dome, original geometry) placed ONLY on downtown-fringe grid lots (within
//    40 m of the tower-block core rect, derived from geometry - the brief's road
//    index list pointed at Southside; the mission says closest to the towers).
//    Cap 12 blocks; they replace the suburban pick on those lots.
//  - ALLEYS (map v9): cls:'alley' paths classify 'skip' (no houses face them);
//    isRoadAt already covers alleys + parking lots. Any placed house whose
//    footprint comes within 4 m of an alley centerline gets a rear fence on the
//    alley-facing edge (merged into the existing buckets).
//  - Budget: <= 52k tris, <= 16 draws (still 14 buckets).
//
// v4:
//  - INFILL: MAX_HOUSES 200 -> 220 (same dial, same semantics) + tighter walk
//    step (side gap 3.5 -> 2.5 m) + seeded front-setback jitter (+-1.2 m) so
//    sparse grid roads fill in where spacing allows; all v3 placement rules
//    unchanged (off-road, 6 m taxi-stop clear, 2 m pairwise spacing).
//  - FRONT YARDS: low sage hedge OR white ranch fence along the front lot line
//    (seeded hash, ~60% of houses, never on corner shops), and 1 small
//    rounded-canopy tree on ~1/3 of lots. All merged into the existing 14
//    material buckets: 0 new draw calls, no new textures, rounded shapes.
//  - Diet kept: one side window per house (was two) funds the yard geometry;
//    total: 218 houses, 48,002 tris (<= 50k cap), 14 draws. Yards sit clear of the road edge (~1.2 m) and of
//    the props strip, and no deeper into the block than the v3 row (tolerant of
//    the roads builder's planned mid-block alleys).
//
// Perf (Galaxy M02s hard budget): all houses bake into one merged BufferGeometry
// per material: 14 draw calls total, shared MeshLambertMaterials, no shadows,
// 0 per-house draw calls. update(dt) is a no-op.
//
// Procedural original geometry only. No GLTF models are loaded, so no asset
// licences are added to MODEL-SOURCES.md by this module.
//
// ---- Coordinator notes ----
// Exact wiring line expected in main.js (after createMap), unchanged:
//   const houses = createHouses({ THREE, scene, map, GLTFLoader });
// (buildHouses is exported as an alias; main.js imports createHouses.)
// Optionally call houses.update(dt) in the loop (no-op today).
// houses.count, houses.placements, houses.stats { drawCalls, triangles,
// trisByArch, coverage }.
// MAX_HOUSES (below) is the FPS dial: single integer cap, tune for the M02s bench.
// This module calls map.addBlock(minX, minZ, maxX, maxZ) for every placed house.
// LOTS_L is mirrored from map.js LOTS_L (verified identical in v7b and v7c) — if
// map.js changes its lot list, sync the copy here.
// ============================================================================

export function createHouses({ THREE, scene, map, GLTFLoader }) { // eslint-disable-line no-unused-vars
  const C = 300;                       // layout -> world offset (world = layout - 300)
  const lw = (lx) => lx - C;
  const lz = (ly) => ly - C;

  // ---- shared materials (one draw call per material for the whole district) ----
  // vertexColors:true on every material: per-house tint jitter is baked as
  // near-white vertex colors (multiplies the palette color), 0 extra draw calls.
  const mat = (color) => new THREE.MeshLambertMaterial({ color, vertexColors: true });
  const MATS = {
    wall0: mat(0xe8dcc8), // cream stucco
    wall1: mat(0xdfa06e), // terracotta
    wall2: mat(0xa8c4d4), // pale blue
    wall3: mat(0xc9d6ab), // sage
    roof0: mat(0x8a4a3a), // red-brown tile
    roof1: mat(0x5a6068), // slate
    roof2: mat(0xb08a5a), // tan
    trim:  mat(0xf2eee2), // white trim
    glass: mat(0x243b52), // window glass
    door:  mat(0x5f4128), // wood door
    conc:  mat(0x9d9a92), // concrete slabs
    brick: mat(0x9a5a4a), // chimney brick
    dark:  mat(0x3a3e44), // flat roof deck
    sign:  mat(0xf0e0b8), // corner-shop sign board
  };
  // tint-jitter category per material (parts not listed get no jitter)
  const JIT = { wall0: 'wall', wall1: 'wall', wall2: 'wall', wall3: 'wall',
    roof0: 'roof', roof1: 'roof', roof2: 'roof', door: 'door', trim: 'trim', sign: 'trim' };

  // ---- occupied regions (all in LAYOUT coords unless noted) ----
  // Existing lots mirrored from map.js LOTS_L (verified identical in v7b and v7c).
  const LOTS_L = [
    [212,212,244,244],[252,212,276,240],[212,252,240,276],[252,252,276,276],
    [292,212,324,244],[292,252,324,276],[212,292,244,324],[252,292,276,324],
    [292,292,324,324],[160,210,186,232],[160,392,186,414],[160,296,186,318],
    [160,330,186,352],[160,366,186,388],[460,220,480,238],[495,220,515,238],
    [530,220,550,238],[460,300,480,318],[530,300,550,318],[460,380,480,398],
    [495,380,515,398],[530,380,550,398],[380,210,410,250],[380,290,410,330],
    [520,100,556,130],[494,300,516,318],
  ];
  const LOTS_W = LOTS_L.map(([x0, y0, x1, y1]) => ({ minX: lw(x0), maxX: lw(x1), minZ: lz(y0), maxZ: lz(y1) }));
  const PARK_W = { minX: lw(210), maxX: lw(350), minZ: lz(368), maxZ: lz(432) }; // Seaside Park grass (map.js ground mesh)
  const PIER_W = { minX: lw(20), maxX: lw(122), minZ: lz(292), maxZ: lz(308) };  // Pelican Pier deck
  const WATER_X = lw(82);                                                        // water west of here (world)
  const TAXI = (map.taxiStops || []).map((s) => ({ x: s.x, z: s.z }));           // world coords already
  const ALLEYS = (map.roadPaths || []).filter((r) => r.cls === 'alley');         // v9 service alleys
  function pointSegDist(px, pz, ax, az, bx, bz) { // exact 2D point-to-segment distance
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    let t = L2 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(ax + dx * t - px, az + dz * t - pz);
  }
  function segsCross(ax, az, bx, bz, cx, cz, dx2, dz2) { // 2D segment intersection test
    const o = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
    const d1 = o(cx, cz, dx2, dz2, ax, az), d2 = o(cx, cz, dx2, dz2, bx, bz);
    const d3 = o(ax, az, bx, bz, cx, cz), d4 = o(ax, az, bx, bz, dx2, dz2);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  function alleyDist(bb) { // exact min distance (world) from a house AABB to any alley centerline
    let best = Infinity;
    for (const a of ALLEYS) {
      for (let i = 0; i < a.pts.length - 1; i++) {
        const ax = lw(a.pts[i][0]), az = lz(a.pts[i][1]), bx = lw(a.pts[i + 1][0]), bz = lz(a.pts[i + 1][1]);
        const inBB = (x, z) => x >= bb.minX && x <= bb.maxX && z >= bb.minZ && z <= bb.maxZ;
        if (inBB(ax, az) || inBB(bx, bz)) return 0;
        const E = [[bb.minX, bb.minZ, bb.maxX, bb.minZ], [bb.maxX, bb.minZ, bb.maxX, bb.maxZ],
                   [bb.maxX, bb.maxZ, bb.minX, bb.maxZ], [bb.minX, bb.maxZ, bb.minX, bb.minZ]];
        let d = Math.min(
          Math.hypot(ax - Math.max(bb.minX, Math.min(bb.maxX, ax)), az - Math.max(bb.minZ, Math.min(bb.maxZ, az))),
          Math.hypot(bx - Math.max(bb.minX, Math.min(bb.maxX, bx)), bz - Math.max(bb.minZ, Math.min(bb.maxZ, bz))));
        for (const [ex1, ez1, ex2, ez2] of E) {
          if (segsCross(ax, az, bx, bz, ex1, ez1, ex2, ez2)) { d = 0; break; }
          d = Math.min(d, pointSegDist(ex1, ez1, ax, az, bx, bz), pointSegDist(ex2, ez2, ax, az, bx, bz));
        }
        if (d < best) best = d;
      }
    }
    return best;
  }

  // ---- road classification, fully derived from roadPaths geometry (v7c) ----
  // 'skip': no houses (boardwalk arc = shops row + beach; diagonal downtown avenue
  // = commercial canyon; highway ramp). 'hillcrest': winding EASTERN climb only.
  // v7c cul-de-sac loops (Pelican/Grove Court) are multi-point but sit west of
  // x=360: zone by location BEFORE the winding check (coordinator's v7c note), so
  // they fall through to 'grid' and get Southside bungalows, not hillside villas.
  function classify(r) {
    if (r.cls === 'alley') return 'skip';            // v9 service alleys: no houses face them
    const xs = r.pts.map((p) => p[0]);
    const maxX = Math.max(...xs);
    if (r.w >= 10) return 'skip';                        // v10: highway-class (eased on-ramp, 7 pts)
    if (r.pts.length === 2 && r.pts[0][0] === 500 && r.pts[1][0] === 500) return 'skip'; // highway ramp (pre-v10 shape)
    if (r.w <= 6 && r.cls !== 'grid') return 'skip';        // v7c downtown secondaries (cls unset): driveway-scale canyons between tower lots;
    // v8 (round 8): w=6 streets the map marks cls 'grid' (C1/C2 Southside infill, E1 secondary) are house-ready
    if (r.pts.length > 2 && maxX < 140) return 'skip';   // curved boardwalk arc
    if (r.pts.length > 2 && maxX <= 210) return 'skip';  // diagonal downtown avenue
    if (r.pts.length > 2 && maxX > 450) return 'hillcrest'; // winding eastern climb (switchbacks)
    return 'grid';
  }

  // ---- junction points derived from roadPaths (for corner-shop siting) ----
  function segDist2(a, b, c, d) { // min squared distance between segments ab and cd (layout coords)
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
    const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
    const d1 = sub(b, a), d2 = sub(d, c), r = sub(a, c);
    const A = dot(d1, d1), E = dot(d2, d2), F = dot(d2, r), Cc = dot(d1, r), B = dot(d1, d2);
    const den = A * E - B * B;
    let s = den > 1e-9 ? (B * F - Cc * E) / den : 0;
    s = Math.min(1, Math.max(0, s));
    let t = E > 1e-9 ? (B * s + F) / E : 0;
    t = Math.min(1, Math.max(0, t));
    s = A > 1e-9 ? Math.min(1, Math.max(0, (B * t - Cc) / A)) : 0;
    const p1 = [a[0] + d1[0] * s, a[1] + d1[1] * s], p2 = [c[0] + d2[0] * t, c[1] + d2[1] * t];
    const dx = p1[0] - p2[0], dy = p1[1] - p2[1];
    return { d2: dx * dx + dy * dy, x: (p1[0] + p2[0]) / 2, y: (p1[1] + p2[1]) / 2 };
  }
  // v8 (round 8): two junction sets. JUNCTIONS keeps v7's exact membership
  // (non-skip, non-infill roads) so corner-shop siting - and the rng stream -
  // is unchanged. JUNCTIONS_INFILL holds junctions that touch a w=6 cls 'grid'
  // infill street (C1/C2, E1); the late infill pass uses it to stay clear of
  // the junction arms + their markings.
  const isInfillRoad = (r) => r.w <= 6 && r.cls === 'grid';
  const JUNCTIONS = []; // layout coords
  const JUNCTIONS_INFILL = [];
  {
    const roads = map.roadPaths.filter((r) => classify(r) !== 'skip');
    for (let i = 0; i < roads.length; i++) {
      for (let j = i + 1; j < roads.length; j++) {
        let best = null;
        const A = roads[i].pts, B = roads[j].pts;
        for (let a = 0; a < A.length - 1; a++) {
          for (let b = 0; b < B.length - 1; b++) {
            const r = segDist2(A[a], A[a + 1], B[b], B[b + 1]);
            if (!best || r.d2 < best.d2) best = r;
          }
        }
        if (best && best.d2 < 12 * 12)
          (isInfillRoad(roads[i]) || isInfillRoad(roads[j]) ? JUNCTIONS_INFILL : JUNCTIONS).push([best.x, best.y]);
      }
    }
  }
  function nearJunction(lx, ly, rad, set = JUNCTIONS) {
    for (const [jx, jy] of set) {
      const dx = jx - lx, dy = jy - ly;
      if (dx * dx + dy * dy < rad * rad) return true;
    }
    return false;
  }

  // ---- deterministic rng (stable layouts between loads/tests) ----
  let seed = 20261120 >>> 0;
  function rng() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ---- seeded per-house hash: tint jitter + trim variant, independent of rng ----
  function houseHash(i) { let h = Math.imul((i + 1) ^ 0x9E3779B9, 2654435761) >>> 0; h ^= h >>> 13; h = Math.imul(h, 2246822519) >>> 0; return (h ^ (h >>> 15)) >>> 0; }
  function houseJitter(i) {
    const h = houseHash(i);
    const j = (bits, lo, hi) => lo + (((h >>> bits) & 255) / 255) * (hi - lo);
    return {
      wall: [j(0, 0.86, 1.05), j(3, 0.86, 1.05), j(6, 0.86, 1.05)],
      roof: [j(9, 0.82, 1.02), j(12, 0.82, 1.02), j(15, 0.82, 1.02)],
      door: [j(18, 0.8, 1.08), j(20, 0.88, 1.05), j(22, 0.88, 1.05)],
      trim: [j(25, 0.94, 1.02), j(27, 0.94, 1.02), j(29, 0.94, 1.02)],
      variant: (h >>> 31) & 1, // trim variant: 0 = flower box, 1 = round attic vent
    };
  }

  // ---- small geometry helpers ----
  const box  = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl  = (rt, rb, h, s, open, ts, tl) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open || false, ts || 0, tl === undefined ? Math.PI * 2 : tl);
  const cone = (r, h, s) => new THREE.ConeGeometry(r, h, s, 1);
  const dome = (r) => new THREE.SphereGeometry(r, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2); // v3: 10x5 -> 7x3
  const domeS = (r) => new THREE.SphereGeometry(r, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2); // small accent domes
  const halfDisc = (r, s) => new THREE.CircleGeometry(r, s, 0, Math.PI);
  // part: geometry + material key + local translate + optional euler (applied Rz,Rx,Ry) + scale
  const P = (g, m, t, o = {}) => ({ g, m, t, ry: o.ry || 0, rx: o.rx || 0, rz: o.rz || 0, s: o.s || [1, 1, 1] });

  function win(parts, x, y, z, ry) { // STREET-FACE window: white trim + glass (facing +Z rotated by ry)
    const ox = Math.sin(ry), oz = Math.cos(ry);
    parts.push(P(box(1.7, 1.5, 0.1), 'trim', [x + ox * 0.02, y, z + oz * 0.02], { ry }));
    parts.push(P(box(1.4, 1.2, 0.16), 'glass', [x + ox * 0.06, y, z + oz * 0.06], { ry }));
  }
  function winSide(parts, x, y, z, ry) { // v3 diet: side/rear windows are glass-only (no trim box)
    const ox = Math.sin(ry), oz = Math.cos(ry);
    parts.push(P(box(1.4, 1.2, 0.14), 'glass', [x + ox * 0.05, y, z + oz * 0.05], { ry }));
  }
  function front(parts, w, d, twoStorey) { // door + trimmed windows on the street face (+Z), glass-only sides
    const fx = -w * 0.22;
    parts.push(P(box(1.34, 2.5, 0.12), 'trim', [fx, 1.25, d / 2 + 0.02]));
    parts.push(P(box(1.05, 2.3, 0.18), 'door', [fx, 1.15, d / 2 + 0.07]));
    win(parts, w * 0.2, 1.7, d / 2, 0);
    if (w > 9.4) win(parts, w * 0.38, 1.7, d / 2, 0);
    winSide(parts, w / 2, 1.7, -d * 0.15, Math.PI / 2); // v4 diet: one side window (was two)
    if (twoStorey) {
      win(parts, w * 0.2, 4.5, d / 2, 0);
      winSide(parts, -w * 0.22, 4.5, d / 2, 0);
      winSide(parts, w / 2, 4.5, 0, Math.PI / 2);
    }
  }
  function chimney(parts, rt, rb, h, x, y, z) { // v3 diet: open tube + top disc only
    parts.push(P(cyl(rt, rb, h, 5, true), 'brick', [x, y, z]));
    parts.push(P(new THREE.CircleGeometry(rt, 5), 'brick', [x, y + h / 2, z], { rx: -Math.PI / 2 }));
  }
  // yard items sit at grade: +0.3 y compensates the house's 0.3 foundation sink
  function hedge(parts, x, z) { // low rounded sage hedge along the front lot line
    parts.push(P(cyl(0.35, 0.35, 2.8, 4, true, 0, Math.PI), 'wall3', [x, 0.35, z], { rz: Math.PI / 2 }));
    parts.push(P(halfDisc(0.35, 4), 'wall3', [x - 1.4, 0.35, z], { ry: -Math.PI / 2 }));
    parts.push(P(halfDisc(0.35, 4), 'wall3', [x + 1.4, 0.35, z], { ry: Math.PI / 2 }));
  }
  function fence(parts, x, z) { // white ranch fence: top rail + two posts
    parts.push(P(cyl(0.045, 0.045, 2.8, 4, true), 'trim', [x, 0.92, z], { rz: Math.PI / 2 }));
    parts.push(P(cyl(0.06, 0.06, 0.75, 4, true), 'trim', [x - 1.35, 0.675, z]));
    parts.push(P(cyl(0.06, 0.06, 0.75, 4, true), 'trim', [x + 1.35, 0.675, z]));
  }
  function fenceZ(parts, x, z) { // same ranch fence, running along Z (rear/side lot lines)
    parts.push(P(cyl(0.045, 0.045, 2.8, 4, true), 'trim', [x, 0.92, z], { rx: Math.PI / 2 }));
    parts.push(P(cyl(0.06, 0.06, 0.75, 4, true), 'trim', [x, 0.675, z - 1.35]));
    parts.push(P(cyl(0.06, 0.06, 0.75, 4, true), 'trim', [x, 0.675, z + 1.35]));
  }
  function tree(parts, x, z) { // small rounded-canopy yard tree
    parts.push(P(cyl(0.12, 0.16, 1.2, 5, true), 'brick', [x, 0.9, z]));
    parts.push(P(new THREE.SphereGeometry(1.15, 5, 3), 'wall3', [x, 2.2, z], { s: [1, 0.85, 1] }));
  }
  function porch(parts, fx, d, roofM) { // slab + two round posts + flat porch roof (v3: 5-seg posts)
    parts.push(P(box(3.4, 0.18, 1.9), 'conc', [fx, 0.09, d / 2 + 0.95]));
    parts.push(P(cyl(0.12, 0.14, 2.3, 5, true), 'trim', [fx - 1.5, 1.32, d / 2 + 1.55]));
    parts.push(P(cyl(0.12, 0.14, 2.3, 5, true), 'trim', [fx + 1.5, 1.32, d / 2 + 1.55]));
    parts.push(P(box(3.7, 0.16, 2.2), roofM, [fx, 2.62, d / 2 + 1.05]));
  }
  function driveway(parts, w, d) { // concrete slab toward the street; ends ~1.4 m from the
    parts.push(P(box(2.8, 0.12, 3.1), 'conc', [w / 2 - 1.8, 0.06, d / 2 + 1.55])); // road edge
  }                                                                                  // (props strip stays clear)

  // ---- 8 house archetypes (all rounded shapes; footprints keep slope < 0.5 m) ----
  // Each returns { w, d, h, parts } in local coords: front = +Z (street side), ground y=0.
  function archBungalowHip(wall, roof) { // Southside / standard single-storey, hip roof
    const w = 9, d = 7.5, h = 3, parts = [];
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    parts.push(P(box(w + 0.7, 0.22, d + 0.7), roof, [0, h, 0])); // eave
    parts.push(P(cone(Math.hypot(w, d) / 2 * 0.95, 2.2, 4), roof, [0, h + 1.1, 0], { ry: Math.PI / 4, s: [1, 1, d / w] }));
    chimney(parts, 0.3, 0.34, 1.6, w / 2 - 1.4, h + 0.9, -1);
    front(parts, w, d, false);
    porch(parts, -w * 0.22, d, roof);
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  function archBungalowBarrel(wall, roof) { // small bungalow, rounded barrel-vault roof
    const w = 8.5, d = 7, h = 3, parts = [];
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    // v3 diet: open half-shell (top half only) + half-disc ends; bottom half was hidden in the walls
    parts.push(P(cyl(3.4, 3.4, w + 0.5, 6, true, 0, Math.PI), roof, [0, h - 0.2, 0], { rz: Math.PI / 2 }));
    parts.push(P(halfDisc(3.4, 6), roof, [-(w + 0.5) / 2, h - 0.2, 0], { ry: -Math.PI / 2 }));
    parts.push(P(halfDisc(3.4, 6), roof, [(w + 0.5) / 2, h - 0.2, 0], { ry: Math.PI / 2 }));
    parts.push(P(box(w + 0.5, 0.2, d + 0.5), 'trim', [0, h - 0.15, 0])); // trim band under the vault
    front(parts, w, d, false);
    parts.push(P(cyl(0.6, 0.6, 2.2, 6, true), roof, [-w * 0.22, 2.6, d / 2 + 0.4], { rz: Math.PI / 2 })); // door canopy
    parts.push(P(box(3.2, 0.16, 1.7), 'conc', [-w * 0.22, 0.08, d / 2 + 0.85]));
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  function archCottageDome(wall, roof) { // small rounded cottage with a dome roof
    const w = 8, d = 8, h = 3.2, parts = [];
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    parts.push(P(box(w + 0.6, 0.22, d + 0.6), 'trim', [0, h, 0]));
    parts.push(P(dome(4.6), roof, [0, h + 0.05, 0], { s: [1, 0.62, 1] }));
    chimney(parts, 0.28, 0.32, 1.3, -w / 2 + 1.3, h + 0.6, -1.5);
    front(parts, w, d, false);
    // v3 diet: rounded door canopy + slab instead of a full porch (same street read)
    parts.push(P(cyl(0.6, 0.6, 2.2, 6, true), roof, [-w * 0.22, 2.6, d / 2 + 0.4], { rz: Math.PI / 2 }));
    parts.push(P(box(3.2, 0.16, 1.7), 'conc', [-w * 0.22, 0.08, d / 2 + 0.85]));
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  function archSpanish(wall, roof) { // flat roof + parapet, dome over the entrance, columns
    const w = 10, d = 8, h = 3.4, parts = [];
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    parts.push(P(box(w - 0.2, 0.12, d - 0.2), 'dark', [0, h + 0.04, 0])); // roof deck
    parts.push(P(box(w + 0.4, 0.55, 0.25), wall, [0, h + 0.24, d / 2 + 0.07]));  // parapets
    parts.push(P(box(w + 0.4, 0.55, 0.25), wall, [0, h + 0.24, -d / 2 - 0.07]));
    parts.push(P(box(0.25, 0.55, d + 0.4), wall, [w / 2 + 0.07, h + 0.24, 0]));
    parts.push(P(box(0.25, 0.55, d + 0.4), wall, [-w / 2 - 0.07, h + 0.24, 0]));
    parts.push(P(domeS(1.7), roof, [-w * 0.22, h + 0.1, d / 2 - 1.3], { s: [1, 0.75, 1] }));
    parts.push(P(cyl(0.16, 0.18, 2.6, 5, true), 'trim', [-w * 0.22 - 1.4, 1.3, d / 2 + 1.3])); // porch columns
    parts.push(P(cyl(0.16, 0.18, 2.6, 5, true), 'trim', [-w * 0.22 + 1.4, 1.3, d / 2 + 1.3]));
    parts.push(P(box(3.6, 0.35, 0.6), 'trim', [-w * 0.22, 2.75, d / 2 + 1.3]));
    parts.push(P(box(3.6, 0.16, 2.1), 'conc', [-w * 0.22, 0.08, d / 2 + 1.0]));
    front(parts, w, d, false);
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  function archGable2(wall, roof) { // 2-storey gable house, triangular prism roof
    const w = 9.5, d = 8, h = 5.4, parts = [];
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    parts.push(P(box(w + 0.6, 0.25, d + 0.6), 'trim', [0, h, 0]));     // eave
    const r = d / (2 * 0.866), sy = 0.45; // ridge-up triangular prism, squashed
    parts.push(P(cyl(r, r, w + 0.5, 3, 1, false, Math.PI / 2), roof, [0, h + 0.5 * r * sy, 0], { rz: Math.PI / 2, s: [1, sy, 1] }));
    chimney(parts, 0.3, 0.34, 1.8, w / 2 - 1.5, h + 1.4, 0);
    front(parts, w, d, true);
    porch(parts, -w * 0.22, d, roof);
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  function archVilla(wall, roof) { // Palm Court 2-storey villa, balcony + columns
    const w = 11, d = 8.5, h = 6, parts = [];
    parts.push(P(box(w, 3.1, d), wall, [0, 1.55, 0]));
    parts.push(P(box(w - 1, 2.9, d - 1), wall, [0, 3.1 + 1.45, 0]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) // rounded corner columns (v3: 5-seg)
      parts.push(P(cyl(0.2, 0.24, 3.1, 5, true), 'trim', [sx * (w / 2 - 0.05), 1.55, sz * (d / 2 - 0.05)]));
    parts.push(P(box(w - 1 + 0.7, 0.25, d - 1 + 0.7), roof, [0, 6, 0])); // eave
    parts.push(P(cone(Math.hypot(w - 1, d - 1) / 2 * 0.95, 2.4, 4), roof, [0, 6 + 1.2, 0], { ry: Math.PI / 4, s: [1, 1, (d - 1) / (w - 1)] }));
    parts.push(P(box(4.4, 0.16, 1.4), 'conc', [0.8, 3.2, (d - 1) / 2 + 0.62])); // balcony slab
    for (const bx of [-1.1, 0.8, 2.7])
      parts.push(P(cyl(0.05, 0.05, 0.95, 5, true), 'trim', [bx, 3.75, (d - 1) / 2 + 1.25]));
    parts.push(P(cyl(0.06, 0.06, 4.3, 5, true), 'trim', [0.8, 4.25, (d - 1) / 2 + 1.25], { rz: Math.PI / 2 })); // rail
    chimney(parts, 0.3, 0.34, 1.6, -w / 2 + 1.6, 6 + 0.8, -1.5);
    front(parts, w, d, true);
    porch(parts, -w * 0.22, d, roof);
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  // Hillside villa with a ROUNDED GARAGE (Hillcrest / Palm Court).
  function archHillVillaGarage(wall, roof) {
    const w = 9.5, d = 8, h = 5.7, parts = [];
    parts.push(P(box(w - 2.6, 3, d), wall, [1.3, 1.5, 0]));                    // main block (right of garage)
    parts.push(P(box(w - 2.6 - 0.6, 2.7, d - 0.8), wall, [1.3, 3 + 1.35, 0])); // upper floor
    parts.push(P(box(w - 2.6 + 0.6, 0.22, d + 0.6), roof, [1.3, 5.7, 0]));     // eave
    parts.push(P(cone(Math.hypot(w - 3.2, d - 0.8) / 2 * 0.95, 2, 4), roof, [1.3, 5.7 + 1, 0], { ry: Math.PI / 4, s: [1, 1, (d - 0.8) / (w - 3.2)] }));
    // rounded garage: box + half-cylinder vault, roll-up door facing the street
    parts.push(P(box(3.6, 2.5, d - 1.4), wall, [-w / 2 + 1.8, 1.25, 0.3]));
    parts.push(P(cyl(1.85, 1.85, 3.7, 6, true, 0, Math.PI), roof, [-w / 2 + 1.8, 2.3, 0.3], { rz: Math.PI / 2 })); // v3: open half-shell
    parts.push(P(halfDisc(1.85, 6), roof, [-w / 2 + 1.8 - 1.85, 2.3, 0.3], { ry: -Math.PI / 2 }));
    parts.push(P(halfDisc(1.85, 6), roof, [-w / 2 + 1.8 + 1.85, 2.3, 0.3], { ry: Math.PI / 2 }));
    parts.push(P(box(2.9, 2, 0.16), 'dark', [-w / 2 + 1.8, 1, d / 2 + 0.05])); // roll-up door
    parts.push(P(box(3.3, 0.24, 0.2), 'trim', [-w / 2 + 1.8, 2.1, d / 2 + 0.06]));
    // door + windows on the street face
    parts.push(P(box(1.34, 2.5, 0.12), 'trim', [1.3 - 1.2, 1.25, d / 2 + 0.02]));
    parts.push(P(box(1.05, 2.3, 0.18), 'door', [1.3 - 1.2, 1.15, d / 2 + 0.07]));
    win(parts, 1.3 + 1.2, 1.7, d / 2, 0);
    winSide(parts, 1.3 + 1.0, 4.6, d / 2, 0);
    winSide(parts, 1.3 - 1.2, 4.6, d / 2, 0);
    winSide(parts, w / 2, 1.7, 0, Math.PI / 2);
    chimney(parts, 0.28, 0.32, 1.4, w / 2 - 1.2, 5.9, -1.5);
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  // Round-6 archetype: two-storey suburban with a balcony (Vinewood-hills feel):
  // barrel-vault roof, rounded balcony rail on round posts, rounded entry canopy.
  function archVinewood(wall, roof) {
    const w = 8.5, d = 6.5, h = 6.4, parts = []; // narrow footprint: passes the 0.5 m slope rule on the 7% climb
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    parts.push(P(cyl(3.6, 3.6, w + 0.5, 6, true, 0, Math.PI), roof, [0, h - 0.2, 0], { rz: Math.PI / 2 })); // barrel vault
    parts.push(P(halfDisc(3.6, 6), roof, [-(w + 0.5) / 2, h - 0.2, 0], { ry: -Math.PI / 2 }));
    parts.push(P(halfDisc(3.6, 6), roof, [(w + 0.5) / 2, h - 0.2, 0], { ry: Math.PI / 2 }));
    parts.push(P(box(w + 0.5, 0.2, d + 0.5), 'trim', [0, h - 0.15, 0])); // trim band under the vault
    // balcony over the entry: slab + rounded rail + round posts + glazed door
    parts.push(P(box(3.6, 0.16, 1.2), 'conc', [-w * 0.22 + 0.6, 3.1, d / 2 + 0.55]));
    parts.push(P(cyl(0.045, 0.045, 3.6, 5, true), 'trim', [-w * 0.22 + 0.6, 4.0, d / 2 + 1.1], { rz: Math.PI / 2 }));
    for (const bx of [-1.4, 0, 1.4])
      parts.push(P(cyl(0.045, 0.045, 0.9, 5, true), 'trim', [-w * 0.22 + 0.6 + bx, 3.55, d / 2 + 1.1]));
    parts.push(P(box(1.24, 2.4, 0.12), 'trim', [-w * 0.22 + 0.6, 4.35, d / 2 + 0.02]));
    parts.push(P(box(0.95, 2.2, 0.18), 'glass', [-w * 0.22 + 0.6, 4.3, d / 2 + 0.07]));
    win(parts, w * 0.28, 4.4, d / 2, 0);                 // upper front window
    front(parts, w, d, false);                            // ground floor: door + trimmed windows
    parts.push(P(cyl(0.6, 0.6, 2.4, 6, true), roof, [-w * 0.22, 2.75, d / 2 + 0.42], { rz: Math.PI / 2 })); // entry canopy
    winSide(parts, w / 2, 4.4, -d * 0.1, Math.PI / 2);   // upper side windows
    winSide(parts, -w / 2, 4.4, -d * 0.1, -Math.PI / 2);
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  // Round-5 archetype: 3-storey downtown apartment block. Rounded balcony rails
  // (open half-cyl rails + round posts), entrance dome, parapet roof with a
  // domed stair bulkhead. Original geometry only.
  function archApartment(wall, roof) {
    const w = 12, d = 10, h = 9, parts = [];
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    parts.push(P(box(w - 0.4, 0.15, d - 0.4), 'dark', [0, h + 0.05, 0]));       // roof deck
    parts.push(P(box(w + 0.4, 0.5, 0.22), wall, [0, h + 0.25, d / 2 + 0.08]));  // parapets
    parts.push(P(box(w + 0.4, 0.5, 0.22), wall, [0, h + 0.25, -d / 2 - 0.08]));
    parts.push(P(box(0.22, 0.5, d + 0.4), wall, [w / 2 + 0.08, h + 0.25, 0]));
    parts.push(P(box(0.22, 0.5, d + 0.4), wall, [-w / 2 - 0.08, h + 0.25, 0]));
    parts.push(P(box(3, 1.4, 2.4), wall, [3.4, h + 0.7, -2.4]));                // stair bulkhead
    parts.push(P(domeS(1.7), roof, [3.4, h + 1.4, -2.4], { s: [1, 0.6, 1] }));  // rounded bulkhead cap
    for (const fy of [3.55, 6.45]) {                                            // balconies, floors 2-3
      parts.push(P(box(5, 0.18, 1.3), 'conc', [0, fy, d / 2 + 0.6]));
      parts.push(P(cyl(0.05, 0.05, 5, 5, true), 'trim', [0, fy + 0.95, d / 2 + 1.2], { rz: Math.PI / 2 })); // rail
      for (const bx of [-2.2, 0, 2.2])
        parts.push(P(cyl(0.05, 0.05, 0.95, 5, true), 'trim', [bx, fy + 0.48, d / 2 + 1.2]));
    }
    // entrance: door + trimmed street window + rounded canopy + slab
    parts.push(P(box(1.34, 2.5, 0.12), 'trim', [-2.5, 1.25, d / 2 + 0.02]));
    parts.push(P(box(1.05, 2.3, 0.18), 'door', [-2.5, 1.15, d / 2 + 0.07]));
    win(parts, 2.5, 1.7, d / 2, 0);
    win(parts, 0, 1.7, d / 2, 0);
    parts.push(P(cyl(0.55, 0.55, 2.6, 6, true), roof, [-2.5, 2.7, d / 2 + 0.45], { rz: Math.PI / 2 })); // canopy
    parts.push(P(box(3, 0.16, 1.7), 'conc', [-2.5, 0.08, d / 2 + 0.85]));
    // upper windows: glass-only fronts + sides + rear accents
    for (const fy of [4.6, 7.5]) {
      winSide(parts, -3.5, fy, d / 2, 0);
      winSide(parts, 3.5, fy, d / 2, 0);
      winSide(parts, w / 2, fy - 0.2, 0, Math.PI / 2);
      winSide(parts, -w / 2, fy - 0.2, 0, -Math.PI / 2);
    }
    winSide(parts, 0, 4.6, -d / 2, Math.PI);
    winSide(parts, 0, 7.5, -d / 2, Math.PI);
    driveway(parts, w, d);
    return { w, d, h, parts };
  }
  // Corner-shop house for Southside corners — storefront with a rounded awning +
  // round sign board (original shapes only, no text/logos).
  function archCornerShop(wall, roof) {
    const w = 9, d = 7.5, h = 3.2, parts = [];
    parts.push(P(box(w, h, d), wall, [0, h / 2, 0]));
    parts.push(P(box(w + 0.6, 0.22, d + 0.6), 'trim', [0, h, 0]));
    parts.push(P(dome(4.2), roof, [0, h + 0.05, 0], { s: [1, 0.5, 1] })); // shallow dome
    // storefront: big glass window + door on the street face
    parts.push(P(box(3.6, 2, 0.14), 'trim', [-0.6, 1.35, d / 2 + 0.03]));
    parts.push(P(box(3.3, 1.8, 0.18), 'glass', [-0.6, 1.3, d / 2 + 0.08]));
    parts.push(P(box(1.34, 2.5, 0.12), 'trim', [w / 2 - 1.2, 1.25, d / 2 + 0.02]));
    parts.push(P(box(1.05, 2.3, 0.18), 'door', [w / 2 - 1.2, 1.15, d / 2 + 0.07]));
    // rounded awning: half-cylinder vault over the storefront (v3: 8-seg)
    parts.push(P(cyl(0.9, 0.9, 4.6, 6, true, Math.PI, Math.PI), roof, [-0.6, 2.6, d / 2 + 0.55], { rz: Math.PI / 2 }));
    // round sign board on a post (shape only, no text)
    parts.push(P(cyl(0.07, 0.07, 1.6, 5), 'trim', [-0.6, 3.6, d / 2 + 0.3]));
    parts.push(P(cyl(0.85, 0.85, 0.14, 6), 'sign', [-0.6, 4.5, d / 2 + 0.3], { rx: Math.PI / 2 }));
    winSide(parts, w / 2, 1.7, -d * 0.15, Math.PI / 2); // v4 diet: one side window
    parts.push(P(box(4.6, 0.14, 1.6), 'conc', [-0.6, 0.07, d / 2 + 0.8])); // shopfront slab
    return { w, d, h, parts };
  }

  const WALLS = ['wall0', 'wall1', 'wall2', 'wall3'];
  const ROOFS = ['roof0', 'roof1', 'roof2'];
  const ARCHS = {
    hillcrest: [archVinewood, archVinewood, archVinewood, archHillVillaGarage, archVilla, archCottageDome],
    villa:     [archVinewood, archHillVillaGarage, archVilla, archGable2, archSpanish, archCottageDome],
    mixed:     [archBungalowHip, archBungalowBarrel, archCottageDome, archSpanish, archGable2],
    south:     [archBungalowHip, archBungalowBarrel, archCottageDome],
  };
  const ARCHS_LEAN = [archBungalowHip, archBungalowHip, archCottageDome, archBungalowBarrel]; // v6 growth-phase infill stock (cheapest first)
  function pickArch(zone, isCorner, lean) {
    if (isCorner && zone === 'south') { // corner-shop house for Southside corners (70%)
      if (rng() < 0.7) {
        const a = archCornerShop(WALLS[Math.floor(rng() * WALLS.length) % WALLS.length],
                                 ROOFS[Math.floor(rng() * ROOFS.length) % ROOFS.length]);
        a.kind = 'cornershop';
        return a;
      }
    }
    let list = ARCHS[zone] || ARCHS.mixed;
    if (lean) list = lean === 2 ? [archVinewood, archVinewood, archCottageDome] : ARCHS_LEAN; // all zones: growth is budget-bound
    const f = list[Math.floor(rng() * list.length) % list.length];
    const wall = WALLS[Math.floor(rng() * WALLS.length) % WALLS.length];
    const roof = ROOFS[Math.floor(rng() * ROOFS.length) % ROOFS.length];
    const a = f(wall, roof);
    a.kind = f.name.replace('arch', '').toLowerCase();
    return a;
  }

  // ---- street walking (all math in WORLD coords; roadPaths arrive in LAYOUT) ----
  function walker(ptsLayout) {
    const segs = []; let total = 0;
    for (let i = 0; i < ptsLayout.length - 1; i++) {
      const ax = lw(ptsLayout[i][0]), az = lz(ptsLayout[i][1]);
      const bx = lw(ptsLayout[i + 1][0]), bz = lz(ptsLayout[i + 1][1]);
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1e-6) continue;
      segs.push({ ax, az, ux: (bx - ax) / len, uz: (bz - az) / len, len, start: total });
      total += len;
    }
    return {
      total,
      at(s) {
        let g = segs[segs.length - 1];
        for (const sg of segs) { if (s <= sg.start + sg.len) { g = sg; break; } }
        const d = Math.min(Math.max(s - g.start, 0), g.len);
        return { x: g.ax + g.ux * d, z: g.az + g.uz * d, ux: g.ux, uz: g.uz };
      },
    };
  }

  function zoneAt(cx, cz, roadClass) {
    if (roadClass === 'hillcrest') return 'hillcrest';    // winding climb: hillside villas
    if (cz > lz(442)) return 'south';                     // Southside bungalows (incl. v7c courts)
    if (cx > lw(445)) return 'villa';                     // Palm Court hillside
    return 'mixed';
  }

  const inRect = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  const overlap = (a, b, m) => a.minX - m < b.maxX && a.maxX + m > b.minX && a.minZ - m < b.maxZ && a.maxZ + m > b.minZ;

  const placed = [];      // world AABBs of placed houses (for house-house spacing)
  const placements = [];  // records returned for debugging/save tooling
  let apartments = 0;     // v5: apartment-block counter (cap 12)
  const MAX_HOUSES = 270; // FPS dial: single integer cap, applied during placement
                          // (coordinator tunes for the M02s bench; v1b 150, v2/v3 200, v4/v5 218)

  // A house is valid only if its whole footprint is off-road (4 corners + 4 edge
  // midpoints through map.isRoadAt), on land (not water/pier/park), slope across
  // the footprint <= 0.5 m (map.groundAt at the corners), clear of existing lots
  // (4 m), other placed houses (2 m), and every taxi stop (6 m to the footprint).
  function validFootprint(cx, cz, w, d, yaw) {
    const hw = w / 2, hd = d / 2, co = Math.cos(yaw), si = Math.sin(yaw);
    const local = [[hw, hd], [-hw, hd], [hw, -hd], [-hw, -hd], [hw, 0], [-hw, 0], [0, hd], [0, -hd]];
    let gMin = Infinity, gMax = -Infinity;
    for (let i = 0; i < local.length; i++) {
      const lx0 = local[i][0], lz0 = local[i][1];
      const x = cx + lx0 * co + lz0 * si;
      const z = cz - lx0 * si + lz0 * co;
      if (map.isRoadAt(x, z)) return null;
      if (x < WATER_X + 1) return null;                    // water / beach strip
      if (inRect(PIER_W, x, z) || inRect(PARK_W, x, z)) return null;
      if (i < 4) { const g = map.groundAt(x, z); if (g < gMin) gMin = g; if (g > gMax) gMax = g; }
    }
    if (gMax - gMin > 0.5) return null;                    // too steep for a pad
    // v7c rule: keep 6 m clear of every taxi stop (stop-to-footprint distance)
    for (const s of TAXI) {
      const dx = s.x - cx, dz = s.z - cz;
      const lx0 = dx * co - dz * si, lz0 = dx * si + dz * co; // stop in the house's local frame
      const qx = Math.max(0, Math.abs(lx0) - hw), qz = Math.max(0, Math.abs(lz0) - hd);
      if (qx * qx + qz * qz < 36) return null;
    }
    const ex = hw * Math.abs(co) + hd * Math.abs(si);
    const ez = hw * Math.abs(si) + hd * Math.abs(co);
    const bb = { minX: cx - ex, maxX: cx + ex, minZ: cz - ez, maxZ: cz + ez };
    if (bb.minX < -298 || bb.maxX > 298 || bb.minZ < -298 || bb.maxZ > 298) return null;
    for (const l of LOTS_W) if (overlap(bb, l, 4)) return null;  // existing buildings keep their space  // existing buildings keep their space
    for (const h of placed) if (overlap(bb, h, 2)) return null;  // 2 m gap between new houses // 2 m gap between new houses
    if (map.isBlocked) { // v10: coastal median hedges + props/vehicles addBlock footprints
      for (const [lx0, lz0] of local) {
        const x = cx + lx0 * co + lz0 * si, z = cz - lx0 * si + lz0 * co;
        if (map.isBlocked(x, z, 0.2)) return null;
      }
      if (map.isBlocked(cx, cz, 0.2)) return null;
    }
    return bb;
  }

  // ---- merged-geometry baking (rotations: part Rz,Rx,Ry then house Ry + translate) ----
  const buckets = new Map(); // matKey -> { pos: [], norm: [], col: [] }
  let bakeTris = 0;          // triangles baked for the current house (per-placement stats)
  // DISTRICT_TINT (gfxfps round 17): per-district hue shift baked into the vertex colours
  // at build time - the tint multiplies into the same cr/cg/cb the per-house jitter uses,
  // so it rides the HOUSE-MERGE single-material fold for free. +0 tris, +0 draws, +0
  // per-frame cost. Thresholds mirror zoneAt (layout C=300). false = v30 colours exactly.
  const DISTRICT_TINT = false;
  const DT_HUE = { hills: [1.06, 1.00, 0.94], south: [1.04, 0.97, 0.96], beach: [1.02, 1.02, 0.92], grid: [0.97, 1.00, 1.05] };
  function districtTint(x, z) {
    if (!DISTRICT_TINT) return null;
    if (x > 145) return DT_HUE.hills;   // Hillcrest + Palm Court hillside (zoneAt: x > lw(445) / winding climb)
    if (z > 142) return DT_HUE.south;   // Southside bungalows (zoneAt: z > lz(442))
    if (x < -120) return DT_HUE.beach;  // Beachfront Row / promenade homes
    return DT_HUE.grid;                 // central grid
  }

  function bakePart(part, hx, hy, hz, yaw, jit) {
    const src = part.g.index ? part.g.toNonIndexed() : part.g;
    const pos = src.attributes.position.array, nrm = src.attributes.normal.array;
    let b = buckets.get(part.m);
    if (!b) { b = { pos: [], norm: [], col: [] }; buckets.set(part.m, b); }
    const tint = jit[JIT[part.m]] || null; // per-house RGB multiplier for this material
    const dt = districtTint(hx, hz); // DISTRICT_TINT (null when flag off)
    const cr = (tint ? tint[0] : 1) * (dt ? dt[0] : 1), cg = (tint ? tint[1] : 1) * (dt ? dt[1] : 1), cb = (tint ? tint[2] : 1) * (dt ? dt[2] : 1);
    const [sx, sy, sz] = part.s;
    const c1 = Math.cos(part.rz), s1 = Math.sin(part.rz);
    const c2 = Math.cos(part.rx), s2 = Math.sin(part.rx);
    const c3 = Math.cos(part.ry), s3 = Math.sin(part.ry);
    const cH = Math.cos(yaw), sH = Math.sin(yaw);
    const [tx, ty, tz] = part.t;
    bakeTris += pos.length / 9;
    for (let i = 0; i < pos.length; i += 3) {
      // scale
      let x = pos[i] * sx, y = pos[i + 1] * sy, z = pos[i + 2] * sz;
      let nx = nrm[i] / sx, ny = nrm[i + 1] / sy, nz = nrm[i + 2] / sz;
      // part Rz
      let x2 = x * c1 - y * s1, y2 = x * s1 + y * c1, z2 = z;
      let nx2 = nx * c1 - ny * s1, ny2 = nx * s1 + ny * c1, nz2 = nz;
      // part Rx
      let y3 = y2 * c2 - z2 * s2, z3 = y2 * s2 + z2 * c2, x3 = x2;
      let ny3 = ny2 * c2 - nz2 * s2, nz3 = ny2 * s2 + nz2 * c2, nx3 = nx2;
      // part Ry
      let x4 = x3 * c3 + z3 * s3, z4 = -x3 * s3 + z3 * c3, y4 = y3;
      let nx4 = nx3 * c3 + nz3 * s3, nz4 = -nx3 * s3 + nz3 * c3, ny4 = ny3;
      // part translate
      x4 += tx; y4 += ty; z4 += tz;
      // house Ry + translate
      const X = hx + x4 * cH + z4 * sH;
      const Z = hz - x4 * sH + z4 * cH;
      b.pos.push(X, hy + y4, Z);
      const NX = nx4 * cH + nz4 * sH;
      const NZ = -nx4 * sH + nz4 * cH;
      const nl = Math.hypot(NX, ny4, NZ) || 1;
      b.norm.push(NX / nl, ny4 / nl, NZ / nl);
      b.col.push(cr, cg, cb);
    }
    if (src !== part.g) src.dispose();
    part.g.dispose();
  }

  // ---- placement pass ----
  let count = 0;
  let hillCount = 0;       // v7: hillcrest-zone total (bench + road-side)
  let benchCount = 0;      // v7: bench homes are EXTRA, not part of the v5-phase count
  const HILL_CAP = 14;     // v7 brief: Hillcrest ends at 10-14 homes
  // Priority order: signature streets first (Hillcrest winding climb, Southside lanes,
  // Palm Court street), then the general grid, so the MAX_HOUSES cap trims generic
  // blocks rather than starving the streets the brief names.
  const roads = map.roadPaths.map((r) => ({ r, cls: classify(r) }))
    .filter((e) => e.cls !== 'skip')
    .sort((a, b) => rank(a) - rank(b));
  function rank(e) {
    if (e.cls === 'hillcrest') return 0;
    let len = 0;
    for (let k = 0; k < e.r.pts.length - 1; k++)
      len += Math.hypot(e.r.pts[k + 1][0] - e.r.pts[k][0], e.r.pts[k + 1][1] - e.r.pts[k][1]);
    if (len < 120) return 1;                              // short connectors fill before the grid
    const ys = e.r.pts.map((p) => p[1]);
    if (Math.min(...ys) >= 440) return 1;                 // Southside lanes
    if (e.r.pts.length === 2 && e.r.pts[0][0] === 440 && e.r.pts[1][0] === 440) return 2; // Palm Court street
    return 3;
  }
  // v6: two phases. Phase A walks the roads in v5's priority order with rich
  // stock up to the v5 count, so every road that was well-covered in v5 keeps
  // exactly its v5 placements. Phase B re-walks the roads that still have kerb
  // left (the cap-starved sparse roads) round-robin with lean stock, plus a
  // fine-step hillcrest re-walk to catch the small flat pockets the coarse pass
  // stepped over. Fully rule-driven off roadPaths: any new street (v11 infill)
  // joins phase A automatically.
  const PHASE_A = 218; // the v5 build count: phase A reproduces it 1:1
    // v8 (round 8): the w=6 cls 'grid' infill streets (C1/C2 Southside pair, E1
    // secondary) walk in their own late pass AFTER phase B, so the v5-v7 rng
    // stream - and every existing placement - holds exactly.
    const isInfill = (e) => e.r.w <= 6 && e.r.cls === 'grid';
    const queues = roads.filter((e) => !isInfill(e)).map((e) => ({ road: e.r, cls: e.cls, walk: walker(e.r.pts), s: 9, fine: false }));
    const infillQueues = roads.filter(isInfill).map((e) => ({ road: e.r, cls: e.cls, walk: walker(e.r.pts), s: 9, fine: true, infill: true }));

  // ---- v7: deliberate development of the map.hillBenches pads ----
  // Runs before the road walks so the rows take the pads by design; the
  // hillcrest walk then fills only the road-side gaps (2 m spacing keeps the
  // two apart) up to the zone cap.
  const benchStats = [];
  function nearestRoadPt(x, z) { // nearest point on any non-alley roadPath (world)
    let best = null;
    for (const r of map.roadPaths) {
      if (r.cls === 'alley') continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const ax = lw(r.pts[i][0]), az = lz(r.pts[i][1]), bx = lw(r.pts[i + 1][0]), bz = lz(r.pts[i + 1][1]);
        const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
        let t = L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0;
        t = Math.min(1, Math.max(0, t));
        const px = ax + t * dx, pz = az + t * dz;
        const d = Math.hypot(px - x, pz - z);
        if (!best || d < best.d) best = { x: px, z: pz, d };
      }
    }
    return best;
  }
  function placeBenchHome(cx, cz, arch, yaw, benchName) {
    const bb = validFootprint(cx, cz, arch.w, arch.d, yaw);
    if (!bb) return null;
    const jit = houseJitter(count);            // seeded by the lot index, same as road-side
    if (jit.variant === 0) {                   // trim garnish stays (it is ON the house)
      arch.parts.push(P(box(1.6, 0.28, 0.36), 'wall3', [arch.w * 0.2, 0.86, arch.d / 2 + 0.2]));
    } else {
      arch.parts.push(P(cyl(0.35, 0.35, 0.1, 6), 'trim', [arch.w * 0.2, arch.h - 0.5, arch.d / 2 + 0.05], { rx: Math.PI / 2 }));
    }
    const gy = map.groundAt(cx, cz);
    bakeTris = 0;
    for (const part of arch.parts) bakePart(part, cx, gy - 0.3, cz, yaw, jit);
    map.addBlock(bb.minX, bb.minZ, bb.maxX, bb.maxZ);
    placed.push(bb);
    placements.push({ x: cx, z: cz, y: gy, yaw, w: arch.w, d: arch.d, archetype: arch.kind, zone: 'hillcrest',
      corner: false, variant: jit.variant, yard: null, tree: false, rearFence: null,
      tris: Math.round(bakeTris), bench: benchName }); // pads are 10 m deep: no yard/tree off the terrace
    count++;
    hillCount++;
    benchCount++;
    return bb;
  }
  (function developBenches() {
    for (const b of (map.hillBenches || [])) {
      const cx = lw(b.layout[0]), cz = lz(b.layout[1]);
      const alongX = b.w >= b.h;               // pack the row along the pad's long axis
      const lo = (alongX ? cx - b.w / 2 : cz - b.h / 2), hi = (alongX ? cx + b.w / 2 : cz + b.h / 2);
      const short = b.name.match(/Bench ([A-F])/) ? b.name.match(/Bench ([A-F])/)[1] : b.name;
      const target = short === 'A' ? 4 : short === 'B' ? 2 : 1; // brief: A 3-4, B 1-2, E/F 1-2
      const st = { name: b.name, placed: 0, displaced: [] };
      let cursor = lo + 1, probes = 0;         // 1 m inset from the pad edge
      while (st.placed < target && probes < 40 && count < MAX_HOUSES && hillCount < HILL_CAP) {
        probes++;
        const h0 = houseHash(count + 1);       // own deterministic stream: the road walks keep their rng
        const pool = [archBungalowHip, archBungalowBarrel, archCottageDome]; // Grove-Street stock
        const f0 = pool[h0 % 3];
        const arch = f0(WALLS[(h0 >>> 3) % WALLS.length], ROOFS[(h0 >>> 5) % ROOFS.length]);
        arch.kind = f0.name.replace('arch', '').toLowerCase();
        const half = Math.max(arch.w, arch.d) / 2;
        if (cursor + half * 2 > hi - 1) break;
        const hx = alongX ? cursor + half : cx, hz = alongX ? cz : cursor + half;
        const rp = nearestRoadPt(hx, hz);
        let nx = hx - rp.x, nz = hz - rp.z;
        const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        const yaw = Math.atan2(-nx, -nz);      // local +Z (front) faces the street
        if (map.isBlocked && map.isBlocked(hx, hz, half)) // an existing addBlock footprint (prop/vehicle/lot)
          st.displaced.push([+hx.toFixed(1), +hz.toFixed(1)]); // reported, never built over
        if (placeBenchHome(hx, hz, arch, yaw, b.name)) { st.placed++; cursor += half * 2 + 2.5; }
        else cursor += 3;                      // tight/blocked spot: probe 3 m down the row
      }
      benchStats.push(st);
    }
  })();
  function step(q) {
      const road = q.road, cls = q.cls, walk = q.walk;
      const baseOff = road.w / 2 + 4.5;            // front wall 8-8.5 m off centerline (w 7..8)
      const p = walk.at(q.s);
      let widest = 9;
      for (const side of [-1, 1]) {
        if (count >= MAX_HOUSES) break;
        const nx = -p.uz * side, nz = p.ux * side; // unit normal, world coords
        const zone = zoneAt(p.x + nx * 12, p.z + nz * 12, cls);
        const isCorner = zone === 'south' && nearJunction(p.x + C, p.z + C, 20); // layout coords
        const lean = count - benchCount >= PHASE_A ? (cls === 'hillcrest' ? 2 : 1) : 0; // v6: growth phase = lean stock
        let arch = pickArch(zone, isCorner, lean);
        // v5: downtown-fringe lots (within 40 m of the tower core rect) can become
        // apartment blocks instead of suburban stock; cap 12.
        const lxC = p.x + nx * (baseOff + arch.d / 2) + C, lyC = p.z + nz * (baseOff + arch.d / 2) + C;
        if (zone === 'mixed' && !lean && apartments < 12 && rng() < 0.5 && // growth phase: no new 470-tri blocks // growth phase: no new 470-tri blocks
            lxC > 160 && lxC < 400 && lyC > 160 && lyC < 400) {
          arch = archApartment(WALLS[Math.floor(rng() * WALLS.length) % WALLS.length],
                               ROOFS[Math.floor(rng() * ROOFS.length) % ROOFS.length]);
          arch.kind = 'apartment';
        }
        const frontOff = baseOff + (rng() - 0.4) * 2; // v4: seeded setback jitter (varied yards)
        let coff = frontOff + arch.d / 2;
        let cx = p.x + nx * coff, cz = p.z + nz * coff;
        const yaw = Math.atan2(-nx, -nz);          // local +Z (front) faces the street
        let bb = validFootprint(cx, cz, arch.w, arch.d, yaw);
        if (!bb && arch.kind !== 'cottagedome') {  // steep/tight spot: retry the smallest footprint
          arch = archCottageDome(WALLS[Math.floor(rng() * WALLS.length) % WALLS.length],
                                 ROOFS[Math.floor(rng() * ROOFS.length) % ROOFS.length]);
          arch.kind = 'cottagedome';
          coff = baseOff + arch.d / 2;
          cx = p.x + nx * coff; cz = p.z + nz * coff;
          bb = validFootprint(cx, cz, arch.w, arch.d, yaw);
        }
        if (!bb) continue;
        if (q.infill && nearJunction(cx + C, cz + C, Math.max(arch.w, arch.d) / 2 + 7, JUNCTIONS_INFILL)) continue; // v8: infill homes keep clear of the junction arms + their markings (roads round 13 works the E1 junctions)
        if (zone === 'hillcrest' && hillCount >= HILL_CAP) continue; // v7: cap AFTER the rng-consuming checks so other roads keep the v6 stream
        if (arch.kind === 'apartment') apartments++;
        // v5: rear fence when the footprint backs onto an alley (<= 4 m to its centerline)
        let rearFence = null;
        if (ALLEYS.length && alleyDist(bb) <= 4) {
          // alley-facing edge: pick the footprint edge nearest the alley in local space
          rearFence = 'rear';
          fenceZ(arch.parts, 0, -arch.d / 2 - 0.4); // alleys run behind lots in v9's downtown
        }
        const jit = houseJitter(count);            // seeded by placement index (the lot index)
        const h4 = houseHash(count);
        let yard = null, hasTree = false;
        if (arch.kind !== 'cornershop') {          // v4: front-yard detail (shops stay commercial)
          // yard features are verified against the live road net too (switchback
          // hairpins put another road leg within a hedge's reach)
          const yardPt = (lx0, lz0) => !map.isRoadAt(cx + lx0 * co + lz0 * si, cz - lx0 * si + lz0 * co);
          const co = Math.cos(yaw), si = Math.sin(yaw);
          if (((h4 >>> 11) & 255) < (lean ? 0 : 159) && // growth-phase infill goes bare (58k budget)
              yardPt(-arch.w * 0.15 - 1.4, arch.d / 2 + 2.8) && yardPt(-arch.w * 0.15 + 1.4, arch.d / 2 + 2.8)) {
            yard = ((h4 >>> 10) & 1) ? 'fence' : 'hedge'; // ~62% of houses: hedge or fence
            if (yard === 'hedge') hedge(arch.parts, -arch.w * 0.15, arch.d / 2 + 2.8);
            else fence(arch.parts, -arch.w * 0.15, arch.d / 2 + 2.8);
          }
          hasTree = !lean && ((h4 >>> 20) & 127) < 34 && yardPt(-arch.w * 0.28, arch.d / 2 + 1.9); // ~1 in 3.8 lots
          if (hasTree) tree(arch.parts, -arch.w * 0.28, arch.d / 2 + 1.9);
        }
        if (lean) { /* growth-phase infill skips the trim garnish (budget) */ }
        else if (jit.variant === 0) {              // trim variant A: flower box under the front window
          arch.parts.push(P(box(1.6, 0.28, 0.36), 'wall3', [arch.w * 0.2, 0.86, arch.d / 2 + 0.2]));
        } else {                                   // trim variant B: round attic vent on the street face
          arch.parts.push(P(cyl(0.35, 0.35, 0.1, 6), 'trim', [arch.w * 0.2, arch.h - 0.5, arch.d / 2 + 0.05], { rx: Math.PI / 2 }));
        }
        const gy = map.groundAt(cx, cz);
        bakeTris = 0;
        for (const part of arch.parts) bakePart(part, cx, gy - 0.3, cz, yaw, jit);
        map.addBlock(bb.minX, bb.minZ, bb.maxX, bb.maxZ);
        placed.push(bb);
        placements.push({ x: cx, z: cz, y: gy, yaw, w: arch.w, d: arch.d, archetype: arch.kind, zone, corner: isCorner, infill: q.infill || undefined,
          variant: jit.variant, yard, tree: hasTree, rearFence, tris: Math.round(bakeTris) });
        count++;
        if (zone === 'hillcrest') hillCount++; // v7
        if (arch.w > widest) widest = arch.w;
      }
      // phase A: v5's exact advance. Phase B (fine): jump past a placed house,
      // else probe forward 4 m so kerbs/lots/junctions don't skip whole pockets.
      q.s += !q.fine ? widest + 2.5 : (widest > 9 ? widest + 2.5 : 4);
  }
  for (const q of queues)                          // phase A: v5 sequential walk (bench homes don't count toward it)
    while (q.s < q.walk.total - 9 && count - benchCount < PHASE_A) step(q);
  for (const q of queues) if (q.cls === 'hillcrest') { q.s = 9; } // fine re-walk from the top
  for (const q of queues) if (q.s < q.walk.total - 9) q.fine = true;
  let more = true;                                 // phase B: round-robin growth
  while (more && count < MAX_HOUSES) {
    more = false;
    for (const q of queues) {
      if (count >= MAX_HOUSES) break;
      if (q.s >= q.walk.total - 9) continue;
      more = true;
      step(q);
    }
  }
  // ---- v8 (round 8): hillcrest displacement re-siting sweep ----
  // Map v17's hillsideSign band clipped the two road-side homes at the foot of
  // the climb. The band stays untouched; this pass sweeps the hillcrest road at
  // 2 m with a deterministic offset ladder (own houseHash stream - the road
  // walks keep their rng) until the hillcrest count returns to its pre-band
  // level (11: 7 bench + 4 road-side), bounded by HILL_CAP. Same clearance
  // rules as every other home (validFootprint, 2 m spacing, terrain, blocks).
  (function resiteHillcrest() {
    const HILL_TARGET = 11;
    const hr = roads.find((e) => e.cls === 'hillcrest');
    if (!hr) return;
    const walk = walker(hr.r.pts);
    const OFFS = [7.6, 8.8, 8.2, 9.4, 7.0, 10.0];
    let probes = 0;
    for (let s = 9; s < walk.total - 9 && hillCount < Math.min(HILL_TARGET, HILL_CAP) && count < MAX_HOUSES && probes < 500; s += 1) {
      probes++;
      const p = walk.at(s);
      for (const side of [-1, 1]) {
        if (hillCount >= Math.min(HILL_TARGET, HILL_CAP) || count >= MAX_HOUSES) break;
        const h0 = houseHash(count + 1 + probes * 131 + (side + 1) * 57); // own deterministic stream
        const nx = -p.uz * side, nz = p.ux * side;
        const yaw = Math.atan2(-nx, -nz);
        const pool = [archVinewood, archVinewood, archCottageDome]; // growth-phase hill stock (lean)
        let bb = null, arch = null, cx = 0, cz = 0;
        outer: for (const f0 of [pool[(h0 >>> 3) % 3], archCottageDome]) { // stock pick, then the smallest footprint
          for (let k = 0; k < OFFS.length; k++) {
            const off = OFFS[(h0 + k) % OFFS.length];
            const a0 = f0(WALLS[(h0 >>> 5) % WALLS.length], ROOFS[(h0 >>> 8) % ROOFS.length]);
            a0.kind = f0.name.replace('arch', '').toLowerCase();
            const tx = p.x + nx * (off + a0.d / 2), tz = p.z + nz * (off + a0.d / 2);
            const fb = validFootprint(tx, tz, a0.w, a0.d, yaw);
            if (fb) { bb = fb; arch = a0; cx = tx; cz = tz; break outer; }
          }
        }
        if (!bb) continue;
        const jit = houseJitter(count);
        const gy = map.groundAt(cx, cz);
        bakeTris = 0;
        for (const part of arch.parts) bakePart(part, cx, gy - 0.3, cz, yaw, jit);
        map.addBlock(bb.minX, bb.minZ, bb.maxX, bb.maxZ);
        placed.push(bb);
        placements.push({ x: cx, z: cz, y: gy, yaw, w: arch.w, d: arch.d, archetype: arch.kind, zone: 'hillcrest',
          corner: false, variant: jit.variant, yard: null, tree: false, rearFence: null,
          tris: Math.round(bakeTris), resite: true }); // v8: displaced-home re-site
        count++;
        hillCount++;
      }
    }
  })();
  // v8 (round 8): C1/C2/E1 late infill pass - lean stock via the PHASE_A gate,
  // same clearance rules as every other home (validFootprint, spacing, terrain),
  // plus the junction guard above. Runs last so nothing upstream shifts.
  let moreInfill = true;
  while (moreInfill && count < MAX_HOUSES) {
    moreInfill = false;
    for (const q of infillQueues) {
      if (count >= MAX_HOUSES) break;
      if (q.s >= q.walk.total - 9) continue;
      moreInfill = true;
      step(q);
    }
  }

  // ---- coverage audit (derived from roadPaths; for the coordinator's report) ----
  function distToRoad(road, x, z) { // x,z world
    let best = Infinity;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const ax = lw(road.pts[i][0]), az = lz(road.pts[i][1]);
      const bx = lw(road.pts[i + 1][0]), bz = lz(road.pts[i + 1][1]);
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      let t = L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx - x, pz = az + t * dz - z;
      const d2 = px * px + pz * pz;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }
  const coverage = map.roadPaths.map((r, i) => {
    const cls = classify(r);
    let len = 0;
    for (let k = 0; k < r.pts.length - 1; k++)
      len += Math.hypot(r.pts[k + 1][0] - r.pts[k][0], r.pts[k + 1][1] - r.pts[k][1]);
    const nearP = cls === 'skip' ? []
      : placements.filter((p) => distToRoad(r, p.x, p.z) < 16);
    const frontLen = nearP.reduce((a, p) => a + p.w + 2.5, 0); // v6: occupied frontage incl. side gap
    return { road: i, class: cls, length: Math.round(len), houses: nearP.length,
      frontage: cls === 'skip' ? 0 : Math.min(1, +(frontLen / len).toFixed(3)) };
  });

  // HOUSES-CHUNK + FOG-CULL (gfxfps round 7): one town-spanning merged mesh per material
  // meant a map-sized bounding sphere, so frustum culling never dropped a house triangle
  // and 21,094 of the 56,685 house tris sat beyond fog far (260 m), drawn as pure fog
  // colour (bench-measured at spawn). Now each material bucket bakes into 100 m
  // grid-cell chunks (frustum culls out-of-frame cells), and each chunk sits in a
  // THREE.LOD whose far level is an empty Object3D at FOG_CULL_DIST + cell bounding
  // radius: beyond that distance every surface of the chunk is past fog saturation,
  // i.e. mathematically invisible. Buckets under MIN_TRIS stay whole (their culling
  // gain is not worth the extra draws). Same vertices/materials: zero visual change.
  let triTotal = 0;
  const group = new THREE.Group(); group.name = 'houses';
  const HOUSE_CHUNK_CELL = 100;
  const HOUSE_CHUNK_MIN_TRIS = 2500;
  const FOG_CULL_DIST = 260; // scene fog far (main.js scene.fog = 70..260); past this a surface is 100% fog colour
  const bakeWhole = (b, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.norm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    const mesh = new THREE.Mesh(g, mat);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  };
  const bakeChunked = (b, mat, mk) => {
    if (b.pos.length / 9 < HOUSE_CHUNK_MIN_TRIS) { bakeWhole(b, mat); return; }
    const cells = new Map();
    for (let t = 0; t < b.pos.length; t += 9) { // non-indexed triangle soup: 9 floats per tri
      const cx = (b.pos[t] + b.pos[t + 3] + b.pos[t + 6]) / 3;
      const cz = (b.pos[t + 2] + b.pos[t + 5] + b.pos[t + 8]) / 3;
      const key = Math.floor(cx / HOUSE_CHUNK_CELL) + ':' + Math.floor(cz / HOUSE_CHUNK_CELL);
      let c = cells.get(key);
      if (!c) { c = { pos: [], norm: [], col: [] }; cells.set(key, c); }
      for (let k = 0; k < 9; k++) { c.pos.push(b.pos[t + k]); c.norm.push(b.norm[t + k]); c.col.push(b.col[t + k]); }
    }
    for (const [key, c] of cells) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(c.norm, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
      g.computeBoundingSphere();
      const ctr = g.boundingSphere.center, r = g.boundingSphere.radius;
      const mesh = new THREE.Mesh(g, mat);
      mesh.name = 'house:' + mk + ':' + key;
      mesh.position.set(-ctr.x, -ctr.y, -ctr.z); // cancel: geometry is world-baked
      mesh.updateMatrix();
      mesh.matrixAutoUpdate = false;
      const lod = new THREE.LOD();
      lod.position.set(ctr.x, ctr.y, ctr.z);
      lod.addLevel(mesh, 0);
      lod.addLevel(new THREE.Object3D(), FOG_CULL_DIST + r); // nearest surface past fog far -> invisible
      group.add(lod);
    }
  };
  // HOUSE-MERGE (gfxfps round 9): all 14 bucket materials are the same
  // MeshLambertMaterial({ vertexColors: true }) differing only in the colour multiplier,
  // and every bucket's vertex colours already carry the per-house tint jitter. Folding
  // each bucket's palette colour into its vertex colours lets the whole district share
  // ONE white material, so each 100 m chunk cell bakes as ONE mesh instead of one mesh
  // per material per cell. Same vertices, same final lit colours: zero visual change.
  const houseMerged = { pos: [], norm: [], col: [] };
  for (const [mk, b] of buckets) {
    const mc = MATS[mk].color; // palette multiplier folded into the vertex colours
    for (let i = 0; i < b.pos.length; i++) houseMerged.pos.push(b.pos[i]);
    for (let i = 0; i < b.norm.length; i++) houseMerged.norm.push(b.norm[i]);
    for (let i = 0; i < b.col.length; i += 3)
      houseMerged.col.push(b.col[i] * mc.r, b.col[i + 1] * mc.g, b.col[i + 2] * mc.b);
    triTotal += b.pos.length / 9;
  }
  bakeChunked(houseMerged, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), 'all');

  scene.add(group);

  const trisByArch = {};
  for (const p of placements) trisByArch[p.archetype] = (trisByArch[p.archetype] || 0) + p.tris;

  return {
    update(dt) {}, // static district: nothing per-frame (dt unused)
    count,
    placements,
    // one shared vertex-colour material post-HOUSE-MERGE (was 14 buckets); each chunk cell costs 1 draw
    stats: { drawCalls: 1, triangles: Math.round(triTotal), trisByArch, apartments, coverage, benches: benchStats },

  };
}
// main.js imports createHouses; buildHouses kept as an alias for the brief's naming.
export { createHouses as buildHouses };
