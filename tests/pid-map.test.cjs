// Spuštění: node --test tests/pid-map.test.cjs
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const dataSource=fs.readFileSync("pid-prague.js","utf8");
const mapSource=fs.readFileSync("stop-map.js","utf8");
const appSource=fs.readFileSync("app.js","utf8");
const demoSource=fs.readFileSync("demo-world.js","utf8");
const strategicSource=fs.readFileSync("pid-strategic.js","utf8");
const ownerBorderSource=fs.readFileSync("pid-owner-boundaries.js","utf8");
const ctx={};
vm.runInNewContext(dataSource+"\nthis.groups=PID_PRAGUE;",ctx);
const groups=ctx.groups;
vm.runInNewContext(strategicSource+"\nthis.polygons=PID_STRATEGIC_POLYGONS;",ctx);
vm.runInNewContext(ownerBorderSource+"\nthis.borderTopology=PID_OWNER_BOUNDARIES;",ctx);
vm.runInNewContext(demoSource+"\nthis.sim={DEMO_PLAYERS,demoOwner};",ctx);
const players=[{id:"p1",color:"#ef4444"},{id:"p2",color:"#3b82f6"},{id:"p3",color:"#22c55e"}];

function createMock(zoom=10){
 const sources={},layers=[],events={},paint={},layoutVisibility={};
 const map={
  sources,layers,events,paint,layoutVisibility,
  addSource(id,source){sources[id]={...source,setData(d){this.data=d}}},
  getSource(id){return sources[id]},
  addLayer(layer){layers.push(layer)},
  getLayer(id){return layers.find(l=>l.id===id)},
  on(name,layer,handler){(events[name]||=[]).push(typeof handler==="function"?{handler}:{layer,handler})},
  setPaintProperty(id,key,value){paint[id+"."+key]=value},
  setLayoutProperty(id,key,value){if(key==="visibility")layoutVisibility[id]=value},
  getCanvas(){return {style:{}}},
  getZoom(){return zoom},
  getBounds(){return {getWest:()=>14.43,getEast:()=>14.47,
    getSouth:()=>50.115,getNorth:()=>50.145}},
  easeTo(){}
 };
 return map;
}
function setup(zoom=10){
 const trace={unions:0,circles:0};
 const turf={
  circle(center,radius,opts){
   assert.equal(radius,.03);assert.equal(opts.units,"kilometers");
   trace.circles++;
   return {type:"Feature",geometry:{type:"Polygon",coordinates:[
     [center,[center[0]+.0002,center[1]],[center[0],center[1]+.0002],center]
   ]}};
  },
  featureCollection(features){return {type:"FeatureCollection",features}},
  union(fc){trace.unions++;return {type:"Feature",geometry:{
    type:"MultiPolygon",coordinates:fc.features.map(f=>[f.geometry.coordinates[0]])
   }};}
 };
 const scope={console,turf,PID_STRATEGIC_POLYGONS:ctx.polygons,
   PID_OWNER_BOUNDARIES:ctx.borderTopology,requestAnimationFrame:fn=>fn()};
 vm.runInNewContext(mapSource+"\nthis.api={installStopMap,refreshVisibleAreas,refreshStopMapColors,ringSegments,territoryGeoJSON,clusterAggregates,setMapOverlayVisibility,ownerBoundaryGeoJSON};",scope);
 const map=createMock(zoom);
 scope.api.installStopMap(map,groups,()=>{},players,{});
 return {map,trace,api:scope.api};
}

