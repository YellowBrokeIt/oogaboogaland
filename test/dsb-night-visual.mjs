// DSB Land evening lighting: real Chrome desktop/mobile snapshots, review only.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, dispose } from "./browser.mjs";

const folder=resolve("untracked/dsb-night-lighting-review");
mkdirSync(folder,{recursive:true});
const source=pathToFileURL(resolve("oogaboogaland.html")).href;
const views=["coastal-chora","coastal-beach","coastal-harbor"];
const url=hour=>source+"?scene=dsb&debug=1&hour="+hour+"&view=coastal-chora&nosim=1";
const ready=async(browser,label)=>{
  let state=null;
  for(let i=0;i<80;i++){
    state=await browser.evaluate('(() => ({dsb:!!window.__ooga?.dsb?.land,atm:!!window.__ooga?.dsb?.atmosphere,pilot:!!window.__ooga?.pilot,graphics:window.__ooga?.renderer?.kind||null,page:document.readyState}))()').catch(error=>({error:String(error)}));
    if(state?.dsb&&state?.atm&&state?.pilot)return state;
    await browser.sleep(750);
  }
  throw Error(label+" never reached DSB: "+JSON.stringify(state)+" logs="+browser.logs.slice(-8).join(" | "));
};
const cleanHUD=browser=>browser.evaluate('(() => {for(const id of ["sheet","position-debug"])document.getElementById(id)?.style.setProperty("display","none","important");})()');
const picture=async(browser,label,view,hour)=>{
  const state=await browser.evaluate('(() => {const d=window.__ooga.dsb,atm=d.atmosphere;const go=window.__ooga.pilot.goPreset('+JSON.stringify(view)+');return {view:'+JSON.stringify(view)+',go:go===false?false:true,accentCount:atm.nightlifeAccents,doorCount:atm.doors,lightCount:window.__ooga.renderOpts?.lightCount,lampFactor:window.__ooga.renderOpts?.lampFactor,sunAltitude:window.__ooga.renderOpts?.sunAltitude,canvas:!!document.getElementById("scene")};})()');
  assert.ok(state.go!==false,label+" "+view+" failed camera preset");
  assert.ok(state.accentCount>=7,label+" "+view+" missing accents: "+JSON.stringify(state));
  assert.ok(state.canvas,label+" missing scene canvas");
  await browser.sleep(1250);
  const path=resolve(folder,label+"-"+view+"-"+hour+".png");
  await browser.screenshot(path);
  const bytes=readFileSync(path);
  assert.ok(bytes.byteLength>4000,label+" empty screenshot");
  assert.equal(bytes.toString("hex",0,8),"89504e470d0a1a0a");
  console.log("DSB NIGHT REVIEW "+JSON.stringify({label,hour,...state,bytes:bytes.length,path}));
};
async function session(label,w,h,mobile,hour,which){
  const browser=await launch({w,h,mobile,startupMs:60000});
  try{
    await browser.open(url(hour));await ready(browser,label);
    await cleanHUD(browser);
    for(const view of which)await picture(browser,label,view,hour);
    const fatal=browser.logs.filter(x=>/\[exception\]|Shader|WebGL compile|ReferenceError|TypeError|SyntaxError/.test(x));
    assert.equal(fatal.length,0,label+" JS/WebGL failures: "+fatal.slice(-6).join(" | "));
  }finally{await browser.close(true);}
}
try{
  await session("desktop-night",1280,720,false,22,views);
  await session("mobile-night",390,844,true,22,views);
  await session("desktop-day",1280,720,false,13,["coastal-chora"]);
  console.log("Nightlighting visual capture complete.");
}finally{await dispose();}
