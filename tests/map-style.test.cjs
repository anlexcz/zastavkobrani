// Spuštění: node --test tests/map-style.test.cjs
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("map-style.js","utf8");
const app=fs.readFileSync("app.js","utf8");
const context={};
vm.runInNewContext(source+"\nthis.applyGameMapStyle=applyGameMapStyle; this.MAP_COLORS=MAP_COLORS;",context);
const apply=context.applyGameMapStyle;
const colors=context.MAP_COLORS;
function mockMap(layers){
 const writes=[],hidden=[];
 return {
  writes,hidden,
  getStyle(){return {layers}},
  setPaintProperty(id,key,value){writes.push({id,key,value})},
  setLayoutProperty(id,key,value){hidden.push({id,key,value})}
 };
}
test("Aplikace vychází z oficiálního Liberty stylu a nepřepíná zdroj",()=>{
 assert.ok(app.includes('style:"https://tiles.openfreemap.org/styles/liberty"'));
 assert.ok(app.includes('applyGameMapStyle(map)'));
 assert.ok(!app.includes('style:createGameMapStyle()'));
 assert.ok(!app.includes('setStyle('));
});
test("Budovy, POI a čísla popisná jsou odstraněné",()=>{
 const map=mockMap([
  {id:"building",type:"fill","source-layer":"building"},
  {id:"poi-label",type:"symbol","source-layer":"poi"},
  {id:"housenumber",type:"symbol","source-layer":"housenumber"},
  {id:"park",type:"fill","source-layer":"landuse"}
 ]);
 apply(map);
 assert.deepEqual(Array.from(map.hidden,x=>x.id),["building","poi-label","housenumber"]);
 assert.ok(map.writes.some(x=>x.id==="park"&&x.value===colors.park));
});
test("Ulice, voda a koleje dostanou odlišné barvy",()=>{
 const map=mockMap([
  {id:"background",type:"background"},
  {id:"water-fill",type:"fill","source-layer":"water"},
  {id:"road-primary",type:"line","source-layer":"transportation"},
  {id:"tram-line",type:"line","source-layer":"transportation"},
  {id:"rail-line",type:"line","source-layer":"transportation"}
 ]);
 apply(map);
 const paint=id=>map.writes.find(x=>x.id===id)?.value;
 assert.equal(paint("background"),colors.background);
 assert.equal(paint("water-fill"),colors.water);
 assert.equal(paint("road-primary"),colors.mainRoad);
 assert.equal(paint("tram-line"),colors.tram);
 assert.equal(paint("rail-line"),colors.railway);
});

test("Šrafované vrstvy se skryjí, obyčejné ulice zůstávají",()=>{
 const map=mockMap([
  {id:"landuse-pattern",type:"fill",paint:{"fill-pattern":"some-hatch"}},
  {id:"ordinary-road",type:"line","source-layer":"transportation"},
  {id:"tram-line",type:"line","source-layer":"transportation"}
 ]);
 apply(map);
 assert.ok(map.hidden.some(x=>x.id==="landuse-pattern"));
 assert.ok(!map.hidden.some(x=>x.id==="ordinary-road"));
 assert.equal(map.writes.find(x=>x.id==="ordinary-road"&&x.key==="line-color").value,colors.street);
 assert.equal(map.writes.find(x=>x.id==="ordinary-road"&&x.key==="line-opacity").value,.72);
});

test("Tunely silnic a železnic jsou téměř neviditelné, metro zůstává čitelné",()=>{
 const map=mockMap([
  {id:"tunnel_motorway",type:"line","source-layer":"transportation"},
  {id:"tunnel_major_rail",type:"line","source-layer":"transportation"},
  {id:"tunnel_transit_rail",type:"line","source-layer":"transportation"},
  {id:"tunnel_major_rail_hatching",type:"line","source-layer":"transportation"},
  {id:"road_motorway",type:"line","source-layer":"transportation"}
 ]);
 apply(map);
 const opacity=id=>map.writes.find(x=>x.id===id&&x.key==="line-opacity")?.value;
 assert.equal(opacity("tunnel_motorway"),.09);
 assert.equal(opacity("tunnel_major_rail"),.13);
 assert.equal(opacity("tunnel_transit_rail"),.45);
 assert.equal(opacity("road_motorway"),.72);
 assert.ok(map.hidden.some(x=>x.id==="tunnel_major_rail_hatching"));
});
