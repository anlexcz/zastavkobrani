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
test("MapLibre startuje přímo s vlastním stylem",()=>{
  assert.ok(appSource.includes('style:createGameMapStyle()'));
  assert.ok(!appSource.includes('style:"https://tiles.openfreemap.org/styles/liberty"'));
  assert.ok(!appSource.includes("buildGameMapStyle(map.getStyle())"));
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

test("Žádný starý Leaflet ani dvojité načítání stylu",()=>{
  assert.ok(appSource.includes('style:createGameMapStyle()'));
  assert.ok(!appSource.includes('buildGameMapStyle(map.getStyle())'));
  assert.ok(!appSource.includes("L.divIcon") && !appSource.includes(".setIcon(") && !appSource.includes(".setTooltipContent("));
  assert.ok(appSource.includes('getElement()'));
});

test("Přímá sestava stylu obsahuje vlastní tmavé pozadí",()=>{
  const context={URL};
  vm.runInNewContext(source+"\nthis.createGameMapStyle=createGameMapStyle;",context);
  const style=context.createGameMapStyle();
  assert.equal(style.layers[0].paint["background-color"],"#182129");
  assert.equal(style.sources.openmaptiles.url,"https://tiles.openfreemap.org/planet");
  assert.equal(style.glyphs,"https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf");
});