test("Praha má 1487 území a 3659 auditovaných platforem",()=>{
 assert.equal(groups.length,1487);
 const points=groups.flatMap(s=>s.points);
 assert.equal(points.length,3659);
 assert.equal(new Set(groups.map(s=>s.id)).size,1487);
 assert.equal(new Set(points.map(p=>p.id)).size,3659);
 assert.ok(points.every(p=>!p.captureEnabled));
 assert.ok(groups.every(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)));
});
test("Při oddálení se negeneruje ani jediný GPS polygon",()=>{
 const {map,trace}=setup(10.65);
 assert.equal(trace.circles,0);
 assert.equal(trace.unions,0);
 assert.equal(map.sources["game-territories"].data.features.length,1487);
 assert.equal(map.sources["game-platforms"].data.features.length,3659);
 assert.equal(map.sources["game-territory-areas"].data.features.length,0);
 assert.equal(map.sources["game-territories"].cluster,true);
});
test("Oblasti vznikají jen ve výřezu a uvnitř území se slučují",()=>{
 const {map,trace,api}=setup(16.1);
 assert.ok(map.sources["game-territory-areas"].data.features.length>0);
 assert.ok(map.sources["game-territory-areas"].data.features.length<1487);
 assert.ok(trace.circles>0&&trace.circles<3659);
 const before=trace.circles;
 api.refreshVisibleAreas(map); // stejný výřez – geometrie z cache
 assert.equal(trace.circles,before);
 assert.ok(map.sources["game-territory-areas"].data.features.every(x=>x.properties.approved===false));
});
test("Agregace clusterů pracuje s územími a barvami všech hráčů",()=>{
 const {map,api}=setup();
 const owners={[groups[0].id]:{owner:"p1"},[groups[1].id]:{owner:"p2"}};
 api.refreshStopMapColors(map,owners,players,null);
 const features=map.sources["game-territories"].data.features;
 assert.equal(features.filter(f=>f.properties.owner0).length,1);
 assert.equal(features.filter(f=>f.properties.owner1).length,1);
 assert.equal(features.filter(f=>f.properties.neutral).length,1485);
 assert.ok(map.sources["game-territories"].clusterProperties.owner0_count);
 assert.ok(map.layers.some(l=>l.id==="game-cluster"&&l.type==="symbol"));
 const segments=api.ringSegments([2,1,0,1],players.map(p=>p.color));
 assert.equal(segments.length,3);
 assert.equal(segments[0].fraction,.5);
});
test("Mapové úrovně zachovávají 15.2 / 16 / 17.2",()=>{
 const {map}=setup();
 assert.equal(map.layers.find(l=>l.id==="game-territory-area-fill").minzoom,15.2);
 assert.equal(map.layers.find(l=>l.id==="game-platform").minzoom,16);
 assert.equal(map.layers.find(l=>l.id==="game-platform-label").minzoom,17.2);
});
test("Simulace používá Prahu a oddělené localStorage",()=>{
 assert.ok(appSource.includes("const STOPS = PID_PRAGUE;"));
 assert.ok(appSource.includes("zastavkobrani-alpha-prague-10players-v1"));
 assert.ok(appSource.includes("demoOwner(stop)"));
 assert.ok(!appSource.includes("PID_KOBYLISY"));
});

test("Strategické Voroného oblasti pokrývají 1487 území bez překryvů herní identity",()=>{
 assert.equal(ctx.polygons.features.length,1487);
 assert.equal(new Set(ctx.polygons.features.map(f=>f.properties.territoryId)).size,1487);
 assert.ok(ctx.polygons.features.every(f=>f.geometry.type==="Polygon"));
 const {map}=setup();
 assert.equal(map.sources["game-strategic"].data.features.length,1487);
 assert.ok(map.layers.some(l=>l.id==="game-strategic-fill"&&l.type==="fill"));
 assert.ok(map.layers.find(l=>l.id==="game-strategic-fill").maxzoom<16);
 assert.ok(map.sources["game-territories"].clusterMaxZoom<15);
});
test("Deset pojmenovaných hráčů tvoří stabilní lokálně ovlivněnou simulaci",()=>{
 const players=ctx.sim.DEMO_PLAYERS;
 assert.equal(players.length,10);
 assert.equal(new Set(players.map(p=>p.name)).size,10);
 assert.ok(players.every(p=>!p.name.includes(" ")));
 assert.equal(new Set(players.map(p=>p.color)).size,10);
 const owners=groups.map(g=>ctx.sim.demoOwner(g));
 const owned=owners.filter(Boolean).length;
 assert.ok(owned>900&&owned<1220);
 assert.ok(players.every(p=>owners.includes(p.id)));
 assert.deepEqual(owners,groups.map(g=>ctx.sim.demoOwner(g)));
 assert.ok(appSource.includes("const PLAYERS=DEMO_PLAYERS"));
 assert.ok(appSource.includes("zastavkobrani-alpha-prague-10players-v1"));
});

