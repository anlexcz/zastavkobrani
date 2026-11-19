// Spustit: node --test tests/map-style.test.cjs (Node.js 20+)
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("map-style.js","utf8");
async function getStyle() {
  const context={
    URL,
    fetch:async()=>({ok:true,json:async()=>({
      sources:{openmaptiles:{type:"vector",url:"https://tiles.openfreemap.org/planet"}},
      glyphs:"https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"
    })})
  };
  vm.runInNewContext(source+"\nthis.loadGameMapStyle=loadGameMapStyle;",context);
  return await context.loadGameMapStyle();
}
test("Minimální styl má bezklíčový vektorový zdroj",async()=>{
  const style=await getStyle();
  assert.equal(style.version,8);
  assert.ok(Object.values(style.sources).some(x=>x.type==="vector"));
  assert.ok(!JSON.stringify(style).includes("api_key"));
});
test("Mapa neobsahuje budovy ani POI",async()=>{
  const style=await getStyle();
  const names=style.layers.map(x=>x.id);
  assert.ok(!names.some(x=>/building|poi|housenumber/i.test(x)));
  assert.ok(names.includes("parks")&&names.includes("water")&&names.includes("tramways")&&names.includes("railways"));
});
test("Železnice a tramvaje mají různé barvy",async()=>{
  const style=await getStyle();
  const rail=style.layers.find(x=>x.id==="railways");
  const tram=style.layers.find(x=>x.id==="tramways");
  assert.notEqual(rail.paint["line-color"],tram.paint["line-color"]);
});
