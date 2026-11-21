// DSB Land's art direction for light and horizon, kept out of the scene file: the Aegean light pass, lanterns at
// the doors, the sea to the horizon with islets and sails on it, and the Portara's marble. Visual only.
(() => {
  "use strict";
  const BL=window.BL,S=BL.scene,M=BL.models;
  // Render options the scene merges in: the sky pass draws its sea past the water tile, and the sky's haze
  // horizon stays at sea level (the hub drops it for an island floating far above the sea).
  const OPTS={sea:-.3,hazeDrop:0};
  const PORTARA={shaftHalf:2.5,footHalf:2.25,footTop:.5,lintelY:6.5};
  const portaraAperture=Object.freeze({width:PORTARA.shaftHalf*2,height:PORTARA.lintelY,footWidth:PORTARA.footHalf*2,footHeight:PORTARA.footTop,inset:.025});
  let golden=0;
  // Runs right after `daylight.sample`. High sun: whiter light and sand bounce, so white walls stay white and
  // shade stays luminous. Low sun: the light holds its strength and rakes gold, and lanterns come on while the
  // sky is still bright. Writes in place; allocates nothing.
  const light=o=>{
    const alt=o.sunAltitude,high=(o.day||0)*(1-(o.twilight||0)),g=o.ground,d=o.direct,k=o.sky;
    g[0]+=(.50-g[0])*high*.75;g[1]+=(.47-g[1])*high*.75;g[2]+=(.42-g[2])*high*.75;
    d[0]+=(.78-d[0])*high*.45;d[1]+=(.74-d[1])*high*.45;d[2]+=(.66-d[2])*high*.45;
    k[0]+=(.48-k[0])*high*.5;k[1]+=(.55-k[1])*high*.5;k[2]+=(.69-k[2])*high*.5;
    const low=Math.max(0,Math.min(1,(alt+1)/4))*Math.max(0,Math.min(1,(16-alt)/8));golden=low;
    d[0]+=(1-d[0])*low*.85;d[1]+=(.66-d[1])*low*.85;d[2]+=(.38-d[2])*low*.85;
    g[0]+=(.46-g[0])*low*.6;g[1]+=(.33-g[1])*low*.6;g[2]+=(.27-g[2])*low*.6;
    o.directStrength=o.directionalLightStrength=Math.max(o.directStrength,low*.92);
    o.shadowStrength=Math.max(o.shadowStrength,low*.85);
    o.lampFactor=o.torch=Math.max(o.lampFactor,1-Math.max(0,Math.min(1,(alt-6)/8)));
    o.bloomStrength+=low*.2;
    // Cool moonlight and a very small bloom lift only after sunset; whites stay white by day.
    const night=Math.max(0,Math.min(1,(4-alt)/12));
    k[2]+=(.52-k[2])*night*.13;g[2]+=(.38-g[2])*night*.12;
    o.bloomStrength+=night*.04;
  };
  // The gate's dressed marble on the quarter-metre grid, so the block shader courses it. Same opening as before.
  const portara=M.cached(()=>{
    const b=(x0,y0,z0,x1,y1,z1,color)=>M.box({w:x1-x0,h:y1-y0,d:z1-z0,color,offset:{x:(x0+x1)/2,y:(y0+y1)/2,z:(z0+z1)/2}});
    const p=PORTARA;
    const g=M.merge(b(-4.25,-1,-1.25,-p.footHalf,p.footTop,1.25,"#d9cfb8"),b(p.footHalf,-1,-1.25,4.25,p.footTop,1.25,"#d9cfb8"),b(-3.75,p.footTop,-.75,-p.shaftHalf,p.lintelY,.75,"#efe7d6"),b(p.shaftHalf,p.footTop,-.75,3.75,p.lintelY,.75,"#efe7d6"),b(-4,p.lintelY,-1,4,8,1,"#f3ecdd"),b(-4.5,8,-1.25,4.5,8.5,1.25,"#e4dac4"));
    g.voxel=new Float32Array([.25,0,0,0]);return g;
  });
  const create=({root,land,renderer})=>{
    const group=S.createNode({sightHidden:true});S.addChild(root,group);
    // The selected nightlife facades are colored, but the town's ordinary doors remain amber.
    // Geometry is shared, has no collision, and is dark during the day.
    const VENUES={"Meme Factory House":"pink","DSB Studio Stage":"cyan","Maxis Club Theater":"violet","Without Rulers Shop":"cyan","Big Bitcoin":"pink","Stackchain Magazine":"violet","Proof Of Ink":"pink"};
    const TONES={pink:[.92,.31,.57],cyan:[.24,.77,.86],violet:[.60,.41,.86]};
    const GEOS={pink:M.box({color:"#f063a8",emissive:.9}),cyan:M.box({color:"#65cfe2",emissive:.9}),violet:M.box({color:"#a68be9",emissive:.9})};
    const doors=[],warm=[],accents=[],glows=[];
    let camera=null,dressed=false,sails=null,focusX=Infinity,focusZ=Infinity;
    const near=(a,b)=>a.dist-b.dist;
    const band=(parent,tone,x,y,z,w,h,d)=>{
      const n=S.createNode({geometry:GEOS[tone],position:{x,y,z},scale:{x:w,y:h,z:d},sightHidden:true,glow:0});
      S.addChild(parent,n);glows.push(n);return n;
    };
    const accent=(x,y,z,tone,range,power)=>accents.push({x,y,z,tone:TONES[tone],range,power,dist:0});
    for(const b of land.buildings){
      const c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=b.x+s*(b.d/2+1.3),y=b.floor+2.5,z=b.z+c*(b.d/2+1.3);
      doors.push(x,y,z);warm.push({x,y,z,dist:0});
      const tone=VENUES[b.name];if(!tone)continue;
      const facade=S.createNode({position:{x:b.x,y:b.floor,z:b.z},rotation:{x:0,y:b.yaw,z:0},sightHidden:true});
      S.addChild(group,facade);
      // A thin fascia near the roof, not an illuminated outline around the whole white house.
      band(facade,tone,0,(b.h||4.5)-.42,b.d/2+.23,Math.min(b.w-.8,4.6),.065,.075);
      if(b.name==="Meme Factory House"||b.name==="DSB Studio Stage")
        band(facade,tone,-b.w/2+.34,2.45,b.d/2+.24,.065,.74,.07);
      accent(x,y+.2,z,tone,8.5,.48);
    }
    if(renderer.kind!=="canvas2d"){
      // The main island's own sea stacks, hazed by the existing fog, and its rafts under sail.
      for(const [deg,r,v] of [[18,470,0],[52,430,1],[97,500,2],[138,450,0],[212,470,1],[262,440,2],[318,490,0]]){
        const a=deg*Math.PI/180;
        S.addChild(group,S.createNode({geometry:BL.dressing.islet(v),position:{x:Math.sin(a)*r,y:-2.3,z:-Math.cos(a)*r},rotation:{x:0,y:deg*.7,z:0},scale:{x:1.2,y:1.2,z:1.2},sightHidden:true}));
      }
      sails=BL.dressing.fleet({sea:-.3,spots:[[150,1.1,3.2],[178,2.2,3.8],[136,3.5,3],[192,4.7,4],[160,5.6,3.4]],seed:11});
      for(const n of sails.nodes)S.addChild(group,n);
    }
    // Dress the actual existing beach pergolas and harbor pier lanterns after the enrichment is built.
    // No new building, planting, collider, pier, or swimming access is introduced.
    const dress=enrichment=>{
      if(dressed)return;dressed=true;
      let beach=0,pier=0,harbor=0;
      for(const p of enrichment.placements){
        if(p.region==="beach"&&p.kind==="pergolaroof"&&beach<2){
          const tone=beach===0?"cyan":"pink";
          band(group,tone,p.x,p.y+2.75,p.z+1.4,3.3,.06,.07);
          accent(p.x-1.3,p.y+2.4,p.z+1.4,tone,10,.34);
          beach++;
        }
        if(p.region==="pier"&&p.kind==="glass"&&pier++%5===0&&harbor<3){
          const tone=harbor===1?"cyan":"violet";
          band(group,tone,p.x,p.y+.19,p.z,.15,.12,.15);
          accent(p.x,p.y+.2,p.z,tone,7,.25);
          harbor++;
        }
      }
      // The beach may have no pergola if every footprint fails terrain clearance.
      if(!beach)accent(27,land.heightAt(27,67)+2.6,67,"cyan",10,.28);
    };
    const setCamera=value=>{camera=value;focusX=Infinity;};
    const refresh=()=>{
      const p=camera?.position,x=p?.x??0,z=p?.z??0;
      if((x-focusX)*(x-focusX)+(z-focusZ)*(z-focusZ)<4)return;
      focusX=x;focusZ=z;
      for(const a of accents)a.dist=(a.x-x)*(a.x-x)+(a.z-z)*(a.z-z);
      for(const a of warm)a.dist=(a.x-x)*(a.x-x)+(a.z-z)*(a.z-z);
      accents.sort(near);warm.sort(near);
    };
    // Preserve the renderer's 32/20/10 light budgets. Reserve a few nearby colored
    // sources and spend the rest on nearby warm doors, never hundreds of dynamic lights.
    const lights=o=>{
      const k=o.lampFactor,a=o.lights;let count=o.lightCount;
      const sun=Number.isFinite(o.sunAltitude)?o.sunAltitude:-12;
      const neon=k*Math.max(0,Math.min(1,(7-sun)/10));
      for(const n of glows)n.glow=neon*.72;
      if(k<=.001){o.lightCount=count;return;}
      refresh();
      const tier=renderer.kind==="canvas2d"?"low":renderer.quality;
      const max=Math.min(BL.glRenderer.POINT_LIGHT_CAPACITY,tier==="low"?10:tier==="medium"?20:32);
      const colored=Math.min(accents.length,tier==="low"?2:tier==="medium"?4:7,Math.max(0,max-count));
      for(let i=0;i<colored;i++){
        const v=accents[i],p=count++*8,b=neon*v.power;
        a[p]=v.x;a[p+1]=v.y;a[p+2]=v.z;a[p+3]=v.range;
        a[p+4]=b*v.tone[0];a[p+5]=b*v.tone[1];a[p+6]=b*v.tone[2];a[p+7]=0;
      }
      for(const v of warm){
        if(count>=max)break;
        const p=count++*8;
        a[p]=v.x;a[p+1]=v.y;a[p+2]=v.z;a[p+3]=9;
        a[p+4]=k*.95;a[p+5]=k*.62;a[p+6]=k*.3;a[p+7]=0;
      }
      o.lightCount=count;
    };
    // After the weather has written its sky: a floor of fair-weather cloud, thicker and
    // with longer sight at golden hour. The darker Olympus rear remains untouched.
    const update=(time,o,outdoors)=>{
      o.clouds=Math.max(o.clouds||0,.36+.2*golden);o.fogNear+=golden*170;o.fogFar+=golden*260;
      if(sails&&outdoors)sails.update(time);
    };
    const dispose=()=>{
      S.removeChild(root,group);while(group.children.length)S.removeChild(group,group.children[group.children.length-1]);
      doors.length=warm.length=accents.length=glows.length=0;camera=sails=null;
    };
    return {group,lights,dress,setCamera,update,dispose,get doors(){return doors.length/3;},get nightlifeAccents(){return accents.length;}};
  };
  BL.dsbAtmosphere={OPTS,light,portara,portaraAperture,create};
})();
