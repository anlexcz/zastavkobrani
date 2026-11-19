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
test("GPS oblasti se geometricky sjednotí podle území a zobrazí před platformami",()=>{
 const sources={},layers=[],unions=[];
 const mockTurf={
  circle(center,radius,{units}){
   assert.equal(radius,.03);assert.equal(units,"kilometers");
   return {type:"Feature",geometry:{type:"Polygon",coordinates:[[
     [center[0],center[1]],[center[0]+.0001,center[1]],
     [center[0]+.0001,center[1]+.0001],[center[0],center[1]]
   ]]}};
  },
  featureCollection(features){return {type:"FeatureCollection",features}},
  union(collection){
   unions.push(collection.features.length);
   // Turf vrací jeden sloučený Polygon či MultiPolygon pro celé území.
   return {type:"Feature",geometry:{type:"MultiPolygon",
     coordinates:collection.features.map(f=>[f.geometry.coordinates[0]])}};
  }
 };
 const map={
  addSource(id,def){sources[id]=def},
  addLayer(def){layers.push(def)},
  on(){},
  getCanvas(){return {style:{}}},
  getSource(){return {getClusterExpansionZoom:async()=>15}},
  easeTo(){}
 };
 const scope={console,turf:mockTurf};
 vm.runInNewContext(mapSource+"\nthis.installStopMap=installStopMap;",scope);
 scope.installStopMap(map,groups,()=>{});
 assert.equal(sources["game-territories"].data.features.length,14);
 assert.equal(sources["game-platforms"].data.features.length,51);
 assert.equal(sources["game-territory-areas"].data.features.length,14);
 assert.equal(unions.length,14);
 assert.equal(unions.reduce((n,v)=>n+v,0),51);
 assert.equal(sources["game-territories"].cluster,true);
 assert.ok(!sources["game-capture-candidates"]);
 const area=layers.find(l=>l.id==="game-territory-area-fill");
 const platform=layers.find(l=>l.id==="game-platform");
 assert.ok(area.minzoom<platform.minzoom);
 assert.ok(layers.findIndex(l=>l.id===area.id)<layers.findIndex(l=>l.id===platform.id));
 assert.ok(layers.findIndex(l=>l.id===area.id)<layers.findIndex(l=>l.id==="game-territory"));
 assert.equal(area.minzoom,15.2);
 assert.equal(platform.minzoom,16);
 assert.ok(sources["game-territory-areas"].data.features.every(f=>f.properties.approved===false));
});
test("Zastávky nejsou HTML markery závislé na CSS tlačítek",()=>{
 assert.ok(!appSource.includes('const pins = {}'));
 assert.ok(!appSource.includes('el.style.setProperty("--stop-color"'));
 assert.ok(appSource.includes("installStopMap(map,STOPS"));
});
