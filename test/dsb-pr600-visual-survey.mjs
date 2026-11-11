// Visual-only detached camera survey for current-upstream DSB shoreline PR.
// Uses the REAL built page and pilot.look, not a test renderer or terrain copy.
// Does not alter gameplay or production files.
import assert from "node:assert/strict";
import {mkdirSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {launch,dispose} from "./browser.mjs";

const folder=resolve("shoreline-survey-artifacts");
mkdirSync(folder,{recursive:true});
const url=pathToFileURL(resolve("oogaboogaland.html")).href+"?scene=dsb&debug=1&view=water-rocks";
const viewpoints=[
  {name:"chora-beach-sea-facing",sector:19,targetY:4,pitch:.35,dist:35,allowed:true},
  {name:"harbor-sea-facing",sector:24,targetY:4,pitch:.30,dist:45,allowed:false},
  {name:"olympus-rear-cliff-sea-facing",sector:2,targetY:19,pitch:.22,dist:50,allowed:false}
];

const run=async (browser,label)=>{
  await browser.open(url);
  let ready=false, state;
  for(let k=0;k<85;k++){
    state=await browser.evaluate("({dsb:!!window.__ooga?.dsb?.land,water:!!window.__ooga?.dsb?.water,scene:!!document.querySelector('#scene'),pilot:!!window.__ooga?.pilot})").catch(()=>null);
    if(state?.dsb&&state?.water&&state?.scene&&state?.pilot){ready=true;break;}
    await browser.sleep(1000);
  }
  assert.ok(ready,label+" DSB did not load: "+JSON.stringify(state));
  await browser.evaluate("(()=>{const a=document.getElementById('sheet');if(a)a.style.setProperty('display','none','important');const b=document.getElementById('position-debug');if(b)b.style.setProperty('display','none','important');})()");
  for(const view of viewpoints){
    const code="(()=>{const d=window.__ooga.dsb,coast=d.land.coast,i="+view.sector+";"+
      "const a=coast[i],b=coast[(i+1)%coast.length],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,n={};"+
      "window.BL.dsbCoast.nearest(coast,x,z,n);"+
      "const target={x,y:"+view.targetY+",z},yaw=Math.atan2(n.nx,n.nz);"+
      "window.__ooga.pilot.look({target,yaw,pitch:"+view.pitch+",dist:"+view.dist+"});"+
      "return {allowed:window.BL.dsbCoast.wade(coast,x,z)>0,looking:window.__ooga.pilot.looking,"+
      "target,normal:[n.nx,n.nz],camera:window.__ooga.camera.position,render:window.__ooga.renderer.kind};})()";
    const result=await browser.evaluate(code);
    assert.equal(result.allowed,view.allowed,label+" "+view.name+" coastline mask");
    assert.equal(result.looking,true,label+" "+view.name+" independent camera view");
    await browser.sleep(1400);
    const file=resolve(folder,label+"-"+view.name+".png");
    await browser.screenshot(file);
    const data=readFileSync(file);
    assert.ok(data.length>2000,label+" empty screenshot");
    assert.equal(data.toString("hex",0,8),"89504e470d0a1a0a");
    console.log(label+" "+view.name+" "+JSON.stringify(result)+" screenshot_bytes="+data.length);
  }
  const fatal=browser.logs.filter(line=>/Uncaught|TypeError|ReferenceError|RangeError|SyntaxError|Shader/i.test(line)&&/\[exception\]|\[log.error\]|\[console.error\]/.test(line));
  assert.equal(fatal.length,0,label+" browser exception: "+fatal.slice(0,4).join(" | "));
};

try{
  for(const settings of [{label:"desktop",w:900,h:600,mobile:false},{label:"phone",w:390,h:844,mobile:true}]){
    const browser=await launch(settings);
    try{await run(browser,settings.label);}finally{await browser.close(true);}
  }
  console.log("Sea-facing Chora, harbor and Olympus cliff survey passed on desktop and mobile.");
}finally{await dispose();}