test("Zastávkové tečky jsou trvale viditelné včetně mapového detailu",()=>{
 const {map}=setup(10.65);
 assert.equal(map.sources["game-stop-points"].data.features.length,1487);
 const layer=map.layers.find(l=>l.id==="game-territory");
 assert.equal(layer.source,"game-stop-points");
 assert.equal(layer.minzoom,0);
 assert.equal(layer.maxzoom,undefined);
 assert.equal(layer.filter,undefined);
 assert.equal(map.sources["game-territories"].cluster,true);
 assert.ok(map.layers.findIndex(l=>l.id==="game-territory")<
   map.layers.findIndex(l=>l.id==="game-cluster"));
});
test("Přepínání vrstev skryje body a polygony nezávisle a lze je obnovit",()=>{
 const {map,api}=setup();
 const controls=api.setMapOverlayVisibility;
 controls(map,{stops:false,polygons:true});
 const hiddenStops=["game-cluster","game-cluster-count",
   "game-territory","game-territory-label","game-platform","game-platform-metro","game-platform-label"];
 for(const id of hiddenStops)assert.equal(map.layoutVisibility[id],"none",id);
 assert.equal(map.layoutVisibility["game-strategic-fill"],"visible");
 assert.equal(map.layoutVisibility["game-owner-border"],"visible");
 controls(map,{stops:true,polygons:false});
 assert.equal(map.layoutVisibility["game-territory"],"visible");
 assert.equal(map.layoutVisibility["game-strategic-fill"],"none");
 assert.equal(map.layoutVisibility["game-owner-border"],"none");
 assert.equal(map.layoutVisibility["game-territory-area-fill"],"none");
 assert.equal(map.sources["game-territory-areas"].data.features.length,0);
 controls(map,{stops:true,polygons:true});
 assert.ok(Object.values(map.layoutVisibility).every(v=>v==="visible"));
});

test("Silnější vlastnické hranice ignorují sousedící oblasti téhož hráče",()=>{
 const topology=ctx.borderTopology;
 assert.equal(topology.length,3171);
 assert.ok(topology.some(([a,b])=>!!b));
 const adjacent=topology.find(([a,b])=>!!b);
 const owners={
  [adjacent[0]]:{owner:"p1"},
  [adjacent[1]]:{owner:"p1"}
 };
 const {api}=setup();
 let features=api.ownerBoundaryGeoJSON(topology,owners,players).features;
 assert.ok(!features.some(f=>
   (f.properties.territoryId===adjacent[0]&&f.properties.neighborId===adjacent[1]) ||
   (f.properties.territoryId===adjacent[1]&&f.properties.neighborId===adjacent[0])));
 owners[adjacent[1]].owner="p2";
 features=api.ownerBoundaryGeoJSON(topology,owners,players).features;
 const contested=features.find(f=>
   (f.properties.territoryId===adjacent[0]&&f.properties.neighborId===adjacent[1]) ||
   (f.properties.territoryId===adjacent[1]&&f.properties.neighborId===adjacent[0]));
 assert.equal(contested.properties.contested,1);
 assert.equal(contested.geometry.type,"MultiLineString");
 assert.ok(contested.geometry.coordinates.length>0);
});

test("Mapa aktualizuje barvy hranic po převzetí a ovládání polygonů hranice skrývá",()=>{
 const {map,api}=setup();
 const initial=map.sources["game-owner-borders"].data.features.length;
 assert.equal(initial,0);
 const owners={[groups[0].id]:{owner:"p1"}};
 api.refreshStopMapColors(map,owners,players,null);
 assert.ok(map.sources["game-owner-borders"].data.features.length>0);
 assert.equal(map.sources["game-stop-points"].data.features[0].properties.color,players[0].color);
 api.setMapOverlayVisibility(map,{stops:true,polygons:false});
 assert.equal(map.layoutVisibility["game-owner-border"],"none");
 api.setMapOverlayVisibility(map,{stops:false,polygons:true});
 assert.equal(map.layoutVisibility["game-owner-border"],"visible");
 assert.equal(map.layoutVisibility["game-territory"],"none");
});
