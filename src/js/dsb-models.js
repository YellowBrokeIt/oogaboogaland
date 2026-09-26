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
  const V2 = {
    radius: 112,
    oceanRadius: 420,
    summit: { x: -52, y: 52, z: -48 },
    chora: { x: 10, z: 12 },
    harbor: { x: 18, z: 93 },
    station: { x: -34, z: -20 }
  };
  const TRAIL = [
    [-52,-42,50],[-49,-34,47],[-55,-24,43],[-46,-14,38],[-38,-6,32],
    [-30,1,26],[-22,8,20],[-14,13,14],[-5,16,9],[4,16,5],[10,14,2]
  ];
  const trailSample = (x,z) => {
    let best=Infinity,height=0;
    for(let i=0;i<TRAIL.length-1;i++){
      const a=TRAIL[i],b=TRAIL[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len2=dx*dx+dz*dz;
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/Math.max(1e-6,len2)));
      const px=a[0]+dx*t,pz=a[1]+dz*t,d=Math.hypot(x-px,z-pz);
      if(d<best){best=d;height=a[2]+(b[2]-a[2])*t;}
    }
    return { distance:best,height };
  };
  const buildHouse = (parent, spec) => {
    const root=createNode({ position:{x:spec.x,y:spec.y||0,z:spec.z}, rotation:{x:0,y:spec.r||0,z:0} }); addChild(parent,root);
    const w=spec.w||7,d=spec.d||6,h=spec.h||5;
    block(root,spec.wall||"#f4f1e9",0,h/2,0,w,h,d);
    block(root,"#e3ddd2",0,h+0.2,0,w+0.35,0.35,d+0.35);
    const door=block(root,spec.door||"#2865a3",0,1.35,d/2+0.04,1.35,2.7,0.14);
    for(const sx of [-1,1]) block(root,spec.trim||"#2f6dad",sx*(w*0.28),h*0.58,d/2+0.05,1.15,1.25,0.14);
    const labelColor=spec.labelColor||C.yellow, plaqueColor=spec.plaqueColor||"#315f8e";
    block(root,plaqueColor,0,h-0.85,d/2+0.11,Math.max(3.3,Math.min(w-0.6,(spec.label||"VACANT").length*0.33)),0.65,0.16);
    const label=sign(root,spec.label||"VACANT",0,h-1.02,d/2+0.22,spec.labelScale||0.42,labelColor);
    return { id:spec.id,label:spec.label||"VACANT",root,door,sign:label,occupied:!!spec.occupied,interior:spec.interior||null };
  };
  const build = () => {
    const root=createNode(), falls=[], spray=[], foam=[], houses=[];
    const water=createNode({ geometry:disc(V2.oceanRadius,0.35,"#2b89c4"), position:{x:0,y:-0.82,z:0} }); addChild(root,water);
    const terrain=createNode({ geometry:disc(V2.radius,2.4,"#8b765d") }); addChild(root,terrain);
    const turtle=createNode(); addChild(root,turtle);

    // Broad sandy shelves define the inhabited two-thirds of the island.
    for(let i=0;i<64;i++){
      const a=-2.35+i*(4.7/63), r=V2.radius-3+(i%3)*0.65;
      const beach=block(root,i%2?"#e8d4a6":"#f3dfb3",Math.sin(a)*r,-0.18,Math.cos(a)*r,7.5,0.3,5.2);
      beach.rotation.y=a;
      if(i%2===0){
        const strip=block(root,"#bfeaf1",Math.sin(a)*(r+3.2),-0.48,Math.cos(a)*(r+3.2),5.5,0.06,0.22,0.18);
        strip.rotation.y=a; foam.push(strip);
      }
    }

    // Olympus occupies the wild north-western third: broad mass, stepped shoulders and summit crown.
    const ox=-52,oz=-42;
    const tiers=[
      [0,5,0,66,10,58,"#655f59"],[-2,13,-3,55,8,48,"#746d65"],[1,20,-5,46,7,39,"#81786e"],
      [2,27,-7,36,7,31,"#908478"],[1,34,-7,27,7,23,"#9f9284"],[0,40,-7,19,6,16,"#aea08f"],[0,46,-7,12,5,10,"#bcae9a"]
    ];
    for(const [dx,y,dz,w,h,d,color] of tiers) block(root,color,ox+dx,y,oz+dz,w,h,d);

    // Summit Portara frame around the actual Ooga Portal destination.
    const px=V2.summit.x,py=V2.summit.y,pz=V2.summit.z;
    block(root,"#f2ede4",px-4.3,py+4.2,pz,1.35,9.5,1.7);
    block(root,"#f2ede4",px+4.3,py+4.2,pz,1.35,9.5,1.7);
    block(root,"#faf6ef",px,py+8.7,pz,10,1.25,1.7);
    block(root,"#d7c5a5",px,py-0.35,pz,12,0.7,6.5);
    sign(root,"PORTARA",px,py+10.6,pz+0.9,0.72,"#f5d676");

    // Switchback trail is intentionally long: distinct overlooks, ruins and olive foothills.
    for(let i=0;i<TRAIL.length-1;i++){
      const a=TRAIL[i],b=TRAIL[i+1],distance=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(4,Math.ceil(distance/0.75));
      for(let j=0;j<=steps;j++){
        const t=j/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=a[2]+(b[2]-a[2])*t;
        block(root,j%4?"#cdbd9f":"#e1d0ae",x,y-0.12,z,4.8,0.24,0.9);
      }
    }
    for(const [x,y,z] of [[-60,41,-21],[-38,29,-7],[-26,21,5],[-13,12,14]]){
      block(root,"#e6dfd2",x,y,z,8,0.6,5);
      for(const sx of [-1,1]) block(root,"#f5f0e7",x+sx*2.5,y+2.2,z,0.55,4.4,0.55);
      block(root,"#ded1bb",x,y+4.35,z,6.5,0.5,2.2);
    }
    for(const [x,y,z] of [[-44,33,-9],[-35,27,2],[-27,20,11],[-18,14,18],[-9,9,22]]){
      block(root,"#5e4b34",x,y+1,z,0.45,2,0.45);
      block(root,"#597d3b",x,y+2.4,z,2.6,1.8,2.2);
    }

    // Chora: dense, irregular Cycladic lanes rather than a grid.
    const occupied=[
      {id:"meme-factory",label:"Meme Factory House",x:-2,z:28,w:10,d:7,h:6.5,occupied:true,interior:"meme-factory",labelScale:0.34},
      {id:"dsb-studio",label:"DSB Studio Stage",x:18,z:27,w:10,d:7,h:7,occupied:true,interior:"dsb-studio",labelScale:0.37},
      {id:"maxis",label:"Maxis Club Theater",x:34,z:17,w:10,d:7,h:6.5,occupied:true,labelScale:0.34},
      {id:"without-rulers",label:"Without Rulers Shop",x:30,z:38,w:10,d:7,h:6,occupied:true,labelScale:0.32},
      {id:"big-bitcoin",label:"Big Bitcoin",x:8,z:47,w:11,d:8,h:7,occupied:true,plaqueColor:"#c42026",labelColor:"#ffffff",labelScale:0.48},
      {id:"stackchain",label:"Stackchain Magazine",x:-13,z:44,w:10,d:7,h:6,occupied:true,labelScale:0.32},
      {id:"proof-ink",label:"Proof Of Ink",x:-22,z:31,w:9,d:7,h:6,occupied:true,labelScale:0.42}
    ];
    for(const spec of occupied) houses.push(buildHouse(root,spec));
    const vacant=[
      [-31,21,8,6,5.5],[-16,17,8,6,6],[1,15,8,7,6],[19,13,9,7,6],[42,31,8,6,6],
      [-31,46,8,7,6],[-12,57,9,7,6],[8,62,8,6,6],[28,57,9,7,6],[45,49,8,6,6],
      [-3,6,8,6,5.5],[15,4,8,6,6],[34,3,8,6,6],[-29,8,8,6,6]
    ];
    vacant.forEach((v,i)=>houses.push(buildHouse(root,{id:"vacant-"+(i+1),label:"VACANT",x:v[0],z:v[1],w:v[2],d:v[3],h:v[4],labelScale:0.42})));

    // White stone lanes and small squares connect clusters but leave deliberate maze-like gaps.
    for(const [x,z,w,d,r] of [[2,36,64,4,0],[16,22,4,42,0],[-12,43,4,40,0],[27,50,38,4,0],[2,11,54,4,0]]){
      const lane=block(root,"#d7d1c6",x,0.08,z,w,0.16,d); lane.rotation.y=r;
    }
    for(const [x,z] of [[3,34],[22,43],[-15,26]]) block(root,"#c7c1b7",x,0.1,z,13,0.2,11);

    // BIG BITCOIN's phrase belongs to its immediate side alley.
    block(root,"#f1eee7",14,2.0,48.9,12,4,0.3);
    sign(root,"Compliance Is Defiance",14,2.55,49.1,0.38,"#b51f2d");

    // Waterfront taverna / beach-bar and Noderunner TV gathering spot.
    const tv=createNode({ position:{x:30,y:0,z:77}, rotation:{x:0,y:Math.PI,z:0} }); addChild(root,tv);
    block(tv,"#f3efe7",0,2.4,0,14,4.8,8);
    block(tv,"#2b6599",0,4.9,0,14.5,0.45,8.5);
    sign(tv,"Noderunner Taverna",0,4.0,4.1,0.5,"#4fb7d5");
    block(tv,"#78543b",0,2.6,4.15,6.5,3.8,0.45);
    const tvScreen=createNode({ position:{x:0,y:2.7,z:4.42} }); addChild(tv,tvScreen);
    for(const x of [-5,-2.5,2.5,5]) { block(root,"#e7ddc8",30+x,0.45,84,1.6,0.8,1.6); block(root,"#386ea0",30+x,1.25,84,0.12,1.7,0.12); }

    // Meme Factory House doubles as the existing shop interaction until interiors land.
    const meme=houses.find(h=>h.id==="meme-factory");
    const shop=meme.root;

    // DSB Studio Stage remains an exterior placeholder node for existing comedy hooks.
    const studio=houses.find(h=>h.id==="dsb-studio");
    const stage=studio.root;
    const mic=block(stage,"#b7b9c6",0,1.5,4.2,0.18,3,0.18);

    // Harbor and future free-sail catamaran berth.
    const dock=block(root,"#8b7047",V2.harbor.x,0.05,V2.harbor.z,7,0.3,25);
    sign(root,"HARBOR",V2.harbor.x,3.4,V2.harbor.z-10,0.8,"#f2d66e");
    const boats=[boat(),boat(),boat()]; boats.forEach((b,i)=>{ b.position.x=V2.harbor.x-6+i*6; b.position.y=-0.15; b.position.z=V2.harbor.z+8; addChild(root,b); });

    // Compact Bitcoin ride station lives inland near Olympus, never around the perimeter.
    const station=createNode({ position:{x:V2.station.x,y:0,z:V2.station.z} }); addChild(root,station);
    block(station,"#342942",0,1,0,8,2,6); sign(station,"Bitcoin Ride",0,3.1,3.2,0.62).rotation.y=Math.PI;
    const carts=[coasterCar(),coasterCar(),coasterCar()]; carts.forEach(add=>addChild(root,add)); const cart=carts[0];

    // Low-cost distant foam movement and mountain water accents.
    for(const [x,y,z,h] of [[-66,30,-20,12],[-43,24,-1,10]]){
      const fall=block(root,"#58c4e7",x,y,z,1.3,h,0.25,0.18); falls.push(fall);
      spray.push(block(root,"#a0e8ef",x,y-h*0.5,z+0.3,0.4,1.4,0.4,0.25));
    }

    const groundAt=(x,z)=>{
      const sample=trailSample(x,z);
      if(sample.distance<=3.5) return sample.height;
      return 0;
    };
    const trailAt=(x,z,radius=0)=>trailSample(x,z).distance<=Math.max(1.2,3.6-radius*0.25);
    const updateEnvironment=(time)=>{
      water.position.y=-0.82+Math.sin(time*0.45)*0.035;
      for(let i=0;i<foam.length;i++){ const w=Math.sin(time*0.95+i*0.51); foam[i].position.y=-0.47+w*0.035; foam[i].glow=0.12+(w+1)*0.04; }
    };
    const stars=[];
    return {
      landmarks:{ shop:landmark(shop,6,5), tv:landmark(tv,8,6) },
      root, terrain, turtle, water, foam, falls, spray, stage, mic, shop, tv, tvScreen, dock, boats, cart, carts, stars, station,
      houses, groundAt, trailAt, updateEnvironment, v2:V2
    };
  };
  BL.dsbModels = { C, cube, block, text, sign, boat, build };
})();
