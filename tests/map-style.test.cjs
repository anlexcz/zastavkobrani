// Spustit: node --test tests/map-style.test.cjs (Node.js 20+)
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("map-style.js","utf8");
const appSource=fs.readFileSync("app.js","utf8");
const documentedUrl="https://tiles.openfreemap.org/styles/liberty";
function getStyle() {
  const context={URL};
  vm.runInNewContext(source+"\nthis.buildGameMapStyle=buildGameMapStyle;",context);
  const base={
    sources:{openmaptiles:{type:"vector",url:"https://tiles.openfreemap.org/planet"}},
    glyphs:"https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"
  };
  return context.buildGameMapStyle(base);
}
test("Inicializace používá oficiální URL stylu OpenFreeMap",()=>{
  assert.ok(appSource.includes('style:"'+documentedUrl+'"'));
  assert.ok(!appSource.includes("styles/liberty/style.json"));
  assert.ok(appSource.includes("buildGameMapStyle(map.getStyle())"));
});
test("Vlastní styl používá vektorový zdroj bez API klíče",()=>{
  const style=getStyle();
  assert.equal(style.version,8);
  assert.ok(Object.values(style.sources).some(x=>x.type==="vector"));
  assert.ok(!JSON.stringify(style).includes("api_key"));
});
test("Bez budov a běžných POI",()=>{
  const names=getStyle().layers.map(x=>x.id);
  assert.ok(!names.some(x=>/building|poi|housenumber/i.test(x)));
  assert.ok(names.includes("parks")&&names.includes("water")&&names.includes("tramways")&&names.includes("railways"));
});
test("Železnice a tramvaje mají jiné barvy",()=>{
  const style=getStyle();
  assert.notEqual(style.layers.find(x=>x.id==="railways").paint["line-color"],
                  style.layers.find(x=>x.id==="tramways").paint["line-color"]);
});

test("Mapa aplikuje vlastní styl při style.load a nemá Leaflet volání",()=>{
  assert.ok(appSource.includes('map.on("style.load"'));
  assert.ok(appSource.includes('buildGameMapStyle(map.getStyle())'));
  assert.ok(!/\\bL\\./.test(appSource));
  assert.ok(appSource.includes('getElement()'));
});
