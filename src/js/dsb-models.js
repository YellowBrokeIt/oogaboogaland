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
  // DSB's Ooga Portal is the Portara itself: a monumental marble doorway around the liquid horizon.
  // This frame is authored in portal-local space. A vertical portal rotates the local Z axis upright.
  const portaraFrame = (parent, radius = 2.2) => {
    // Root is rotated into a vertical portal: local Z becomes world-up.
    const half = radius + 1.2, stone = "#f3eee4", cap = "#fff9ef";
    const bottom = -radius - 0.15, top = radius + 1.55, pillarDepth = top - bottom;
    const center = (bottom + top) * 0.5;
    block(parent, stone, -half, 0, center, 1.15, 1.35, pillarDepth);
    block(parent, stone,  half, 0, center, 1.15, 1.35, pillarDepth);
    block(parent, cap, 0, 0, top + 0.15, half * 2 + 1.25, 1.45, 1.0);
    block(parent, "#d8c7aa", 0, 0, bottom - 0.15, half * 2 + 2.0, 1.55, 0.45);
    block(parent, "#dfd2bd", -half, 0, bottom + 0.2, 1.55, 1.55, 0.5);
    block(parent, "#dfd2bd",  half, 0, bottom + 0.2, 1.55, 1.55, 0.5);
  };
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
    radius: 126,
    oceanRadius: 460,
    summit: { x: -52, y: 52, z: -48 },
    chora: { x: 24, z: 20 },
    harbor: { x: -24, z: 108 },
    station: { x: -34, z: -20 }
  };
  const TRAIL = [
    // Wrap around Olympus, then finish clearly on the open plain at the mountain's far-right side.
    [-52,-42,50],[-63,-38,48],[-72,-31,46],[-76,-21,43],[-72,-11,40],
    [-64,-2,37],[-53,3,34],[-42,3,31],[-31,-1,28],[-21,-7,24],
    [-10,-11,20],[1,-12,16],[11,-10,12],[20,-8,8],[28,-6,4],[34,-4,2]
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
    const seed=[...String(spec.id||"house")].reduce((a,c)=>a+c.charCodeAt(0),0);
    const accent=spec.door||["#2865a3","#3176b6","#2776a0","#2d8291"][seed%4];
    const wall=spec.wall||["#f4f1e9","#fbf7ef","#eee9df"][seed%3];

    // Cycladic massing: a main white volume plus occasional offset upper room / roof terrace.
    block(root,wall,0,h/2,0,w,h,d);
    block(root,"#e3ddd2",0,h+0.2,0,w+0.35,0.35,d+0.35);
    if(seed%3!==0){
      const uw=w*(seed%2?0.56:0.66), ud=d*0.58, ux=(seed%2?1:-1)*w*0.16;
      block(root,wall,ux,h+1.5,-d*0.12,uw,2.7,ud);
      block(root,"#e8e1d6",ux,h+2.95,-d*0.12,uw+0.25,0.28,ud+0.25);
      block(root,accent,ux,h+1.55,ud*0.29-d*0.12,0.9,1.0,0.12);
    }

    // Door and shutters always live on local +Z, so the authored house rotation determines which road/beach they face.
    const door=block(root,accent,0,1.35,d/2+0.04,1.35,2.7,0.14);
    for(const sx of [-1,1]){
      block(root,accent,sx*(w*0.28),h*0.58,d/2+0.05,1.15,1.25,0.14);
      block(root,"#f7f2e9",sx*(w*0.28),h*0.58,d/2+0.13,0.12,1.35,0.08);
    }

    // Small balcony / landing on some homes, with chunky blue railings.
    if(seed%4!==1){
      block(root,"#d8d0c3",0,h*0.62,d/2+0.58,Math.min(w*0.62,5.2),0.28,1.1);
      for(const x of [-1.8,-0.9,0,0.9,1.8]) if(Math.abs(x)<w*0.34) block(root,accent,x,h*0.62+0.62,d/2+1.02,0.09,1.25,0.09);
      block(root,accent,0,h*0.62+1.22,d/2+1.02,Math.min(w*0.62,5.2),0.09,0.09);
    }

    // Exterior stairs are a defining Cycladic feature; alternate side to keep alleys irregular.
    if(seed%2===0){
      const side=seed%4===0?-1:1;
      for(let i=0;i<6;i++) block(root,"#e7e0d5",side*(w/2+0.58),0.22+i*0.42,-d*0.22+i*0.52,1.15,0.42,1.0);
      block(root,accent,side*(w/2+1.15),1.55,0.48,0.09,3.0,3.4);
    }

    const labelColor=spec.labelColor||C.yellow, plaqueColor=spec.plaqueColor||"#315f8e";
    block(root,plaqueColor,0,h-0.85,d/2+0.11,Math.max(3.3,Math.min(w-0.6,(spec.label||"VACANT").length*0.33)),0.65,0.16);
    const label=sign(root,spec.label||"VACANT",0,h-1.02,d/2+0.22,spec.labelScale||0.42,labelColor);

    // Pots and bougainvillea keep the streets from reading as anonymous white boxes.
    for(const px of [-w*0.34,w*0.34]){
      block(root,"#b8754b",px,0.28,d/2+0.55,0.5,0.55,0.5);
      block(root,"#568744",px,0.82,d/2+0.55,0.7,0.75,0.65);
    }
    if(seed%3===1){
      const bx=(seed%2?1:-1)*(w/2-0.6);
      block(root,"#70513a",bx,2.2,d/2+0.12,0.22,4.2,0.22);
      for(const [dx,dy] of [[0,0],[0.5,0.5],[-0.4,1.0],[0.3,1.5],[-0.2,2.0]])
        block(root,(seed%2?"#c8438f":"#d84d72"),bx+dx,1.3+dy,d/2+0.28,0.8,0.8,0.5);
    }
    return { id:spec.id,label:spec.label||"VACANT",root,door,sign:label,occupied:!!spec.occupied,interior:spec.interior||null };
  };
  const buildMemeFactoryInterior = () => {
    // Interiors are separate scene chunks. They are never rendered behind the exterior shell.
    const root=createNode({ visible:false });

    // Cycladic room shell: stone floor, white walls, blue trim, timber ceiling slats.
    block(root,"#575350",0,-0.08,0,19,0.16,15);
    for(let x=-8;x<=8;x+=2) block(root,"#e8e1d8",x,0.03,0,0.08,0.04,15);
    for(let z=-6;z<=6;z+=2) block(root,"#e8e1d8",0,0.04,z,19,0.04,0.08);
    block(root,"#f6f1e8",-9.4,3.5,0,0.55,7,15);
    block(root,"#f6f1e8", 9.4,3.5,0,0.55,7,15);
    block(root,"#f6f1e8",0,3.5,-7.3,19,7,0.55);
    // Front wall leaves a doorway opening at +Z.
    block(root,"#f6f1e8",-5.4,3.5,7.3,8,7,0.55);
    block(root,"#f6f1e8", 5.4,3.5,7.3,8,7,0.55);
    block(root,"#f6f1e8",0,6.05,7.3,3,1.9,0.55);
    for(let x=-8.4;x<=8.4;x+=1.4) block(root,"#8a6646",x,6.85,0,0.18,0.18,14.4);

    // Exit door / threshold.
    const exitDoor=createNode({ position:{x:0,y:0,z:6.95} }); addChild(root,exitDoor);
    block(exitDoor,"#2d6fa8",0,1.5,0,2.2,3,0.2);
    sign(root,"EXIT",0,4.1,7.0,0.48,"#59b9df");

    // Meme counter and shop interaction point.
    const counter=createNode({ position:{x:0,y:0,z:-3.6} }); addChild(root,counter);
    block(counter,"#8a6646",0,1.05,0,9.5,2.1,2.2);
    block(counter,"#f0d99b",0,2.18,0,10,0.2,2.5);
    sign(root,"MEME FACTORY",0,4.7,-7.0,0.72,C.yellow);

    // Merchandise / silly production line.
    for(const x of [-6.5,-3.2,3.2,6.5]){
      block(root,"#315f8e",x,2.3,-6.85,2.1,2.6,0.18);
      block(root,x<0?"#f2c84b":"#ef4f64",x,2.3,-6.7,1.3,1.45,0.12,0.25);
    }
    for(let i=0;i<5;i++){
      const x=-5+i*2.5;
      block(root,"#7f6042",x,0.5,1.5,1.7,1,1.5);
      if(i%2===0){
        const banana=BL.models.banana(); banana.position.x=x; banana.position.y=1.25; banana.position.z=1.5; addChild(root,banana);
      } else block(root,"#ef4256",x,1.2,1.5,0.7,0.7,0.7);
    }

    // Side wall frames make this feel like a meme gallery rather than another empty shop.
    const captions=["STACK","HODL","OOGA","21M"];
    for(let i=0;i<captions.length;i++){
      const z=-4.8+i*2.8;
      block(root,i%2?"#c7e3ee":"#f2d79a",-9.05,2.8,z,0.18,2.7,2.3);
      const caption=sign(root,captions[i],-8.92,2.45,z,0.34,i%2?"#2865a3":"#8f5a2c");
      caption.rotation.y=Math.PI/2;
    }

    // Lounge corner.
    block(root,"#386ea0",6.8,0.65,3.8,3.6,1.25,1.5);
    block(root,"#e8ddc7",6.8,0.62,1.8,2.2,0.18,2.2);
    block(root,"#b8754b",8.0,0.35,5.4,0.65,0.7,0.65);
    block(root,"#568744",8.0,1.1,5.4,1.2,1.4,1.2);

    return {
      id:"meme-factory",
      root,
      exitDoor,
      counter,
      spawn:{x:0,y:0,z:5.1},
      exit:{x:0,y:0,z:6.1},
      counterAt:{x:0,y:0,z:-2.2},
      bounds:{minX:-8.7,maxX:8.7,minZ:-6.6,maxZ:6.5}
    };
  };

  const build = () => {
    const root=createNode(), falls=[], spray=[], foam=[], houses=[];
    const memeInterior=buildMemeFactoryInterior();
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
      // Inland properties face their local lanes rather than the sea.
      {id:"meme-factory",label:"Meme Factory House",x:18,z:48,w:10,d:7,h:6.5,r:Math.PI/2,occupied:true,interior:"meme-factory",labelScale:0.34},
      {id:"dsb-studio",label:"DSB Studio Stage",x:39,z:47,w:10,d:7,h:7,r:-Math.PI/2,occupied:true,interior:"dsb-studio",labelScale:0.37},
      {id:"maxis",label:"Maxis Club Theater",x:55,z:36,w:10,d:7,h:6.5,r:Math.PI,occupied:true,labelScale:0.34},
      {id:"without-rulers",label:"Without Rulers Shop",x:51,z:61,w:10,d:7,h:6,r:Math.PI/2,occupied:true,labelScale:0.32},
      {id:"big-bitcoin",label:"Big Bitcoin",x:29,z:70,w:11,d:8,h:7,r:Math.PI,occupied:true,plaqueColor:"#c42026",labelColor:"#ffffff",labelScale:0.48},
      {id:"stackchain",label:"Stackchain Magazine",x:8,z:66,w:10,d:7,h:6,r:-Math.PI/2,occupied:true,labelScale:0.32},
      {id:"proof-ink",label:"Proof Of Ink",x:0,z:53,w:9,d:7,h:6,r:0,occupied:true,labelScale:0.42}
    ];
    for(const spec of occupied) houses.push(buildHouse(root,spec));
    // Named properties get recognizable silhouettes/accents without changing the shared addressable-house system.
    const named = Object.fromEntries(houses.filter(h=>h.occupied).map(h=>[h.id,h]));
    if(named["big-bitcoin"]){
      block(named["big-bitcoin"].root,"#c42026",0,6.55,4.15,8.5,0.65,0.28);
      sign(named["big-bitcoin"].root,"BIG BITCOIN",0,6.32,4.34,0.58,"#ffffff");
    }
    if(named["proof-ink"]){
      block(named["proof-ink"].root,"#20252d",0,0.55,4.0,4.2,1.1,0.4);
      block(named["proof-ink"].root,"#8d5a32",0,1.45,4.05,2.8,0.16,0.8);
    }
    if(named["stackchain"]){
      for(let i=0;i<4;i++) block(named["stackchain"].root,i%2?"#f0d9a2":"#c9e2ea",-2.6+i*1.7,1.0,3.9,1.2,1.45,0.18);
    }

    const vacant=[
      // Inland homes: doors face the internal street network.
      [3,37,8,6,5.5,Math.PI/2],[17,35,8,6,6,0],[32,32,8,7,6,Math.PI],[48,29,9,7,6,Math.PI],
      [64,49,8,6,6,-Math.PI/2],[2,71,8,7,6,Math.PI/2],[18,82,9,7,6,Math.PI],[37,84,8,6,6,Math.PI],
      [56,80,9,7,6,Math.PI],[70,69,8,6,6,-Math.PI/2],[17,22,8,6,5.5,0],[34,19,8,6,6,0],
      [52,18,8,6,6,Math.PI],[3,24,8,6,6,Math.PI/2],[69,32,8,6,6,-Math.PI/2],[75,58,8,6,6,-Math.PI/2],
      // Seafront homes: doors face the beach (+Z) and sit directly on the promenade.
      [4,94,9,7,6,0],[20,96,9,7,6,0],[36,95,9,7,6,0],[52,93,9,7,6,0],[68,90,9,7,6,0],[80,86,9,7,6,0]
    ];
    vacant.forEach((v,i)=>houses.push(buildHouse(root,{id:"vacant-"+(i+1),label:"VACANT",x:v[0],z:v[1],w:v[2],d:v[3],h:v[4],r:v[5],labelScale:0.42})));

    // Trail exit clearing: separated from both Olympus and Chora, at the requested right-side plain.
    block(root,"#8f8a66",36,0.12,-2,30,0.24,22);
    for(const [x,z] of [[27,-10],[30,2],[41,-9],[47,2]]){
      block(root,"#5e4b34",x,1,z,0.45,2,0.45);
      block(root,"#617f3e",x,2.4,z,2.8,1.9,2.4);
    }
    block(root,"#8d6d43",39,1.7,-2,0.45,3.4,0.45);
    block(root,"#8d6d43",43,2.4,-2,8,0.35,0.7);
    sign(root,"CHORA",43,2.72,-1.6,0.62,"#f3e3a0");

    // Chora lanes: dark island-stone paving with pale joints, tighter and more irregular than the open island roads.
    const townLanes=[[28,54,82,4],[30,42,4,52],[8,62,4,46],[47,72,56,4],[30,28,76,4],[60,48,4,46],[16,79,46,4]];
    for(const [x,z,w,d] of townLanes){
      block(root,"#565453",x,0.075,z,w,0.15,d);
      const along=w>d;
      const span=along?w:d;
      for(let q=-span/2+2;q<span/2;q+=4.2){
        block(root,"#e7e2d8",x+(along?q:0),0.16,z+(along?0:q),along?0.16:w,0.035,along?d:0.16);
      }
    }
    // Small courtyards / piazzette break the maze and give sight-lines back to the sea.
    for(const [x,z] of [[22,53],[44,63],[9,44],[58,38],[29,77]]){
      block(root,"#686561",x,0.09,z,13,0.18,11);
      for(const q of [-4,0,4]) block(root,"#e9e3d8",x+q,0.19,z,0.14,0.04,11);
    }

    // Agora: an open civic/commercial square within Chora, with reused marble and a little fountain.
    block(root,"#625f5b",39,0.11,58,22,0.22,18);
    for(const x of [30,34,38,42,46,48]) block(root,"#e8e1d4",x,0.24,58,0.14,0.05,18);
    block(root,"#d9cfbe",39,0.55,58,7.5,1.1,7.5);
    block(root,"#49a8c8",39,1.12,58,5.5,0.12,5.5,0.25);
    block(root,"#eee7dc",39,2.0,58,0.7,2.6,0.7);
    for(const x of [31,47]) {
      block(root,"#ece5da",x,1.8,66,0.65,3.6,0.65);
      block(root,"#ddd2c1",x,3.7,66,1.6,0.28,1.6);
    }
    sign(root,"AGORA",39,3.05,50.5,0.55,"#f2d88d");

    // Street life: cypress/olive shapes, pots, benches and splashes of bougainvillea.
    for(const [x,z,t] of [[13,47,0],[24,42,1],[34,50,0],[49,54,1],[61,61,0],[17,70,1],[41,75,0],[67,76,1]]){
      block(root,t?"#64472f":"#5c4932",x,1.15,z,0.45,2.3,0.45);
      block(root,t?"#54763c":"#426b45",x,3.05,z,t?2.8:1.8,t?2.2:3.6,t?2.4:1.8);
      if(t) block(root,"#708d48",x+0.8,3.1,z-0.3,1.6,1.4,1.5);
    }
    for(const [x,z] of [[5,58],[18,61],[32,68],[55,43],[64,67],[74,52]]){
      block(root,"#b8754b",x,0.32,z,0.65,0.64,0.65);
      block(root,"#c7438f",x,1.05,z,1.2,1.1,1.0);
    }
    // Seafront road: harbor/Noderunner are isolated at the left, road then meets Chora's beach-facing row.
    const shoreRoad=[
      [-24,96],[-14,96],[-4,96],[6,95],[18,94],[30,93],[44,92],[58,90],[72,87],[86,84]
    ];
    for(let i=0;i<shoreRoad.length-1;i++){
      const a=shoreRoad[i], b=shoreRoad[i+1], dx=b[0]-a[0], dz=b[1]-a[1], n=Math.max(2,Math.ceil(Math.hypot(dx,dz)/3));
      for(let j=0;j<n;j++){
        const t=(j+0.5)/n, x=a[0]+dx*t, z=a[1]+dz*t;
        const road=block(root,(i+j)%2?"#cfc8bb":"#ddd6c9",x,0.09,z,4.8,0.18,3.2);
        road.rotation.y=Math.atan2(dx,dz);
      }
    }

    // BIG BITCOIN's phrase belongs to its immediate side alley.
    block(root,"#f1eee7",35,2.0,75.2,13,4,0.3);
    sign(root,"Compliance Is Defiance",35,2.55,75.4,0.38,"#b51f2d");

    // Waterfront taverna / beach-bar and Noderunner TV gathering spot.
    const tv=createNode({ position:{x:-11,y:0,z:96}, rotation:{x:0,y:0,z:0} }); addChild(root,tv);
    block(tv,"#f7f3eb",0,2.4,0,14,4.8,8);
    block(tv,"#2b6599",0,4.9,0,14.5,0.45,8.5);
    sign(tv,"Noderunner Taverna",0,4.0,4.1,0.5,"#4fb7d5");
    block(tv,"#78543b",0,2.6,4.15,6.5,3.8,0.45);
    const tvScreen=createNode({ position:{x:0,y:2.7,z:4.42} }); addChild(tv,tvScreen);
    // Blue pergola facing the water.
    for(const x of [-6,-2,2,6]) block(root,"#2f6fa5",-11+x,2.1,104,0.18,4.2,0.18);
    for(let z=100;z<=108;z+=1.6) block(root,"#7e5c3c",-11,4.15,z,14,0.16,0.16);
    for(const x of [-5,-2.5,2.5,5]) {
      block(root,"#e7ddc8",-11+x,0.45,104,1.6,0.8,1.6);
      block(root,"#386ea0",-11+x,1.25,104,0.12,1.7,0.12);
      block(root,"#386ea0",-11+x+0.65,0.65,104.8,0.9,0.12,0.9);
    }
    // Vine/bougainvillea canopy at one end of the pergola.
    for(const [x,y,z] of [[-17,3.8,101],[-16,4.2,102],[-15,4.35,103],[-14,4.25,104],[-13,4.1,105]]){
      block(root,"#5c7f3d",x,y,z,1.4,0.7,1.2);
      block(root,"#cb438b",x+0.25,y+0.3,z,0.75,0.6,0.65);
    }

    // Meme Factory House doubles as the existing shop interaction until interiors land.
    const meme=houses.find(h=>h.id==="meme-factory");
    const shop=meme.root;

    // DSB Studio Stage remains an exterior placeholder node for existing comedy hooks.
    const studio=houses.find(h=>h.id==="dsb-studio");
    const stage=studio.root;
    const mic=block(stage,"#b7b9c6",0,1.5,4.2,0.18,3,0.18);

    // Harbor district occupies its own left-side waterfront zone; Chora stays clear to the right.
    block(root,"#d2cabd",V2.harbor.x,0.1,V2.harbor.z-13,22,0.2,12);
    const dock=block(root,"#8b7047",V2.harbor.x,0.05,V2.harbor.z,8,0.3,30);
    for(const x of [V2.harbor.x-6,V2.harbor.x+6]) block(root,"#8b7047",x,0.03,V2.harbor.z+9,3.4,0.26,13);
    sign(root,"HARBOR",V2.harbor.x,3.4,V2.harbor.z-17,0.8,"#f2d66e");
    const boats=[boat(),boat(),boat()]; boats.forEach((b,i)=>{ b.position.x=V2.harbor.x-6+i*6; b.position.y=-0.15; b.position.z=V2.harbor.z+12; addChild(root,b); });

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
      houses, interiors:{ memeFactory:memeInterior }, groundAt, trailAt, updateEnvironment, v2:V2
    };
  };
  BL.dsbModels = { C, cube, block, text, sign, portaraFrame, boat, build };
})();
