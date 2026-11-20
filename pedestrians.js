// Pedestrians - spawn along sidewalks, wander; near crossings they wait then cross on green man.
//   Round 6 (peds v6, 2026-11-20, map v10): beach idlers - 2-3 wanderers instead live at the
//   beach umbrella clusters (towel spots arrive via the existing idleSpots wiring): sit, lie
//   on the towel, stand facing the sea, short amble on the sand; never touch roads/crosswalks.
//   Round 13 (peds v13, 2026-11-20, map v23 + houses v8 + vehicles v010): count 22 -> 23; the
//   new walker is pinned to the north-end promenade by the v19 bollard run (map.coastal.northEnd),
//   seaward sidewalk preferred, sliced + trimmed with the round-12 anchoring so pacing stays
//   clear of the bollard blocked rect. No pool/far-shell changes.
//   Round 12 (peds v12, 2026-11-20, map v21 + houses v8 + vehicles v012): leg-2 pinned
//   walker anchoring - houses v8's re-sited home fronts leg 2's west run, and near the
//   west hairpin both sidewalks can be invalid (home footprint / converging leg), so the
//   old side-flip could anchor the walker inside the home (~30% of runs, in-house for
//   whole phases). Now both sidewalks are scanned with the anchor's own validity check,
//   the side with the longest clear contiguous run wins, and the slice is trimmed to
//   that run so pacing stays clear. No count/pool/far-shell changes.
//   Round 10 (peds v11, 2026-11-20, map v17): count 20 -> 22; the 2 new walkers are pinned to
//   the remaining Hillcrest switchback sidewalks (leg 2 east via the Bench F run, leg 3 via the
//   Bench B run) so all three legs stay dressed; same stayOnRoad pin + sub-road slice as Bench A.
//   Far-shell patch (PED-1/PED-2) kept intact.
//   Round 9b (peds v10, 2026-11-20, map v16): one pinned stroller on the Bench A frontage
//   (houses v7 bench homes) - reuses the stayOnRoad pin on a synthetic sub-road sliced from
//   the switchback leg alongside the pad (map.hillBenches + nearest road arc only). Cafe
//   conversion gains the stroller fallback: pins + pier + beach can exhaust the wander pool.
//   Far-shell patch (PED-1/PED-2) kept intact.
//   Round 9 (peds v9, 2026-11-20, map v14): viewpoint tourists - 1-2 wanderers instead live
//   at the Hillcrest turnout viewpoint (v11 pad, just east of the wheel-stop curb): stand
//   facing the view (east), phone-up photo pose, small shuffle; never touch roads. The pinned
//   Bench A frontage stroller waits for the houses drop. Far-shell patch (PED-1/PED-2) intact.
//   Round 8 (peds v8, 2026-11-20, map v13): court walkers - 1 wanderer per Southside
//   cul-de-sac court (v7c loop roads) pinned to its lane (stayOnRoad: no junction transfers,
//   no far-respawn relocation), so the courts stay dressed; E1 walks via the normal grid
//   road set. Far-shell patch (PED-1/PED-2) kept intact.
//   Round 7 (peds v7, 2026-11-20, map v12): cafe lingerers - 1-2 wanderers instead live at the
//   sidewalk cafe sets (tables arrive via idleSpots as benches): sit at the table, stand a
//   while, occasionally stroll to another set along the storefronts; never touch roads.
//   The coordinator's far-shell patch (PED-1 shell bake / PED-2 mid-band toggle) is kept intact.
//   Round 5: pier strollers. v4: railings. v3: alleys. v2/v1: core.
function buildPedShell(THREE, root, material) {
  root.updateMatrixWorld(true); // root at origin: matrixWorld is root-relative
  const geos = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    geos.push(g);
  });
  const attrNames = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n]));
  const merged = new THREE.BufferGeometry();
  for (const name of attrNames) {
    const size = geos[0].attributes[name].itemSize;
    let total = 0;
    for (const g of geos) total += g.attributes[name].count;
    const out = new Float32Array(total * size);
    let off = 0;
    for (const g of geos) { out.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(out, size));
  }
  const shell = new THREE.Mesh(merged, material);
  shell.name = 'ped:shell';
  shell.visible = false;
  return shell;
}

