// node --test tests/pid-map.test.cjs
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const dataSource=fs.readFileSync("pid-kobylisy.js","utf8");
const mapSource=fs.readFileSync("stop-map.js","utf8");
const appSource=fs.readFileSync("app.js","utf8");
const ctx={console};
vm.runInNewContext(dataSource+"\nthis.groups=PID_KOBYLISY;",ctx);
const groups=ctx.groups;
test("Skutečný katalog má 14 území a 51 stanovišť PID",()=>{
  assert.equal(groups.length,14);
  assert.equal(groups.reduce((sum,g)=>sum+g.points.length,0),51);
  assert.equal(new Set(groups.map(g=>g.id)).size,14);
  assert.equal(new Set(groups.flatMap(g=>g.points.map(p=>p.id))).size,51);
});
test("Území Kobylisy má skutečné směrové body, včetně dvou metra",()=>{
 const g=groups.find(x=>x.name==="Kobylisy");
 assert.equal(g.points.length,15);
 assert.equal(g.points.filter(x=>x.isMetro).length,2);
 assert.ok(g.points.every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)));
 assert.ok(groups.flatMap(g=>g.points).every(p=>p.captureEnabled===false));
});
test("GeoJSON používá celé území, samostatné platformy a 30m preview",()=>{
 const layers=[],sources=[],events={};
 const map={
  addSource(id,definition){sources.push([id,definition])},
  addLayer(definition){layers.push(definition)},
  on(name,layer,fn){events[layer]=fn},
  getCanvas(){return {style:{}}},
  getSource(){return {getClusterExpansionZoom:async()=>15}},
  easeTo(){}
 };
 const scope={console};
 vm.runInNewContext(mapSource+"\nthis.installStopMap=installStopMap;",scope);
 scope.installStopMap(map,groups,()=>{});
 const byId=Object.fromEntries(sources);
 assert.equal(byId["game-territories"].data.features.length,14);
 assert.equal(byId["game-platforms"].data.features.length,51);
 assert.equal(byId["game-capture-candidates"].data.features.length,51);
 assert.equal(byId["game-territories"].cluster,true);
 assert.ok(layers.find(l=>l.id==="game-platform").minzoom>=16);
 assert.ok(layers.find(l=>l.id==="game-preview-outline").minzoom>=17);
});
test("Zastávky nejsou HTML markery závislé na CSS tlačítek",()=>{
 assert.ok(!appSource.includes('const pins = {}'));
 assert.ok(!appSource.includes('el.style.setProperty("--stop-color"'));
 assert.ok(appSource.includes("installStopMap(map,STOPS"));
});
