// DSB Land's reusable geometry. All moving props share cached meshes.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const { createNode, addChild } = BL.scene;
  const { box, lathe, merge } = BL.models;
  const geometries = new Map();
  const cached = (key, build) => { if (!geometries.has(key)) geometries.set(key, build()); return geometries.get(key); };
  const C = { ground: "#403054", stone: "#251c39", yellow: "#ffdf38", purple: "#a453ee", cyan: "#49ddd9", water: "#414dad", green: "#55b78d" };
  const cube = (color, emissive = 0) => cached(`dsb-cube-${color}-${emissive}`, () => box({ color, emissive }));
  const block = (parent, color, x, y, z, w, h, d, emissive = 0) => {
    const node = createNode({ geometry: cube(color, emissive), position: { x, y, z }, scale: { x: w, y: h, z: d } });
    addChild(parent, node);
    return node;
  };
  const text = (value, color = C.yellow) => cached(`dsb-text-${value}-${color}`, () => {
    const bits = [], cell = 0.16, width = (value.length * 4 - 1) * cell;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === " ") continue;
      const glyph = BL.hubModels.SIGN_GLYPHS[value[i]] || BL.hubModels.SIGN_GLYPHS[value[i].toLowerCase()];
      if (!glyph) throw new Error(`Missing DSB glyph ${value[i]}`);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (glyph[r][c] === "1") bits.push(box({ w: 0.135, h: 0.135, d: 0.12, color, emissive: 0.6, offset: { x: i * 4 * cell + c * cell - width / 2, y: (4 - r) * cell } }));
    }
    return merge(...bits);
  });
  const sign = (parent, value, x, y, z, scale = 1, color = C.yellow) => {
    const node = createNode({ geometry: text(value, color), position: { x, y, z }, scale: { x: scale, y: scale, z: scale } });
    addChild(parent, node);
    return node;
  };
  const disc = (r, depth, color) => cached(`dsb-disc-${r}-${depth}-${color}`, () => lathe({ profile: [[0, -depth], [r, -depth], [r, 0], [0, 0]], segments: 64, color }));
  const boat = () => {
    const root = createNode();
    block(root, C.yellow, 0, 0, 0, 2.2, 0.65, 4);
    block(root, C.stone, 0, 0.4, 0, 1.6, 0.3, 3.1);
    block(root, C.purple, 0, 0.75, 0.65, 1.7, 0.6, 0.6);
    for (const x of [-1, 1]) block(root, C.cyan, x, 0.5, 0, 0.15, 0.25, 3.8, 0.6);
    return root;
  };
  const coasterCar = () => {
    const root = createNode();
    block(root, C.purple, 0, 0.25, 0, 2.1, 0.5, 3.8);
    block(root, C.yellow, 0, 0.65, 1.5, 2, 0.8, 0.55);
    block(root, C.stone, 0, 0.7, -0.7, 1.6, 0.8, 0.45);
    block(root, C.cyan, 0, 1.1, 1.7, 2, 0.09, 0.09, 0.4);
    for (const x of [-1, 1]) { block(root, C.yellow, x, 0.75, 0, 0.14, 0.7, 3.5); for (const z of [-1.2, 1.2]) block(root, C.stone, x, -0.12, z, 0.3, 0.45, 0.45); }
    return root;
  };
  // The Shop/TV roots own placement. Their local +Z is the usable front.
  const landmark = (node, width, depth) => ({
    node, width, depth,
    point(x = 0, y = 0, z = 3.5, out = {}) {
      const c = Math.cos(node.rotation.y), s = Math.sin(node.rotation.y), p = node.position;
      out.x = p.x + c * x + s * z; out.y = p.y + y; out.z = p.z - s * x + c * z; return out;
    },
    clearAt(x, z, radius = 0) {
      const c = Math.cos(node.rotation.y), s = Math.sin(node.rotation.y), dx = x - node.position.x, dz = z - node.position.z;
      const lx = Math.abs(c * dx - s * dz), lz = Math.abs(s * dx + c * dz);
      if (lx < width && lz < depth) return false;
      return Math.hypot(Math.max(0, lx - width), Math.max(0, lz - depth)) >= radius;
    },
    near(p, range = 4) {
      const c = Math.cos(node.rotation.y), s = Math.sin(node.rotation.y), dx = p.x - node.position.x, dz = p.z - node.position.z;
      const x = c * dx - s * dz, z = s * dx + c * dz;
      return z >= depth && Math.hypot(x, z - 3.5) < range;
    }
  });
  const OLYMPUS_TRAIL = [
    [-18, -11.5, 26.9], [-17.5, -8.5, 24.5], [-15.5, -5.5, 21.5],
    [-12.5, -2.0, 18.0], [-9.0, 1.0, 14.0], [-6.0, 4.0, 10.5],
    [-3.0, 7.0, 7.0], [-1.0, 10.0, 3.5], [0.0, 13.0, 0.0]
  ];
  const trailSample = (x, z) => {
    let best = Infinity, height = 0;
    for (let i = 0; i < OLYMPUS_TRAIL.length - 1; i++) {
      const a = OLYMPUS_TRAIL[i], b = OLYMPUS_TRAIL[i + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1], len2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / Math.max(1e-6, len2)));
      const px = a[0] + dx * t, pz = a[1] + dz * t, distance = Math.hypot(x - px, z - pz);
      if (distance < best) { best = distance; height = a[2] + (b[2] - a[2]) * t; }
    }
    return { distance: best, height };
  };
  const trailGroundAt = (x, z) => {
    const sample = trailSample(x, z);
    return sample.distance <= 2.35 ? sample.height : 0;
  };
  const trailAt = (x, z, radius = 0) => trailSample(x, z).distance <= Math.max(0.8, 2.35 - radius * 0.35);
  const build = () => {
    const root = createNode();
    // Ocean first: DSB is now a real island in an apparently unbounded Aegean,
    // rather than a platform with a decorative edge. The renderer's blue horizon
    // carries the illusion beyond this large low-poly water disc.
    const water = createNode({ geometry: disc(155, 0.28, "#2f8ecb"), position: { x: 0, y: -0.75, z: 0 } });
    addChild(root, water);
    const terrain = createNode({ geometry: disc(36, 2.5, "#8c775c") });
    addChild(root, terrain);
    const turtle = createNode(); addChild(root, turtle);
    const falls = [], spray = [], foam = [];
    // Stream only decorative density. Major silhouettes stay resident so the
    // island still reads correctly from Olympus, the sea and the intro camera.
    const olympusDetail = createNode(), villageDetail = createNode(), harborDetail = createNode();
    addChild(root, olympusDetail, villageDetail, harborDetail);

    // Golden-white beach shelf around the gentler two-thirds of the coast.
    for (let i = 0; i < 34; i++) {
      const a = -2.55 + i * (5.1 / 33);
      if (a > 2.2 || a < -2.2) continue;
      const r = 34.3 + (i % 3) * 0.32;
      const beach = block(root, i % 2 ? "#e8d4a5" : "#f2dfb5", Math.sin(a) * r, -0.18, Math.cos(a) * r, 4.6, 0.28, 3.1);
      beach.rotation.y = a;
    }

    // Cheap shoreline motion: a few emissive foam strips sell waves without
    // simulating an ocean mesh. They only animate when the scene updates.
    for (let i = 0; i < 20; i++) {
      const a = -2.05 + i * (4.1 / 19), r = 35.2 + (i % 2) * 0.25;
      const strip = block(root, "#bcebf4", Math.sin(a) * r, -0.47, Math.cos(a) * r, 2.8, 0.055, 0.18, 0.22);
      strip.rotation.y = a; foam.push(strip);
    }

    // Mount Olympus: deliberately chunky, stepped and readable in the same
    // OogaBoogaLand language as the hub. It occupies the wild third of the island.
    const ox = -18, oz = -14;
    const tiers = [
      [0, 3.0, 0, 25, 6, 23, "#756b62"],
      [0, 7.3, -0.5, 20, 5, 18, "#82766b"],
      [0.8, 11.2, -1.0, 16, 4.2, 14, "#8f8275"],
      [1.6, 14.8, -1.8, 12, 3.6, 10, "#9b8c7d"],
      [2.0, 18.0, -2.3, 8.5, 3.0, 7.4, "#a99a88"],
      [2.2, 20.7, -2.6, 6.2, 2.5, 5.5, "#b6a794"]
    ];
    for (const [dx,y,dz,w,h,d,color] of tiers) block(root, color, ox + dx, y, oz + dz, w, h, d);
    // White terraces/temples and cypress-like vertical accents.
    for (const [dx,y,dz,w,d] of [[-5,6.4,4,6,4],[5,10.2,2,5,3.4],[-3,14.1,-2,5,3.5],[3,17.2,-3,4,3]]) {
      block(olympusDetail, "#eee7da", ox + dx, y, oz + dz, w, 0.8, d);
      for (const sx of [-1,1]) block(olympusDetail, "#f7f2e8", ox + dx + sx * (w * 0.36), y + 1.5, oz + dz, 0.42, 3, 0.42);
      block(olympusDetail, "#e1d3bd", ox + dx, y + 3.0, oz + dz, w + 0.7, 0.45, d + 0.5);
    }
    for (const [dx,y,dz] of [[-8,5,1],[-6,9,-5],[7,7,3],[5,13,-3],[-2,18,-4],[4,20,-2]]) {
      block(olympusDetail, "#3f6a35", ox + dx, y + 2.1, oz + dz, 0.65, 4.2, 0.65);
      block(olympusDetail, "#557f45", ox + dx, y + 4.1, oz + dz, 1.3, 1.2, 1.3);
    }
    // Waterfalls descending the Olympus terraces.
    for (const [dx,y,dz,h] of [[-5.8,10.0,6.0,8],[4.7,12.0,4.5,10],[0.5,16.0,1.6,8]]) {
      const fall = block(root, "#55c9ef", ox + dx, y, oz + dz, 1.2, h, 0.22, 0.28);
      falls.push(fall);
      const mist = block(root, "#9ee9f6", ox + dx, y - h * 0.48, oz + dz + 0.15, 0.3, 1.4, 0.3, 0.3);
      spray.push(mist);
    }

    // The Portara is not decoration: the circular Stargate horizon is positioned
    // inside this rectangular marble frame by scene-dsb.js.
    const py = 31.0, px = ox, pz = oz;
    block(root, "#f1eadf", px - 3.0, py, pz, 1.05, 8.5, 1.35);
    block(root, "#f1eadf", px + 3.0, py, pz, 1.05, 8.5, 1.35);
    block(root, "#f6f0e7", px, py + 4.0, pz, 7.0, 1.05, 1.35);
    block(root, "#d9c8aa", px, py - 4.1, pz, 8.2, 0.8, 4.0);
    for (const x of [-4.7,4.7]) block(root, "#d3b36d", px + x, py - 3.3, pz + 0.5, 0.28, 1.4, 0.28, 0.5);

    // Walkable Olympus descent. Closely spaced slabs make the physical height
    // transition gradual enough for the existing Ooga walking/step rules.
    for (let i = 0; i < OLYMPUS_TRAIL.length - 1; i++) {
      const a = OLYMPUS_TRAIL[i], b = OLYMPUS_TRAIL[i + 1];
      const distance = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(2, Math.ceil(distance / 0.42));
      for (let j = 0; j <= steps; j++) {
        const t = j / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = a[2] + (b[2] - a[2]) * t;
        block(root, j % 3 ? "#d6c5a7" : "#eadbc1", x, y - 0.12, z, 2.9, 0.24, 0.52);
      }
    }

    // First-pass Cycladic / modernist village massing below Olympus.
    const houses = [
      [-8,0.8,13,6,4],[-1,0.7,15,5,4],[7,0.8,13,6,4],[14,0.9,9,5,4],
      [-12,1.2,7,5,4],[-5,1.4,6,5,4],[3,1.2,7,6,4],[10,1.5,4,5,4],
      [-8,2.1,0,4.5,3.5],[0,1.8,1,5,4],[8,2.0,-1,4.5,3.5]
    ];
    for (let i = 0; i < houses.length; i++) {
      const [x,y,z,w,d] = houses[i];
      block(root, i % 3 ? "#eee9df" : "#f8f5ef", x, y, z, w, 2.6 + (i % 2) * 0.6, d);
      if (i % 3 === 0) block(villageDetail, "#2d65a3", x, y + 2.2, z, w * 0.45, 0.35, d * 0.45);
      block(villageDetail, "#d8c7aa", x, y + 0.8, z + d * 0.51, w * 0.42, 0.85, 0.16);
    }
    // Raised central monument and radial paths.
    block(root, C.stone, 0, 0.45, 0, 16, 0.9, 4);
    block(root, C.yellow, 0, 0.96, 0, 16.4, 0.12, 4.4, 0.3);
    block(root, C.stone, 0, 2.25, -0.4, 15.5, 2.5, 0.8);
    sign(root, "Welcome to", 0, 2.9, 0.1, 0.8, C.cyan);
    sign(root, "DSB Land", 0, 1.55, 0.15, 2.1);
    for (let i = 0; i < 22; i++) block(root, i % 3 ? "#5a4568" : C.yellow, 0, 0.025, 5 + i * 1.35, 2.5, 0.05, 0.8, i % 3 ? 0 : 0.12);
    for (let i = 0; i < 12; i++) for (const side of [-1, 1]) block(root, "#5a4568", side * (3 + i * 1.4), 0.025, 7, 0.8, 0.05, 2);
    // Comedy stage: brick wall, suspended lights, and a microphone.
    const stage = createNode({ position: { x: -18, y: 0, z: 10 } }); addChild(root, stage);
    block(stage, C.stone, 0, 0.55, 0, 14, 1.1, 8);
    block(stage, C.yellow, 0, 1.12, 3.9, 14, 0.12, 0.15, 0.6);
    const bricks = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) bricks.push(box({ w: 1.32, h: 0.47, d: 0.5, color: (x + y) % 3 ? "#6a344d" : "#864661", offset: { x: (x - 4.5) * 1.4 + (y % 2) * 0.35, y: 1.4 + y * 0.53, z: -3.6 } }));
    addChild(stage, createNode({ geometry: merge(...bricks) }));
    sign(stage, "Open mic", 0, 4.6, -3.25, 1.6);
    block(stage, "#141322", 0, 1.18, 1.1, 0.7, 0.12, 0.7);
    block(stage, "#b7b9c6", 0, 2, 1.1, 0.1, 1.6, 0.1);
    const mic = block(stage, "#d4d4d9", 0, 2.88, 1.1, 0.25, 0.4, 0.25);
    for (const x of [-6.5, 6.5]) {
      block(stage, C.stone, x, 3.2, -2, 0.3, 6.4, 0.3);
      block(stage, C.purple, x, 5.9, 0, 0.7, 0.7, 0.9, 0.9);
      block(stage, C.stone, x, 1.85, 2, 1.2, 1.5, 1.1);
    }
    block(stage, C.stone, 0, 6.2, -2, 13, 0.3, 0.3);
    for (let row = 0; row < 3; row++) for (const x of [-22, -18, -14]) block(root, "#766049", x, 0.5, -8 + row * 2.8, 3, 1, 0.8);
    // Meme stand and an inviting dock on the south shore.
    const shop = createNode({ position: { x: -14, y: 0, z: 18 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } }); addChild(root, shop);
    block(shop, C.stone, 0, 1, 0, 7, 2, 3);
    for (const x of [-3.4, 3.4]) block(shop, C.purple, x, 2.4, 0, 0.3, 4.8, 0.3);
    block(shop, C.yellow, 0, 4.4, 0, 7.8, 0.4, 4.5);
    sign(shop, "DSB memes", 0, 3.2, 1.6, 1.15);
    block(shop, "#bc8644", -1.6, 2.2, 0.9, 1.6, 0.45, 0.8);
    const banana = BL.models.banana(); banana.position.x = 0; banana.position.y = 2.12; banana.position.z = 0.9; addChild(shop, banana);
    block(shop, "#f14b68", 1.5, 2.3, 0.9, 0.6, 0.6, 0.6);
    // The walnut CRT faces the Shop across the open Stargate plaza.
    const tv = createNode({ position: { x: 14, y: 0, z: 18 }, rotation: { x: 0, y: -Math.PI / 2, z: 0 } }); addChild(root, tv);
    for (const x of [-2.7, 2.7]) block(tv, "#78543b", x, 0.7, 0, 0.45, 1.4, 1.5);
    block(tv, "#78543b", 0, 3.2, 0, 8, 4.4, 2.8);
    block(tv, C.yellow, 0, 3.2, 1.42, 7.7, 4.1, 0.12);
    block(tv, "#101b22", -0.55, 3.3, 1.53, 6.15, 3.35, 0.16);
    const tvScreen = createNode({ position: { x: -0.55, y: 3.3, z: 1.63 } }); addChild(tv, tvScreen);
    for (const y of [3.5, 4.4]) block(tv, C.stone, 3.2, y, 1.7, 0.55, 0.55, 0.3);
    for (let i = 0; i < 6; i++) block(tv, C.stone, 3.2, 1.85 + i * 0.16, 1.52, 0.65, 0.06, 0.1);
    for (const side of [-1, 1]) { const aerial = block(tv, "#a5b2bd", side * 0.7, 6.25, 0, 0.09, 2.1, 0.09); aerial.rotation.z = side * -0.65; }
    sign(tv, "DSB TV", -0.5, 1.22, 1.56, 0.4, C.cyan);
    const dock = block(root, "#8b7047", 0, -0.1, 37, 4.5, 0.3, 8);
    sign(root, "Boat station", 0, 3.2, 34.85, 0.8).rotation.y = Math.PI;
    for (const x of [-2.6, 2.6]) block(root, C.purple, x, 1.7, 35, 0.25, 3.4, 0.25);
    block(root, C.yellow, 0, 3.8, 35, 6, 0.2, 2);
    const boats = [boat(), boat(), boat()]; for (const b of boats) addChild(root, b);
    const station = createNode({ position: { x: -14, y: 0, z: -2 } }); addChild(root, station);
    block(station, C.stone, 0, -0.1, 0, 5, 0.2, 5);
    for (const x of [-2.3, 2.3]) { block(station, C.purple, x, 4.6, 0, 0.4, 9.2, 0.4); block(station, C.yellow, x, 2, -2.4, 0.25, 4, 0.25); }
    block(station, C.yellow, 0, 9.4, 1, 5.4, 0.4, 7);
    block(station, C.stone, 0, 0.9, -1.6, 2.5, 1.5, 0.7);
    sign(station, "Bitcoin coaster", 0, 4, -2.5, 0.75).rotation.y = Math.PI;
    sign(station, "Take a ride", 0, 2.6, -2.5, 0.65, C.cyan).rotation.y = Math.PI;
    // The boarding platform meets a level section of the perimeter track.
    for (let i = 0; i < 15; i++) block(station, "#78627d", 3.3, 0.3 + i * 0.6, -3.2 + i * 0.5, 1.6, 0.3, 0.55);
    const carts = [coasterCar(), coasterCar(), coasterCar()]; for (const car of carts) addChild(root, car); const cart = carts[0];
    for (let i = 0; i < 10; i++) {
      const x = -5.2 + i * 1.15;
      block(harborDetail, "#7b5a38", x, 0.55, 36.2, 0.22, 1.3, 0.22);
      if (i % 2 === 0) block(harborDetail, "#f0b84d", x, 1.32, 36.2, 0.16, 0.18, 0.16, 0.45);
    }
    const chunkState = { olympus: true, village: true, harbor: true };
    const updateStreaming = (viewer, cinematic = false) => {
      const test = (node, key, x, z, range) => {
        const next = cinematic || Math.hypot(viewer.x - x, viewer.z - z) <= range;
        if (chunkState[key] !== next) { chunkState[key] = next; node.visible = next; }
      };
      test(olympusDetail, "olympus", -18, -14, 60);
      test(villageDetail, "village", 0, 9, 52);
      test(harborDetail, "harbor", 0, 34, 42);
    };
    const updateEnvironment = (time, viewer, cinematic = false) => {
      water.position.y = -0.75 + Math.sin(time * 0.55) * 0.035;
      water.glow = 0.08 + 0.035 * Math.sin(time * 0.35);
      for (let i = 0; i < foam.length; i++) {
        const strip = foam[i], wave = Math.sin(time * 1.05 + i * 0.73);
        strip.position.y = -0.46 + wave * 0.035;
        strip.scale.x = 0.9 + wave * 0.08;
        strip.glow = 0.16 + (wave + 1) * 0.05;
      }
      updateStreaming(viewer, cinematic);
    };
    const groundAt = (x, z) => trailGroundAt(x, z);
    // Daylight is the default visual identity of redesigned DSB Land.
    const stars = [];
    return { landmarks: { shop: landmark(shop, 4, 2), tv: landmark(tv, 4.4, 1.9) }, root, terrain, turtle, water, foam, falls, spray, stage, mic, shop, tv, tvScreen, dock, boats, cart, carts, stars, station, groundAt, trailAt, updateStreaming, updateEnvironment, chunks: { olympusDetail, villageDetail, harborDetail } };
  };
  BL.dsbModels = { C, cube, block, text, sign, boat, build };
})();