// js/pedestrians.js — original low-poly rounded pedestrians (~1.8 m) for Coastal City.
// Soft street ambience: they walk the road edges (half-width + ~2 m offset), turn at
// junctions or reverse at road ends, hurry across open road at junction crossings,
// and never register collision (brief: vehicles/players may pass through).
//
// Coordinator notes:
//   main.js wiring (exact one-line calls):
//     const pedestrians = createPedestrians({ THREE, scene, map, getPlayerPos });
//     // per frame: pedestrians.update(dt);
//   getPlayerPos() -> {x, z} in WORLD coords; called at most once per frame.
//   The module additionally derives 2 pier-waiting spots itself from the westmost road
//   (roadPaths-derived; pier rect mirrored from map.js v7b, same as props.js).
//   Peds near a spot sometimes idle (static sit/stand pose, 6-15 s) instead of walking.
//   No map.addBlock calls, no collision, no shadows, no lights.
//   Round 2 also fixes junction turns to use segment-intersection transfer points
//   (grid junctions are not polyline vertices; the v1 vertex check rarely fired).
//   Round 3 (pedestrians v3, 2026-11-20): wander loops - about half the peds are
//   'strollers': each picks its 2 nearest same-road idle spots, stands 20-60 s at one,
//   walks the sidewalk lane to the other (crosswalk hurry + corner walking, no teleports),
//   and repeats. No pathfinding: pairs stay on one road's lane. spot()/pointAt() take an
//   optional out-param; the per-frame update path performs no object allocations.
//
//   Round 5 (pedestrians v5, 2026-11-20): pier strollers. 2-3 of the 20 peds live on
//   the pier deck: they stroll its length down and back, pause to gaze at the sea at
//   the far end, and are clamped to the pier rect the whole time (never water/sand).
//   Service alleys (map v9 cls:'alley') are excluded from the walking road set.
//   Round 4 (pedestrians v4, 2026-11-20): crosswalk life + variety.
//   Wander-role peds near a marked junction (map v8 junctions/markings) occasionally
//   cross: walk to the crosswalk kerb, pause 2-6 s, hurry straight over the zebra
//   (<=8 s), resume on the far sidewalk. Never mid-block, never stopping in the car
//   lane. Per-ped height jitter (0.95-1.05) + per-instance material-clone tint at
//   build time (zero per-frame cost), so identical twins stop appearing side by side.
//
// Shared palette (one shared MeshLambertMaterial({vertexColors:true}); colors baked):
//   skin  #c68b59 #8d5a3a #e0ac82 #6b4a2f
//   shirt #c94f4f #4f7dc9 #d8c94f #5aa66b #d8d4c8 #7a5ac8
//   pants #26344c #4a4a52 #6e5a3a #2e5d4c
//   hair  #2c241c #4a3826 #6e6e6e   shoe #152335
//
// Perf: 5 meshes per pedestrian (body, 2 leg groups, 2 arm groups); limb geometries
// are cached per color combo and shared. Full swing animation only within 60 m of the
// player; 60-140 m glide (no limb animation); past 140 m hidden and respawned near the
// player on a random road. Walk speed 1.2-1.8 m/s. No skinned meshes, no AnimationMixer.
export function createPedestrians({ THREE, scene, map, getPlayerPos, idleSpots = [] }) {
  const SKIN = ['#c68b59', '#8d5a3a', '#e0ac82', '#6b4a2f'];
  const SHIRT = ['#c94f4f', '#4f7dc9', '#d8c94f', '#5aa66b', '#d8d4c8', '#7a5ac8'];
  const PANTS = ['#26344c', '#4a4a52', '#6e5a3a', '#2e5d4c'];
  const HAIR = ['#2c241c', '#4a3826', '#6e6e6e'];
  const SHOE = '#152335';
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const PED_COUNT = 23; // coordinator dial (parent Nov 20): 28->20->22 (round 10: +2 Hillcrest switchback walkers) -> 23 (round 13: +1 north-end promenade walker)
  const ANIM_NEAR = 60, HIDE_FAR = 140, SIDEWALK = 2.0;

  // ---- world-space road polylines (layout - 300) with cumulative lengths ----
  const roads = (map.roadPaths || []).map((r) => {
    const pts = r.pts.map((p) => [p[0] - 300, p[1] - 300]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    return { pts, cum, w: r.w, cls: r.cls, len: cum[cum.length - 1] };
  }).filter((r) => r.len > 30 && r.cls !== 'alley'); // v5: stay off v9 service alleys

  // ---- round 4: marked crosswalks from map v8 junction data (layout -> world) ----
  // One record per non-highway junction arm; centre matches map.markings.crosswalks.
  const CROSS = [];
  for (const nd of (map.junctions || [])) {
    if (nd.hwy) continue; // map v8 paints no pedestrian markings on highway junctions
    for (const a of nd.arms) {
      CROSS.push({
        cx: nd.x - 300 + a[0] * (nd.maxHalf + 3.2),
        cz: nd.y - 300 + a[1] * (nd.maxHalf + 3.2),
        nx: a[1], nz: -a[0], // crossing axis: straight over the zebra, kerb to kerb
        ux: a[0], uz: a[1], w: a[2], // arm direction + road width
      });
    }
  }

  // ---- junction transfers: where another road crosses, peds may turn onto it ----
  function segIntT(a, b, c, d) {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
    const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    if (t < -0.02 || t > 1.02 || u < -0.02 || u > 1.02) return null;
    return { t: Math.min(1, Math.max(0, t)), u: Math.min(1, Math.max(0, u)) };
  }
  for (const r of roads) r.transfers = [];
  const arcAt = (road, seg, t) => road.cum[seg] + t * (road.cum[seg + 1] - road.cum[seg]);
  for (let i = 0; i < roads.length; i++) {
    for (let j = i + 1; j < roads.length; j++) {
      const A = roads[i], B = roads[j];
      for (let a = 0; a < A.pts.length - 1; a++) {
        for (let b = 0; b < B.pts.length - 1; b++) {
          const hit = segIntT(A.pts[a], A.pts[a + 1], B.pts[b], B.pts[b + 1]);
          if (!hit) continue;
          const sA = arcAt(A, a, hit.t), sB = arcAt(B, b, hit.u);
          if (A.transfers.every((q) => Math.abs(q.s - sA) > 6)) {
            A.transfers.push({ s: sA, other: B, sOther: sB });
            B.transfers.push({ s: sB, other: A, sOther: sA });
          }
        }
      }
    }
  }

  const isRoad = map.isRoadAt || (() => false);
  const isBlk = map.isBlocked || map.blockedAt || (() => false);
  const ground = (x, z) => {
    const y = (map.groundAt || map.heightAt || (() => 0))(x, z);
    return Number.isFinite(y) ? y : 0;
  };
  const inBounds = (x, z) => x > -295 && x < 295 && z > -295 && z < 295;

  // point + unit direction at arc distance s along a road; pass `out` to avoid allocation
  function pointAt(road, s, out) {
    let i = 1;
    while (i < road.cum.length - 1 && road.cum[i] < s) i++;
    const t = (s - road.cum[i - 1]) / Math.max(1e-6, road.cum[i] - road.cum[i - 1]);
    const a = road.pts[i - 1], b = road.pts[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    out = out || {};
    out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t;
    out.ux = (b[0] - a[0]) / L; out.uz = (b[1] - a[1]) / L; out.seg = i - 1;
    return out;
  }
  const PT = {}; // scratch for pointAt inside spot
  // sidewalk position for a ped state; pass `out` to avoid allocation
  function spot(road, s, side, out) {
    const p = pointAt(road, s, PT);
    const off = road.w / 2 + SIDEWALK;
    out = out || {};
    out.x = p.x + -p.uz * side * off; out.z = p.z + p.ux * side * off;
    out.ux = p.ux; out.uz = p.uz; out.seg = p.seg;
    return out;
  }
  const Q1 = {}, Q2 = {}, Q3 = {}; // per-frame scratch (no allocations in update)

  // ---- round 2: idle spots. Passed-in spots (benches/shelters) + self-derived pier waits. ----
  const PIER = { minX: -280, maxX: -178, minZ: -8, maxZ: 8 }; // mirror of map.js v7b PIER
  const SPOTS = [];
  for (const s of idleSpots || []) {
    if (s && Number.isFinite(s.x) && Number.isFinite(s.z)) {
      SPOTS.push({ x: s.x, z: s.z, pose: s.pose === 'sit' ? 'sit' : 'stand' });
    }
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const BEACH_BAND = { minX: -216, maxX: -178 }; // round 6: dry sand up to BEACH_X (map v9/v10); |z|>12 keeps the pier zone out
  const TOWELS = SPOTS.filter((sp) => sp.x > BEACH_BAND.minX && sp.x < BEACH_BAND.maxX && Math.abs(sp.z) > 12); // towel spots recorded as benches by props
  const CAFE_BAND = { minX: -148.5, maxX: -141 }; // round 7: cafe sets hug the shop face x=-140 (map v12)
  const CAFE_SETS = SPOTS.filter((sp) => sp.x > CAFE_BAND.minX && sp.x < CAFE_BAND.maxX); // cafe tables recorded as benches by props
  { // pier waiting: westmost road, point nearest the pier, a spot on the water side
    let wRoad = null, wMin = Infinity;
    for (const r of roads) for (const p of r.pts) if (p[0] < wMin) { wMin = p[0]; wRoad = r; }
    if (wRoad) {
      const pcx = (PIER.minX + PIER.maxX) / 2, pcz = (PIER.minZ + PIER.maxZ) / 2;
      let bestS = 0, bestD = Infinity;
      for (let s = 0; s <= wRoad.len; s += 2) {
        const q = pointAt(wRoad, s);
        const d = Math.hypot(q.x - pcx, q.z - pcz);
        if (d < bestD) { bestD = d; bestS = s; }
      }
      for (const ds of [-3.5, 3.5]) {
        const s = Math.min(wRoad.len - 2, Math.max(2, bestS + ds));
        const q = pointAt(wRoad, s);
        for (const side of [1, -1]) {
          const off = wRoad.w / 2 + SIDEWALK;
          const x = q.x + -q.uz * side * off, z = q.z + q.ux * side * off;
          if (x < q.x && inBounds(x, z) && !isRoad(x, z) && !isBlk(x, z, 0.35)) {
            SPOTS.push({ x, z, pose: 'stand' }); // watching the bay by the pier
            break;
          }
        }
      }
    }
  }

  // ---- geometry helpers ----
  const M = new THREE.Matrix4(), NM = new THREE.Matrix3(), V = new THREE.Vector3(), E = new THREE.Euler();
  function Acc() { return { pos: [], nor: [], col: [] }; }
  function addTo(acc, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    E.set(rx, ry, rz); M.makeRotationFromEuler(E);
    M.scale(new THREE.Vector3(sx, sy, sz)); M.setPosition(x, y, z);
    NM.setFromMatrix4(M);
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    const c = new THREE.Color(color);
    for (let i = 0; i < p.length; i += 3) {
      V.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(M); acc.pos.push(V.x, V.y, V.z);
      V.set(n[i], n[i + 1], n[i + 2]).applyMatrix3(NM).normalize(); acc.nor.push(V.x, V.y, V.z);
      acc.col.push(c.r, c.g, c.b);
    }
    if (g !== geo) g.dispose();
    geo.dispose();
  }
  function toGeo(acc) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(acc.col, 3));
    return g;
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });

  // ---- cached part geometries (local space; feet at y=0; limbs pivot at top) ----
  const bodyCache = new Map(), legCache = new Map(), armCache = new Map();
  function bodyGeo(skin, shirt, pants, hair) {
    const key = [skin, shirt, pants, hair].join('|');
    if (!bodyCache.has(key)) {
      const a = Acc();
      addTo(a, new THREE.CapsuleGeometry(0.17, 0.4, 2, 6), shirt, 0, 1.12, 0);       // torso
      addTo(a, new THREE.SphereGeometry(1, 7, 5), pants, 0, 0.88, 0, 0, 0, 0, 0.19, 0.14, 0.15); // pelvis
      addTo(a, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 6), skin, 0, 1.42, 0);      // neck
      addTo(a, new THREE.SphereGeometry(0.14, 7, 6), skin, 0, 1.6, 0);                 // head
      addTo(a, new THREE.SphereGeometry(0.145, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.63, 0.005, 0, 0, 0, 1, 0.75, 1); // hair cap
      addTo(a, new THREE.SphereGeometry(0.032, 5, 4), skin, 0, 1.58, -0.13);           // nose
      bodyCache.set(key, toGeo(a));
    }
    return bodyCache.get(key);
  }
  function legGeo(pants) {
    if (!legCache.has(pants)) {
      const a = Acc();
      addTo(a, new THREE.CapsuleGeometry(0.09, 0.28, 2, 6), pants, 0, -0.2, 0);        // thigh
      addTo(a, new THREE.CapsuleGeometry(0.075, 0.26, 2, 6), pants, 0, -0.58, 0);      // shin
      addTo(a, new THREE.SphereGeometry(1, 6, 5), SHOE, 0, -0.8, -0.05, 0, 0, 0, 0.1, 0.07, 0.17); // shoe
      legCache.set(pants, toGeo(a));
    }
    return legCache.get(pants);
  }
  function armGeo(skin, shirt) {
    const key = skin + '|' + shirt;
    if (!armCache.has(key)) {
      const a = Acc();
      addTo(a, new THREE.CapsuleGeometry(0.07, 0.22, 2, 6), shirt, 0, -0.15, 0);       // sleeve
      addTo(a, new THREE.CapsuleGeometry(0.06, 0.22, 2, 6), skin, 0, -0.44, 0);        // forearm
      addTo(a, new THREE.SphereGeometry(0.07, 5, 4), skin, 0, -0.6, 0);                // hand
      armCache.set(key, toGeo(a));
    }
    return armCache.get(key);
  }

  // ---- build a pedestrian ----
  function makePed() {
    const skin = pick(SKIN), shirt = pick(SHIRT), pants = pick(PANTS), hair = pick(HAIR);
    const root = new THREE.Group();
    const hJit = 0.95 + Math.random() * 0.1; // v4: per-ped height jitter
    root.scale.set(hJit, hJit, hJit);
    // v4: per-instance material clone with a gentle tint - palette combos stay, but
    // two peds with the same combo no longer read as identical twins. Build-time only.
    const pmat = mat.clone();
    pmat.color.setHSL(Math.random(), 0.28, 0.88 + Math.random() * 0.12);
    const body = new THREE.Group(); // bobs with the walk cycle
    root.add(body);
    body.add(new THREE.Mesh(bodyGeo(skin, shirt, pants, hair), pmat));
    const legL = new THREE.Group(); legL.position.set(-0.11, 0.86, 0);
    const legR = new THREE.Group(); legR.position.set(0.11, 0.86, 0);
    legL.add(new THREE.Mesh(legGeo(pants), pmat));
    legR.add(new THREE.Mesh(legGeo(pants), pmat));
    const armL = new THREE.Group(); armL.position.set(-0.26, 1.36, 0);
    const armR = new THREE.Group(); armR.position.set(0.26, 1.36, 0);
    armL.add(new THREE.Mesh(armGeo(skin, shirt), pmat));
    armR.add(new THREE.Mesh(armGeo(skin, shirt), pmat));
    body.add(legL, legR, armL, armR);
    root.scale.set(1, 1, 1); const shell = buildPedShell(THREE, root, pmat); root.scale.set(hJit, hJit, hJit); // PED-1: far-band shell, root-relative bake
    root.add(shell);
    scene.add(root);
    return {
      root, body, legL, legR, armL, armR, shell,
      road: null, s: 0, dir: 1, side: 1, speed: 1.2 + Math.random() * 0.6,
      phase: Math.random() * 6.283, lastSeg: -1, respawnCd: 0, turnCd: 0, x: 0, z: 0,
      mode: 'walk', idleT: 0, idleCd: 4 + Math.random() * 25, pose: 'stand',
      role: 'wander', a: null, b: null, target: null, ctx: 0, ctz: 0,
      crossCd: 5 + Math.random() * 20, cw: null, cwNear: null, cwT: 0, // v4 crosswalk state
      cwfx: 0, cwfz: 0, cwtx: 0, cwtz: 0,
    };
  }

  function validSpot(x, z) {
    return inBounds(x, z) && !isRoad(x, z) && !isBlk(x, z, 0.35);
  }
  // place a ped on a random road/s/side; near ({x,z}, minD, maxD) when given
  function spawn(p, near, minD, maxD) {
    for (let t = 0; t < 10; t++) {
      const road = roads[Math.floor(Math.random() * roads.length)];
      if (!road) return false;
      const s = 6 + Math.random() * Math.max(1, road.len - 12);
      const side = Math.random() < 0.5 ? 1 : -1;
      const q = spot(road, s, side);
      if (!validSpot(q.x, q.z)) continue;
      if (near) {
        const d = Math.hypot(q.x - near.x, q.z - near.z);
        if (d < minD || d > maxD) continue;
      }
      p.road = road; p.s = s; p.side = side;
      p.dir = Math.random() < 0.5 ? 1 : -1;
      p.x = q.x; p.z = q.z; p.lastSeg = q.seg;
      return true;
    }
    return false;
  }

  // ---- round 3: map idle spots onto their nearest road lane (init-time only) ----
  const MAPPED = [];
  {
    const q = {}, lq = {};
    for (const sp of SPOTS) {
      if (sp.x > -216 && sp.x < -176) continue; // round 6: towel spots are for beach idlers, not strollers
      if (sp.x > -148.5 && sp.x < -141) continue; // round 7: cafe tables are for cafe lingerers, not strollers
      let best = null;
      for (const r of roads) {
        for (let s = 2; s < r.len - 2; s += 2) {
          pointAt(r, s, q);
          if (Math.abs(q.x - sp.x) > 12 || Math.abs(q.z - sp.z) > 12) continue;
          for (const side of [1, -1]) {
            spot(r, s, side, lq);
            const d = Math.hypot(lq.x - sp.x, lq.z - sp.z);
            if (d < 2.5 && (!best || d < best.d)) best = { d, road: r, s, side };
          }
        }
      }
      if (best) { sp.road = best.road; sp.s = best.s; sp.side = best.side; MAPPED.push(sp); }
    }
  }
  // stroller role: walk between the 2 nearest same-road idle spots, stand 20-60 s at each
  function assignStroll(p) {
    let a = null;
    for (const sp of MAPPED) {
      const d = Math.hypot(sp.x - p.x, sp.z - p.z);
      if (d < 70 && (!a || d < a.d)) a = { d, sp };
    }
    if (!a) return false;
    let b = null;
    for (const sp of MAPPED) {
      if (sp === a.sp || sp.road !== a.sp.road) continue;
      const along = Math.abs(sp.s - a.sp.s);
      if (along < 8 || along > 140) continue;
      if (!b || along < b.along) b = { along, sp };
    }
    if (!b) return false;
    p.role = 'stroll'; p.a = a.sp; p.b = b.sp; p.target = null;
    p.road = a.sp.road; p.s = a.sp.s; p.side = a.sp.side;
    const q = spot(p.road, p.s, p.side, Q1);
    p.x = q.x; p.z = q.z;
    p.root.position.set(p.x, ground(p.x, p.z), p.z); // stand mode never re-syncs position
    p.mode = 'stand'; p.idleT = 20 + Math.random() * 40; p.pose = 'stand';
    p.root.rotation.y = -Math.atan2(a.sp.x - p.x, -(a.sp.z - p.z));
    return true;
  }

  const peds = [];
  const N_PEDS = Math.min(PED_COUNT, Math.max(1, roads.length ? PED_COUNT : 0));
  const order = [];
  for (let i = 0; i < N_PEDS; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  const wantStroll = Math.floor(N_PEDS / 2);
  let strollers = 0;
  for (let i = 0; i < N_PEDS; i++) {
    const p = makePed();
    spawn(p, null, 0, 0);
    if (p.road) { // place on the lane now: never render a ped at the world origin
      const q0 = spot(p.road, p.s, p.side, Q1);
      p.x = q0.x; p.z = q0.z;
    }
    peds.push(p);
  }
  for (const i of order) { // about half become strollers (spot availability permitting)
    if (strollers >= wantStroll) break;
    const q = spot(peds[i].road, peds[i].s, peds[i].side, Q1);
    peds[i].x = q.x; peds[i].z = q.z;
    if (assignStroll(peds[i])) strollers++;
  }
  let pierWant = 2 + (Math.random() < 0.5 ? 1 : 0); // round 5: 2-3 pier strollers
  for (const i of order) {
    if (pierWant <= 0) break;
    if (peds[i].role !== 'wander') continue;
    assignPier(peds[i]); pierWant--;
  }
  { // round 6: 2-3 wanderers become beach idlers at the umbrella clusters (towel spots)
    const towels = TOWELS.slice().sort((a, b) => Math.abs(a.z) - Math.abs(b.z)); // clusters nearest the pier root first
    let want = Math.min(towels.length, 2 + (Math.random() < 0.5 ? 1 : 0));
    for (const i of order) {
      if (want <= 0 || !towels.length) break;
      if (peds[i].role !== 'wander') continue;
      assignBeach(peds[i], towels.shift()); want--;
    }
  }
  { // round 8: one walker per cul-de-sac court (open loop roads: both ends near the same parent street)
    const courts = roads.filter((r) => {
      if (r.pts.length < 8 || r.len < 50) return false;
      const a = r.pts[0], b = r.pts[r.pts.length - 1];
      return Math.hypot(a[0] - b[0], a[1] - b[1]) < 35;
    });
    const e1 = roads.find((r) => r.pts.length === 2 && Math.abs(r.pts[0][0] - 123) < 2 && Math.abs(r.pts[1][0] - 123) < 2 && r.len > 100); // map v13 E1 (layout x=423)
    const targets = e1 ? [...courts, e1] : courts;
    for (const court of targets) {
      let done = false;
      for (const i of order) {
        if (done) break;
        if (peds[i].role !== 'wander' || peds[i].stayOnRoad) continue;
        const p = peds[i];
        p.road = court; p.stayOnRoad = true;
        p.s = 6 + Math.random() * Math.max(1, court.len - 12);
        p.dir = Math.random() < 0.5 ? 1 : -1;
        p.side = 1;
        let q = spot(court, p.s, 1, Q1);
        if (!validSpot(q.x, q.z)) { p.side = -1; q = spot(court, p.s, -1, Q1); }
        p.x = q.x; p.z = q.z; p.lastSeg = q.seg; p.mode = 'walk';
        p.root.position.set(p.x, ground(p.x, p.z), p.z);
        done = true;
      }
    }
  }
  { // round 9 phase 2 + round 10: pinned strollers on the Hillcrest switchback sidewalks - one per
    // bench pad frontage (Bench A: leg 1 row; Bench F: leg 2 east; Bench B: leg 3), each pinned to a
    // synthetic sub-road sliced from the contiguous pts run alongside its pad (houses v7 bench homes).
    for (const padName of ['Bench A', 'Bench F', 'Bench B']) {
      const benchA = (map.hillBenches || []).find((b) => (b.name || '').indexOf(padName) === 0);
      if (!benchA) continue;
      const bx = benchA.layout[0] - 300, bz = benchA.layout[1] - 300;
      let best = null, bd = 1e9;
      for (const r of roads) {
        for (let i = 0; i < r.pts.length - 1; i++) {
          const ax = r.pts[i][0], az = r.pts[i][1], cx = r.pts[i + 1][0], cz = r.pts[i + 1][1];
          const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz;
          let t = L2 ? ((bx - ax) * dx + (bz - az) * dz) / L2 : 0; t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(ax + t * dx - bx, az + t * dz - bz);
          if (d < bd) { bd = d; best = r; }
        }
      }
      if (best) { // slice a synthetic sub-road out of the switchback spine
        let pts = null;
        if (padName === 'Bench F') { // round 10: leg 2 = the run between the spine's two hairpins
          // (the pad-radius slice breaks at the hairpin tip and comes out under the 25 m minimum)
          const rev = [];
          for (let i = 1; i < best.pts.length - 1; i++) {
            const ux = best.pts[i][0] - best.pts[i - 1][0], uz = best.pts[i][1] - best.pts[i - 1][1];
            const vx = best.pts[i + 1][0] - best.pts[i][0], vz = best.pts[i + 1][1] - best.pts[i][1];
            const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
            if (lu && lv) rev.push([i, (ux * vx + uz * vz) / (lu * lv)]);
          }
          const sharp = rev.filter(([, dot]) => dot < 0.35).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([i]) => i).sort((a, b) => a - b);
          if (sharp.length === 2 && sharp[1] - sharp[0] >= 1) pts = best.pts.slice(sharp[0], sharp[1] + 1);
        } else { // Bench A / Bench B: contiguous pts run alongside the pad
          const R = Math.max(benchA.w, benchA.h) / 2 + 14;
          let bi = 0, bs = 1e9;
          for (let i = 0; i < best.pts.length; i++) {
            const d = Math.hypot(best.pts[i][0] - bx, best.pts[i][1] - bz);
            if (d < bs) { bs = d; bi = i; }
          }
          let lo = bi, hi = bi;
          while (lo > 0 && Math.hypot(best.pts[lo - 1][0] - bx, best.pts[lo - 1][1] - bz) < R) lo--;
          while (hi < best.pts.length - 1 && Math.hypot(best.pts[hi + 1][0] - bx, best.pts[hi + 1][1] - bz) < R) hi++;
          pts = best.pts.slice(lo, hi + 1);
        }
        if (pts.length >= 2) {
          const cum = [0];
          for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
          let front = { pts, cum, w: best.w, cls: best.cls, len: cum[cum.length - 1] };
          if (front.len > 25) {
            let done = false;
            for (const i of order) {
              if (done) break;
              if (peds[i].stayOnRoad) continue;
              if (peds[i].role !== 'wander' && peds[i].role !== 'stroll') continue; // wander pool first, a stroller if it is empty
              if (peds[i].role === 'stroll' && peds.some((q) => q.role === 'wander' && !q.stayOnRoad)) continue;
              const p = peds[i];
              p.role = 'wander'; // a converted stroller becomes a plain pinned walker (shipped flip at the stroll fallback)
              p.road = front; p.stayOnRoad = true;
              // round 12: houses v8's re-sited road-side home fronts leg 2's west run; near the west
              // hairpin the two legs converge, so BOTH sidewalks can be invalid there (one on the
              // home's footprint, one on the other leg's roadway). A bare side flip lands the anchor
              // inside the home (measured flake: the pinned walker in-house for whole phases on ~30%
              // of runs). Instead scan both sidewalks along the slice with the same validity check
              // the anchor uses (houses-first: footprints are live blocks), take the side with the
              // longest clear contiguous run, and trim the slice to that run so pacing stays inside.
              let pinSide = 1;
              if (padName === 'Bench F' && front.len > 30) {
                const N = 20;
                const clearArcs = { 1: [], '-1': [] }; // per side: clear sample arcs
                for (let k = 0; k <= N; k++) {
                  const sK = 2 + (front.len - 4) * (k / N);
                  for (const sd of [1, -1]) {
                    const qq = spot(front, sK, sd, {});
                    if (validSpot(qq.x, qq.z)) clearArcs[sd].push(sK);
                  }
                }
                let bestSd = 0, bestS0 = 0, bestS1 = 0;
                for (const sd of [1, -1]) { // longest contiguous clear run on this side
                  const ok = clearArcs[sd];
                  let cs = -1, cl = 0;
                  for (let k = 0; k <= N; k++) {
                    const sK = 2 + (front.len - 4) * (k / N);
                    const clear = ok.indexOf(sK) !== -1;
                    if (clear && cs < 0) { cs = sK; cl = 0; }
                    if (clear) cl = k === N ? cl : cl; // length tracked via cs->sK span below
                    if (!clear || k === N) {
                      if (cs >= 0) {
                        const ce = clear && k === N ? sK : 2 + (front.len - 4) * ((k - 1) / N);
                        if (ce - cs > bestS1 - bestS0) { bestSd = sd; bestS0 = cs; bestS1 = ce; }
                        cs = -1;
                      }
                    }
                  }
                }
                if (bestSd !== 0 && bestS1 - bestS0 >= 25 && bestS1 - bestS0 < front.len - 4) {
                  let i0 = 0, i1 = front.pts.length - 1; // pts indices bracketing [bestS0, bestS1]
                  while (i0 < front.cum.length - 2 && front.cum[i0 + 1] < bestS0) i0++;
                  while (i1 > i0 + 1 && front.cum[i1 - 1] > bestS1) i1--;
                  const sub = front.pts.slice(i0, i1 + 1);
                  const cum2 = [0];
                  for (let i = 1; i < sub.length; i++) cum2.push(cum2[i - 1] + Math.hypot(sub[i][0] - sub[i - 1][0], sub[i][1] - sub[i - 1][1]));
                  if (cum2[cum2.length - 1] > 25) {
                    front = { pts: sub, cum: cum2, w: front.w, cls: front.cls, len: cum2[cum2.length - 1] };
                    pinSide = bestSd;
                  }
                }
              }
              p.s = 4 + Math.random() * Math.max(1, front.len - 8);
              p.dir = Math.random() < 0.5 ? 1 : -1;
              p.side = pinSide;
              let q = spot(front, p.s, pinSide, Q1);
              if (!validSpot(q.x, q.z)) { p.side = -pinSide; q = spot(front, p.s, -pinSide, Q1); }
              p.x = q.x; p.z = q.z; p.lastSeg = q.seg; p.mode = 'walk';
              p.root.position.set(p.x, ground(p.x, p.z), p.z);
              done = true;
            }
          }
        }
      }
    }
  }
  { // round 13: one pinned walker on the north-end promenade by the v19 bollard run
    // (map.coastal.northEnd), mirroring the foot traffic the south end already gets. Same
    // stayOnRoad pin + sub-road slice as the switchback pins, with the round-12 anchoring:
    // scan both sidewalks with the anchor's own validity check (the bollard blocked rect is a
    // live map block, so the trim keeps pacing clear of it), take the longest clear run, and
    // prefer the seaward (west, smaller-x) sidewalk when both sides qualify.
    const ne = map.coastal && map.coastal.northEnd;
    if (ne && ne.layout) {
      const nx = ne.layout[0] - 300, nz = ne.layout[1] - 300;
      let best = null, bd = 1e9;
      for (const r of roads) {
        for (let i = 0; i < r.pts.length - 1; i++) {
          const ax = r.pts[i][0], az = r.pts[i][1], cx = r.pts[i + 1][0], cz = r.pts[i + 1][1];
          const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz;
          let t = L2 ? ((nx - ax) * dx + (nz - az) * dz) / L2 : 0; t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(ax + t * dx - nx, az + t * dz - nz);
          if (d < bd) { bd = d; best = r; }
        }
      }
      if (best) {
        const R = 34; // contiguous pts run alongside the bollard run (22 leaves a 27.8 m slice; the junction apron eats ~9 m of sidewalk, so the clear run needs the longer window)
        let bi = 0, bs = 1e9;
        for (let i = 0; i < best.pts.length; i++) {
          const d = Math.hypot(best.pts[i][0] - nx, best.pts[i][1] - nz);
          if (d < bs) { bs = d; bi = i; }
        }
        let lo = bi, hi = bi;
        while (lo > 0 && Math.hypot(best.pts[lo - 1][0] - nx, best.pts[lo - 1][1] - nz) < R) lo--;
        while (hi < best.pts.length - 1 && Math.hypot(best.pts[hi + 1][0] - nx, best.pts[hi + 1][1] - nz) < R) hi++;
        const pts = best.pts.slice(lo, hi + 1);
        if (pts.length >= 2) {
          const cum = [0];
          for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
          let front = { pts, cum, w: best.w, cls: best.cls, len: cum[cum.length - 1] };
          let pinSide = 0;
          if (front.len > 30) {
            const N = 20;
            const clearArcs = { 1: [], '-1': [] };
            for (let k = 0; k <= N; k++) {
              const sK = 2 + (front.len - 4) * (k / N);
              for (const sd of [1, -1]) {
                const qq = spot(front, sK, sd, {});
                if (validSpot(qq.x, qq.z)) clearArcs[sd].push(sK);
              }
            }
            const runs = {};
            for (const sd of [1, -1]) {
              let cs = -1, b0 = 0, b1 = 0;
              for (let k = 0; k <= N; k++) {
                const sK = 2 + (front.len - 4) * (k / N);
                const clear = clearArcs[sd].indexOf(sK) !== -1;
                if (clear && cs < 0) cs = sK;
                if (!clear || k === N) {
                  if (cs >= 0) {
                    const ce = clear && k === N ? sK : 2 + (front.len - 4) * ((k - 1) / N);
                    if (ce - cs > b1 - b0) { b0 = cs; b1 = ce; }
                    cs = -1;
                  }
                }
              }
              runs[sd] = [b0, b1];
            }
            // min clear run 18 m here (vs 25 on the switchback): the promenade's clear sidewalk
            // beside the bollards measures ~23 m seaward / ~16 m landward.
            let pick = 0;
            if (runs[1][1] - runs[1][0] >= 18 && runs[-1][1] - runs[-1][0] >= 18) { // both qualify: seaward side
              const mx = (sd) => { const q = spot(front, (runs[sd][0] + runs[sd][1]) / 2, sd, {}); return q.x; };
              pick = mx(1) <= mx(-1) ? 1 : -1;
            } else if (runs[1][1] - runs[1][0] >= 18) pick = 1;
            else if (runs[-1][1] - runs[-1][0] >= 18) pick = -1;
            if (pick !== 0) { // trim by interpolated endpoints: the promenade pts are ~10 m apart,
              const [b0, b1] = runs[pick]; // whole-pt slicing would re-admit the invalid approach
              const pa = pointAt(front, b0 + 1, {}), pb = pointAt(front, b1 - 1, {});
              const sub = [[pa.x, pa.z]];
              for (let i = 0; i < front.pts.length; i++) if (front.cum[i] > b0 + 1 && front.cum[i] < b1 - 1) sub.push(front.pts[i]);
              sub.push([pb.x, pb.z]);
              const cum2 = [0];
              for (let i = 1; i < sub.length; i++) cum2.push(cum2[i - 1] + Math.hypot(sub[i][0] - sub[i - 1][0], sub[i][1] - sub[i - 1][1]));
              if (cum2[cum2.length - 1] > 18) {
                front = { pts: sub, cum: cum2, w: front.w, cls: front.cls, len: cum2[cum2.length - 1] };
                pinSide = pick;
              }
            }
          }
          if (pinSide !== 0 && front.len > 18) { // trimmed run clears the bollard rect by construction (18 m floor above)
            let done = false;
            for (const i of order) {
              if (done) break;
              if (peds[i].stayOnRoad) continue;
              if (peds[i].role !== 'wander' && peds[i].role !== 'stroll') continue; // wander pool first, a stroller if it is empty
              if (peds[i].role === 'stroll' && peds.some((q) => q.role === 'wander' && !q.stayOnRoad)) continue;
              const p = peds[i];
              p.role = 'wander'; // a converted stroller becomes a plain pinned walker (shipped flip at the stroll fallback)
              p.road = front; p.stayOnRoad = true;
              p.s = 4 + Math.random() * Math.max(1, front.len - 8);
              p.dir = Math.random() < 0.5 ? 1 : -1;
              p.side = pinSide;
              let q = spot(front, p.s, pinSide, Q1);
              if (!validSpot(q.x, q.z)) { p.side = -pinSide; q = spot(front, p.s, -pinSide, Q1); }
              p.x = q.x; p.z = q.z; p.lastSeg = q.seg; p.mode = 'walk';
              p.root.position.set(p.x, ground(p.x, p.z), p.z);
              done = true;
            }
          }
        }
      }
    }
  }
  { // round 7: 1-2 wanderers become cafe lingerers at the new sets
    let want = Math.min(CAFE_SETS.length, 1 + (Math.random() < 0.5 ? 1 : 0));
    for (const i of order) {
      if (want <= 0) break;
      if (peds[i].stayOnRoad) continue; // stayOnRoad: court/E1/frontage walkers keep their street
      if (peds[i].role !== 'wander' && peds[i].role !== 'stroll') continue; // wander pool first, a stroller if it is empty
      if (peds[i].role === 'stroll' && peds.some((q) => q.role === 'wander' && !q.stayOnRoad)) continue;
      assignCafe(peds[i], CAFE_SETS[Math.floor(Math.random() * CAFE_SETS.length)]); want--;
    }
  }
  { // round 9: 1-2 tourists at the Hillcrest viewpoint turnout (v11 pad, v14 terrain)
    if (map.turnout) {
      const sx = map.turnout.layout[0] - 300 + 8.3; // just east of the wheel-stop curb
      const sz = map.turnout.layout[1] - 300;
      let want = 1 + (Math.random() < 0.5 ? 1 : 0);
      for (const i of order) {
        if (want <= 0) break;
        if (peds[i].stayOnRoad) continue; // court/E1 walkers keep their street
        if (peds[i].role !== 'wander' && peds[i].role !== 'stroll') continue; // wander pool first, a stroller if it is empty
        if (peds[i].role === 'stroll' && peds.some((q) => q.role === 'wander' && !q.stayOnRoad)) continue;
        assignTourist(peds[i], sx, sz); want--;
      }
    }
  }

  // ---- round 5: pier strollers - live on the pier deck, walk its length, clamped ----
  function assignPier(p) {
    p.role = 'pier';
    p.road = null; // pier life is road-free; update() handles pier peds first
    p.x = PIER.minX + 6 + Math.random() * (PIER.maxX - PIER.minX - 12);
    p.z = (Math.random() < 0.5 ? -1 : 1) * (1.0 + Math.random() * 0.6); // off the centre line
    p.dir = Math.random() < 0.5 ? 1 : -1;
    p.mode = 'pierWalk';
    p.root.position.set(p.x, Math.max(ground(p.x, p.z), 0.4), p.z); // deck top y=0.4
  }
  function updatePier(p, dt, dPlayer) {
    if (p.mode === 'pierGaze') { // paused at the sea end, facing the water
      p.idleT -= dt;
      p.root.rotation.y = -Math.atan2(-1, 0);
      if (dPlayer < ANIM_NEAR) {
        p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
        p.armL.rotation.x = 0.14; p.armR.rotation.x = -0.14;
        p.body.position.y *= 0.8;
      }
      if (p.idleT <= 0) { p.mode = 'pierWalk'; p.dir = 1; } // back toward the shore
      return;
    }
    p.x += p.dir * p.speed * dt;
    if (p.z < PIER.minZ + 1.1) p.z = PIER.minZ + 1.1; // hard clamp: never off the deck
    else if (p.z > PIER.maxZ - 1.1) p.z = PIER.maxZ - 1.1;
    if (p.x >= PIER.maxX - 4) { p.x = PIER.maxX - 4; p.dir = -1; } // root end: turn seaward
    else if (p.x <= PIER.minX + 4) { // sea end: gaze, then head back
      p.x = PIER.minX + 4;
      p.mode = 'pierGaze'; p.idleT = 4 + Math.random() * 6;
    }
    p.root.position.set(p.x, Math.max(ground(p.x, p.z), 0.4), p.z);
    p.root.rotation.y = -Math.atan2(p.dir, 0);
    if (dPlayer < ANIM_NEAR) {
      p.phase += dt * p.speed * 3.6;
      const sw = Math.sin(p.phase);
      p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
      p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
      p.body.position.y = Math.abs(Math.sin(p.phase * 2)) * 0.045;
    }
  }

  // ---- round 6: beach idlers - live at the umbrella clusters (towel spots via idleSpots) ----
  function assignBeach(p, towel) {
    p.role = 'beach'; p.road = null; // beach life is road-free; update() handles beach peds first
    p.a = { x: towel.x, z: towel.z }; // towel anchor
    p.x = towel.x + (Math.random() - 0.5) * 0.6;
    p.z = towel.z + (Math.random() - 0.5) * 0.6;
    if (isRoad(p.x, p.z)) { p.x = towel.x; p.z = towel.z; } // spawn jitter must not land on the boardwalk arc
    p.mode = 'beachSit'; p.idleT = 8 + Math.random() * 12;
    p.root.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.8; // facing the sea (-x)
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
  }

  function beachPick(p) { // next idle mode after sit/lie
    const r = Math.random();
    if (r < 0.45) { p.mode = 'beachLie'; p.idleT = 15 + Math.random() * 25; }
    else if (r < 0.8) { p.mode = 'beachStand'; p.idleT = 5 + Math.random() * 7; p.root.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.6; } // face the sea (-x)
    else { // short amble on the sand near the towel
      p.mode = 'beachWalk';
      p.wx = clamp(p.a.x + (Math.random() - 0.5) * 4, BEACH_BAND.minX + 1, BEACH_BAND.maxX - 1);
      p.wz = p.a.z + (Math.random() - 0.5) * 5;
    }
  }

  function updateBeach(p, dt, dPlayer) {
    const lying = p.mode === 'beachLie';
    if (p.mode === 'beachWalk') {
      const dx = p.wx - p.x, dz = p.wz - p.z, d = Math.hypot(dx, dz);
      const step = p.speed * 0.8 * dt;
      if (d <= step + 0.05) { p.mode = 'beachSit'; p.idleT = 20 + Math.random() * 30; }
      else {
        const nx = p.x + dx / d * step, nz = p.z + dz / d * step;
        if (isRoad(nx, nz)) { p.mode = 'beachSit'; p.idleT = 15 + Math.random() * 20; } // boardwalk arc guard
        else { p.x = nx; p.z = nz; }
      }
      p.root.rotation.y = -Math.atan2(dx, -dz);
      if (dPlayer < ANIM_NEAR) {
        p.phase += dt * p.speed * 3.6;
        const sw = Math.sin(p.phase);
        p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
        p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
      }
      p.body.position.y += (Math.abs(Math.sin(p.phase * 2)) * 0.045 - p.body.position.y) * Math.min(1, dt * 8); // ease, no pop from lying
    } else {
      p.idleT -= dt;
      if (dPlayer < ANIM_NEAR && p.mode !== 'beachLie') {
        if (p.mode === 'beachSit') { // seated on the towel
          p.legL.rotation.x = 1.25; p.legR.rotation.x = 1.25;
          p.armL.rotation.x = 0.2; p.armR.rotation.x = -0.2;
        } else { // beachStand: at ease, watching the water
          p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
          p.armL.rotation.x = 0.14; p.armR.rotation.x = -0.14;
        }
      }
      if (dPlayer < ANIM_NEAR && p.mode === 'beachLie') {
        p.legL.rotation.x = 0; p.legR.rotation.x = 0; p.armL.rotation.x = 0; p.armR.rotation.x = 0;
      }
      if (p.idleT <= 0) beachPick(p);
    }
    // lie: recline the whole body onto the towel; ease back upright on every other mode
    const target = lying ? -1.35 : 0, ty = lying ? -0.55 : 0;
    p.body.rotation.x += (target - p.body.rotation.x) * Math.min(1, dt * 6);
    if (p.mode !== 'beachWalk') p.body.position.y += (ty - p.body.position.y) * Math.min(1, dt * 6);
    p.x = clamp(p.x, BEACH_BAND.minX, BEACH_BAND.maxX);
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
  }

  // ---- round 7: cafe lingerers - sit at the cafe sets, stroll to another set now and then ----
  function assignCafe(p, set) {
    p.role = 'cafe'; p.road = null; // cafe life is road-free; update() handles cafe peds first
    p.a = { x: set.x, z: set.z }; // table anchor
    p.x = set.x - 0.85; p.z = set.z; // the west chair
    p.mode = 'cafeSit'; p.idleT = 20 + Math.random() * 40;
    p.root.rotation.y = -Math.PI / 2; // facing the table (+x)
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
  }

  function updateCafe(p, dt, dPlayer) {
    if (p.mode === 'cafeWalk') {
      const dx = p.wx - p.x, dz = p.wz - p.z, d = Math.hypot(dx, dz);
      const step = p.speed * 0.9 * dt;
      if (d <= step + 0.05) { p.mode = 'cafeSit'; p.idleT = 20 + Math.random() * 40; p.root.rotation.y = -Math.PI / 2; }
      else {
        let nx = p.x + dx / d * step, nz = p.z + dz / d * step;
        if (isRoad(nx, nz)) { nx = p.x; nz = p.z; } // belt-and-braces: same-side legs never touch a road
        else { p.x = nx; p.z = nz; }
      }
      if (p.mode === 'cafeWalk') p.root.rotation.y = -Math.atan2(p.wx - p.x, -(p.wz - p.z));
      if (dPlayer < ANIM_NEAR) {
        p.phase += dt * p.speed * 3.6;
        const sw = Math.sin(p.phase);
        p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
        p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
      }
      p.body.position.y += (Math.abs(Math.sin(p.phase * 2)) * 0.045 - p.body.position.y) * Math.min(1, dt * 8);
    } else {
      p.idleT -= dt;
      if (p.mode === 'cafeSit') { // seated at the table (unconditional: a handful of float writes, keeps far sims honest)
        p.legL.rotation.x = 1.25; p.legR.rotation.x = 1.25;
        p.armL.rotation.x = 0.35; p.armR.rotation.x = -0.35; // hands toward the table
      } else { // cafeStand: at ease by the chair
        p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
        p.armL.rotation.x = 0.14; p.armR.rotation.x = -0.14;
      }
      if (p.idleT <= 0) {
        const r = Math.random();
        if (r < 0.45 || CAFE_SETS.length < 2) { p.mode = p.mode === 'cafeSit' ? 'cafeStand' : 'cafeSit'; p.idleT = p.mode === 'cafeSit' ? 20 + Math.random() * 40 : 4 + Math.random() * 8; }
        else { // stroll to a different set ON THE SAME SIDE of the diagonal avenue (z=10 line):
          // the avenue cuts the promenade, so straight legs must never cross it
          const side = p.a.z < 10;
          const mates = CAFE_SETS.filter((s) => (s.z < 10) === side && !(s.x === p.a.x && s.z === p.a.z));
          if (!mates.length) { p.mode = 'cafeSit'; p.idleT = 20 + Math.random() * 40; }
          else {
            const t = mates[Math.floor(Math.random() * mates.length)];
            p.a = { x: t.x, z: t.z }; p.wx = t.x - 0.85; p.wz = t.z; p.mode = 'cafeWalk';
          }
        }
      }
    }
    p.x = clamp(p.x, CAFE_BAND.minX - 1, -140.5); // promenade between storefronts and the lane
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
  }

  // round 3: stroller - stand 20-60 s at one idle spot, walk the lane to the other, repeat
  function updateStroller(p, dt, dPlayer) {
    if (p.mode === 'corner') { // mid side-swap: reuse the corner-line walk
      const dx = p.ctx - p.x, dz = p.ctz - p.z, d = Math.hypot(dx, dz);
      const step = p.speed * 1.5 * dt;
      if (d <= step + 0.05) { p.mode = 'walkTo'; p.x = p.ctx; p.z = p.ctz; }
      else { p.x += dx / d * step; p.z += dz / d * step; }
      p.root.position.set(p.x, ground(p.x, p.z), p.z);
      p.root.rotation.y = -Math.atan2(dx, -dz);
      if (dPlayer < ANIM_NEAR) {
        p.phase += dt * p.speed * 1.5 * 3.6;
        const sw = Math.sin(p.phase);
        p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
        p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
        p.body.position.y = Math.abs(Math.sin(p.phase * 2)) * 0.045;
      }
      return;
    }
    if (p.mode === 'stand') { // standing at a spot, watching the street
      p.idleT -= dt;
      if (dPlayer < ANIM_NEAR) {
        p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
        p.armL.rotation.x = 0.14; p.armR.rotation.x = -0.14;
        p.body.position.y *= 0.8;
      }
      if (p.idleT <= 0) {
        p.target = (p.target === p.b) ? p.a : p.b; // first leg: a -> b (starts at a)
        p.mode = 'walkTo';
      }
      return;
    }
    // walkTo: follow the lane toward the target spot's s
    const dirT = p.target.s >= p.s ? 1 : -1;
    const v = p.speed * (isRoad(p.x, p.z) ? 2.5 : 1);
    p.s += dirT * v * dt;
    p.dir = dirT;
    if (p.s >= p.road.len - 1) p.s = p.road.len - 1;
    else if (p.s <= 1) p.s = 1;
    const q = spot(p.road, p.s, p.side, Q1);
    // blocked ahead: swap sidewalk side via a corner line, else wait a beat and retry
    const ax = q.x + q.ux * dirT * 1.1, az = q.z + q.uz * dirT * 1.1;
    if (isBlk(ax, az, 0.3)) {
      const q2 = spot(p.road, p.s, -p.side, Q2);
      const bx = q2.x + q2.ux * dirT * 1.1, bz = q2.z + q2.uz * dirT * 1.1;
      if (!isBlk(bx, bz, 0.3) && !isRoad(q2.x, q2.z)) {
        p.side = -p.side; p.ctx = q2.x; p.ctz = q2.z; p.mode = 'corner';
        return;
      }
      p.root.position.set(p.x, ground(p.x, p.z), p.z); // both sides blocked: wait in place
      return;
    }
    p.x = q.x; p.z = q.z;
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
    p.root.rotation.y = -Math.atan2(q.ux * dirT, -q.uz * dirT);
    if (dPlayer < ANIM_NEAR) {
      p.phase += dt * v * 3.6;
      const sw = Math.sin(p.phase);
      p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
      p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
      p.body.position.y = Math.abs(Math.sin(p.phase * 2)) * 0.045;
    }
    if (Math.abs(p.s - p.target.s) < 2.5) { // arrived: stand 20-60 s facing the spot
      p.mode = 'stand';
      p.idleT = 20 + Math.random() * 40;
      p.root.rotation.y = -Math.atan2(p.target.x - p.x, -(p.target.z - p.z));
    }
  }

  // round 4: nearest arc position of a road to a point (one-off per crossing, no allocs)
  function snapS(road, x, z) {
    let best = 1, bd = Infinity;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const ax = road.pts[i][0], az = road.pts[i][1], bx = road.pts[i + 1][0], bz = road.pts[i + 1][1];
      const rx = bx - ax, rz = bz - az, L2 = rx * rx + rz * rz;
      let t = L2 ? ((x - ax) * rx + (z - az) * rz) / L2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = ax + t * rx - x, ez = az + t * rz - z, d2 = ex * ex + ez * ez;
      if (d2 < bd) { bd = d2; best = road.cum[i] + t * Math.sqrt(L2); }
    }
    return Math.min(road.len - 1, Math.max(1, best));
  }

  // round 4: crosswalk sequence - route to kerb, pause 2-6 s, hurry over the zebra
  function updateCrossing(p, dt, dPlayer) {
    if (p.mode === 'kerbWait') { // paused at the kerb, facing across the street
      p.idleT -= dt;
      if (dPlayer < ANIM_NEAR) {
        p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
        p.armL.rotation.x = 0.14; p.armR.rotation.x = -0.14;
        p.body.position.y *= 0.8;
      }
      if (p.idleT <= 0) { p.mode = 'cross'; p.cwT = 0; }
      return;
    }
    const hurrying = p.mode === 'cross';
    const tx = hurrying ? p.cwtx : p.cwfx, tz = hurrying ? p.cwtz : p.cwfz;
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const v = p.speed * (hurrying ? 2.5 : 1); // zebra: hurry so crossing stays <= 8 s
    const step = v * dt;
    if (hurrying) p.cwT += dt;
    if (d <= step + 0.05) {
      p.x = tx; p.z = tz;
      if (p.mode === 'toKerb') {
        p.mode = 'kerbWait'; p.idleT = 2 + Math.random() * 4;
        p.root.rotation.y = -Math.atan2(p.cwtx - p.x, -(p.cwtz - p.z));
      } else { // far kerb reached: resume sidewalk walking on the far side
        p.side = -p.side;
        p.s = snapS(p.road, p.x, p.z);
        p.mode = 'walk'; p.cw = null;
        p.crossCd = 25 + Math.random() * 15;
      }
    } else { p.x += dx / d * step; p.z += dz / d * step; }
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
    if (p.mode !== 'kerbWait') {
      p.root.rotation.y = -Math.atan2(dx, -dz);
      if (dPlayer < ANIM_NEAR) {
        p.phase += dt * v * 3.6;
        const sw = Math.sin(p.phase);
        p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
        p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
        p.body.position.y = Math.abs(Math.sin(p.phase * 2)) * 0.045;
      }
    }
  }

  // ---- round 9: viewpoint tourists - stand at the turnout, face the view, photo pose ----
  function assignTourist(p, sx, sz) {
    p.role = 'tourist'; p.road = null; // viewpoint life is road-free; update() handles tourists first
    p.a = { x: sx + (Math.random() - 0.5) * 1.4, z: sz + (Math.random() - 0.5) * 4.5 };
    if (isRoad(p.a.x, p.a.z)) p.a.x = sx - 1.2; // never on the pad
    p.x = p.a.x; p.z = p.a.z;
    p.mode = 'tourGaze'; p.idleT = 6 + Math.random() * 8;
    p.root.rotation.y = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; // facing the view (+x)
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
  }

  function touristPick(p) { // next idle mode after a gaze/photo spell
    const r = Math.random();
    if (r < 0.55) { p.mode = 'tourGaze'; p.idleT = 6 + Math.random() * 8; p.root.rotation.y = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; }
    else if (r < 0.85) { p.mode = 'tourPhoto'; p.idleT = 3 + Math.random() * 3; } // phone up for the skyline shot
    else {
      p.mode = 'tourShift';
      p.wx = p.a.x + (Math.random() - 0.5) * 2.4;
      p.wz = p.a.z + (Math.random() - 0.5) * 3.6;
      if (isRoad(p.wx, p.wz)) { p.mode = 'tourGaze'; p.idleT = 4 + Math.random() * 4; }
    }
  }

  function updateTourist(p, dt, dPlayer) {
    if (p.mode === 'tourShift') { // small shuffle near the anchor, never onto the pad
      const dx = p.wx - p.x, dz = p.wz - p.z, d = Math.hypot(dx, dz);
      const step = p.speed * 0.5 * dt;
      if (d <= step + 0.05) { p.mode = 'tourGaze'; p.idleT = 5 + Math.random() * 7; p.root.rotation.y = -Math.PI / 2; }
      else {
        const nx = p.x + dx / d * step, nz = p.z + dz / d * step;
        if (isRoad(nx, nz)) { p.mode = 'tourGaze'; p.idleT = 4 + Math.random() * 4; }
        else { p.x = nx; p.z = nz; }
      }
      if (p.mode === 'tourShift') p.root.rotation.y = -Math.atan2(dx, -dz);
      if (dPlayer < ANIM_NEAR) {
        p.phase += dt * p.speed * 3.6;
        const sw = Math.sin(p.phase);
        p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
        p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
      }
    } else {
      p.idleT -= dt;
      if (dPlayer < ANIM_NEAR) {
        p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
        if (p.mode === 'tourPhoto') { // both arms up with the phone
          p.armL.rotation.x = -2.35; p.armR.rotation.x = -2.35;
        } else { // tourGaze: at ease, watching the city
          p.armL.rotation.x = 0.14; p.armR.rotation.x = -0.14;
        }
        p.body.position.y *= 0.8;
      }
      if (p.idleT <= 0) touristPick(p);
    }
    p.root.position.set(p.x, ground(p.x, p.z), p.z);
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    const pp = (getPlayerPos && getPlayerPos()) || { x: 0, z: 0 }; // once per frame
    for (const p of peds) {
      if (p.role === 'tourist') { // round 9: viewpoint tourists skip all road logic (incl. respawn)
        const dP = Math.hypot(p.x - pp.x, p.z - pp.z);
        p.root.visible = dP <= HIDE_FAR;
        if (p.root.visible) updateTourist(p, dt, dP);
        continue;
      }
      if (p.role === 'cafe') { // round 7: cafe lingerers skip all road logic (incl. respawn)
        const dP = Math.hypot(p.x - pp.x, p.z - pp.z);
        p.root.visible = dP <= HIDE_FAR;
        if (p.root.visible) updateCafe(p, dt, dP);
        continue;
      }
      if (p.role === 'beach') { // round 6: beach idlers skip all road logic (incl. respawn)
        const dP = Math.hypot(p.x - pp.x, p.z - pp.z);
        p.root.visible = dP <= HIDE_FAR;
        if (p.root.visible) updateBeach(p, dt, dP);
        continue;
      }
      if (p.role === 'pier') { // round 5: pier strollers skip all road logic (incl. respawn)
        const dP = Math.hypot(p.x - pp.x, p.z - pp.z);
        p.root.visible = dP <= HIDE_FAR;
        if (p.root.visible) updatePier(p, dt, dP);
        continue;
      }
      if (!p.road) { p.root.visible = false; continue; }
      const dPlayer = Math.hypot(p.x - pp.x, p.z - pp.z);
      if (dPlayer > HIDE_FAR) { // too far: hide, try to respawn near the player
        p.root.visible = false;
        p.mode = 'walk';
        if (p.stayOnRoad) continue; // round 8: court walkers keep their court (visibility only)
        p.respawnCd -= dt;
        if (p.respawnCd <= 0) {
          p.respawnCd = 2;
          if (spawn(p, pp, 45, HIDE_FAR - 25)) {
            const q = spot(p.road, p.s, p.side, Q1);
            p.x = q.x; p.z = q.z;
            if (p.role === 'stroll' && !assignStroll(p)) { p.role = 'wander'; p.mode = 'walk'; }
          }
        }
        continue;
      }
      p.root.visible = true;
      if (p.shell) { // PED-2: mid band shows the 1-draw shell instead of the 5 parts
        const far = dPlayer > ANIM_NEAR;
        p.shell.visible = far;
        p.body.visible = !far;
      }
      if (p.role === 'stroll') { updateStroller(p, dt, dPlayer); continue; } // round 3 wander loops
      if (p.mode === 'toKerb' || p.mode === 'kerbWait' || p.mode === 'cross') { // round 4 crosswalk
        updateCrossing(p, dt, dPlayer);
        continue;
      }
      if (p.mode === 'corner') { // rounding a junction after a turn: walk the corner line
        const dx = p.ctx - p.x, dz = p.ctz - p.z, d = Math.hypot(dx, dz);
        const step = p.speed * 1.5 * dt;
        if (d <= step + 0.05) { p.mode = 'walk'; p.x = p.ctx; p.z = p.ctz; }
        else { p.x += dx / d * step; p.z += dz / d * step; }
        p.root.position.set(p.x, ground(p.x, p.z), p.z);
        p.root.rotation.y = -Math.atan2(dx, -dz);
        if (dPlayer < ANIM_NEAR) {
          p.phase += dt * p.speed * 1.5 * 3.6;
          const sw = Math.sin(p.phase);
          p.legL.rotation.x = sw * 0.55; p.legR.rotation.x = -sw * 0.55;
          p.armL.rotation.x = -sw * 0.4; p.armR.rotation.x = sw * 0.4;
          p.body.position.y = Math.abs(Math.sin(p.phase * 2)) * 0.045;
        }
        continue;
      }
      if (p.mode === 'idle') { // resting at a bench/shelter/pier: static pose, no movement
        p.idleT -= dt;
        if (p.idleT <= 0) {
          p.mode = 'walk';
          p.idleCd = 15 + Math.random() * 40;
        } else if (dPlayer < ANIM_NEAR) { // pose writes only when visible up close
          if (p.pose === 'sit') {
            p.legL.rotation.x = 1.25; p.legR.rotation.x = 1.25;
            p.armL.rotation.x = 0.45; p.armR.rotation.x = 0.45;
          } else {
            p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
            p.armL.rotation.x = 0.14; p.armR.rotation.x = -0.14;
          }
          p.body.position.y *= 0.8;
        }
        continue;
      }
      // walking: maybe start idling near an idle spot
      p.idleCd -= dt;
      if (p.idleCd <= 0) {
        let hit = null;
        for (const sp of SPOTS) {
          if (Math.hypot(sp.x - p.x, sp.z - p.z) < 6) { hit = sp; break; }
        }
        if (hit && Math.random() < 0.5) {
          p.mode = 'idle'; p.pose = hit.pose;
          p.idleT = 6 + Math.random() * 9;
          p.root.rotation.y = -Math.atan2(hit.x - p.x, -(hit.z - p.z)); // face the spot
          continue;
        }
        if (!hit && Math.random() < 0.004) { // rare pause anywhere
          p.mode = 'idle'; p.pose = 'stand';
          p.idleT = 4 + Math.random() * 5;
          continue;
        }
        p.idleCd = 2; // re-check soon while walking past spots
      }
      // crosswalk hurry: brief says stay off the road surface; at junction crossings the
      // sidewalk line crosses the side road, so they hurry across instead of strolling.
      const onRoad = isRoad(p.x, p.z);
      const v = p.speed * (onRoad ? 2.5 : 1);
      const sOld = p.s;
      p.s += p.dir * v * dt;
      p.turnCd -= dt;
      // turn at junctions: crossed a transfer point -> maybe switch to the crossing road
      if (p.turnCd <= 0 && !p.stayOnRoad) { // round 8: court walkers never leave their court
        for (const tr of p.road.transfers) {
          const crossed = p.dir > 0 ? (sOld < tr.s && p.s >= tr.s) : (sOld > tr.s && p.s <= tr.s);
          if (crossed && Math.random() < 0.3) {
            const nr = tr.other;
            p.dir = Math.random() < 0.5 ? 1 : -1;
            // pick the new lane side closest to the current position and walk the
            // corner line over to it (no 8-12 m pop around the junction)
            let bestD = Infinity, bestSide = 1, bestS = 0, bestX = 0, bestZ = 0;
            for (const sd of [1, -1]) {
              const sn = Math.min(nr.len - 2, Math.max(2, tr.sOther + p.dir * 2));
              const qn = spot(nr, sn, sd, Q2);
              const dd = Math.hypot(qn.x - p.x, qn.z - p.z);
              if (dd < bestD) { bestD = dd; bestSide = sd; bestS = sn; bestX = qn.x; bestZ = qn.z; }
            }
            p.road = nr; p.s = bestS; p.side = bestSide;
            p.ctx = bestX; p.ctz = bestZ;
            p.mode = 'corner';
            p.turnCd = 1.5;
            break;
          }
        }
      }
      if (p.mode === 'corner') continue; // just turned: corner line starts next tick
      // round 4: occasionally cross at a marked crosswalk (wander role only)
      p.crossCd -= dt;
      {
        let nearAny = false;
        if (p.crossCd <= 0) {
          const q0 = spot(p.road, p.s, p.side, Q3);
          for (const cw of CROSS) {
            const ddx = cw.cx - p.x, ddz = cw.cz - p.z;
            if (ddx * ddx + ddz * ddz > 144) continue; // only near the junction arm
            nearAny = true;
            if (Math.abs(cw.ux * q0.ux + cw.uz * q0.uz) < 0.8) continue; // arm of another road
            if (p.cwNear === cw) continue; // already decided at this crosswalk
            const ko = cw.w / 2 + 1.3;
            const kx = cw.cx + cw.nx * p.side * ko, kz = cw.cz + cw.nz * p.side * ko;
            if (Math.hypot(kx - p.x, kz - p.z) > 3.5) continue; // not at the kerb line yet
            p.cwNear = cw;
            if (Math.random() < 0.4) {
              p.mode = 'toKerb'; p.cw = cw;
              p.cwfx = kx; p.cwfz = kz;
              p.cwtx = cw.cx - cw.nx * p.side * ko;
              p.cwtz = cw.cz - cw.nz * p.side * ko;
              break;
            }
            p.crossCd = 6; // declined: don't re-roll every frame
            break;
          }
        }
        if (!nearAny) p.cwNear = null;
        if (p.mode === 'toKerb') { updateCrossing(p, dt, dPlayer); continue; }
      }
      if (p.s >= p.road.len - 1) { p.s = p.road.len - 1; p.dir = -1; }
      else if (p.s <= 1) { p.s = 1; p.dir = 1; }
      let q = spot(p.road, p.s, p.side, Q1);
      // blocked-ahead probe: swap sidewalk side, else reverse
      const ax = q.x + q.ux * p.dir * 1.1, az = q.z + q.uz * p.dir * 1.1;
      if (isBlk(ax, az, 0.3)) {
        const q2 = spot(p.road, p.s, -p.side, Q2);
        const bx = q2.x + q2.ux * p.dir * 1.1, bz = q2.z + q2.uz * p.dir * 1.1;
        if (!isBlk(bx, bz, 0.3) && !isRoad(q2.x, q2.z)) {
          // walk across to the far sidewalk instead of popping over
          p.side = -p.side;
          p.ctx = q2.x; p.ctz = q2.z; p.mode = 'corner';
          continue;
        }
        p.dir = -p.dir; q = spot(p.road, p.s, p.side, Q1);
      }
      p.x = q.x; p.z = q.z;
      p.root.position.set(p.x, ground(p.x, p.z), p.z);
      p.root.rotation.y = -Math.atan2(q.ux * p.dir, -q.uz * p.dir); // actors heading convention
      if (dPlayer < ANIM_NEAR) { // full cheap walk cycle
        p.phase += dt * v * 3.6;
        const sw = Math.sin(p.phase);
        p.legL.rotation.x = sw * 0.55;
        p.legR.rotation.x = -sw * 0.55;
        p.armL.rotation.x = -sw * 0.4;
        p.armR.rotation.x = sw * 0.4;
        p.body.position.y = Math.abs(Math.sin(p.phase * 2)) * 0.045;
      } else { // glide: relax limbs
        p.legL.rotation.x *= 0.85; p.legR.rotation.x *= 0.85;
        p.armL.rotation.x *= 0.85; p.armR.rotation.x *= 0.85;
        p.body.position.y *= 0.85;
      }
    }
  }

  return { update, count: peds.length };
}
