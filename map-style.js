"use strict";
// Vlastní styl Zastávkobraní nad vektorovými daty OpenFreeMap.
// Žádné budovy, POI, domovní čísla; pouze orientační podklad.
const MAP_COLORS = {
  background:"#182129", water:"#204a60", park:"#263d35",
  path:"#3d4a52", street:"#56636d", mainRoad:"#69737d",
  tram:"#b58b69", railway:"#8d9bb1", text:"#abb7c0"
};

async function loadGameMapStyle() {
  // OpenFreeMap používá volně přístupný styl bez API klíče.
  // Převezmeme z něj pouze adresu vektorových dat a definice fontů;
  // celá viditelná skladba mapy je řízena výhradně zde.
  const origin = "https://tiles.openfreemap.org/styles/liberty/style.json";
  const response = await fetch(origin);
  if (!response.ok) throw new Error("OpenFreeMap HTTP " + response.status);
  const base = await response.json();
  const entry = Object.entries(base.sources || {}).find(([,source]) => source.type === "vector");
  if (!entry) throw new Error("OpenFreeMap nevrátil vektorový zdroj.");
  const [sourceId,source] = entry;
  const absolute = value => new URL(value,origin).href;
  const vectorSource = {...source};
  if (vectorSource.url) vectorSource.url = absolute(vectorSource.url);
  if (vectorSource.tiles) vectorSource.tiles = vectorSource.tiles.map(absolute);

  const layer = (id, sourceLayer, type, paint, filter, minzoom=0, layout={}) => ({
    id, type, source:sourceId, "source-layer":sourceLayer, minzoom,
    ...(filter ? {filter}:{}), layout, paint
  });
  const value = key => ["get",key];
  const eq = (key,v) => ["==",value(key),v];
  const any = (...items) => ["any",...items];
  const railway = any(eq("class","rail"),eq("subclass","rail"),eq("subclass","light_rail"),eq("subclass","tram"),eq("subclass","subway"),eq("subclass","narrow_gauge"));
  const line = (id,filter,color,width,minzoom=0) => layer(id,"transportation","line",
    {"line-color":color,"line-width":width,"line-opacity":.96},filter,minzoom,{"line-cap":"round","line-join":"round"});

  return {
    version:8,
    name:"Zastávkobraní – minimalistická Praha (pracovní)",
    glyphs:absolute(base.glyphs),
    sources:{[sourceId]:vectorSource},
    layers:[
      {id:"background",type:"background",paint:{"background-color":MAP_COLORS.background}},
      layer("water","water","fill",{"fill-color":MAP_COLORS.water}),
      layer("forest","landcover","fill",{"fill-color":MAP_COLORS.park,"fill-opacity":.75},
        any(eq("class","wood"),eq("class","grass"),eq("class","scrub"))),
      layer("parks","landuse","fill",{"fill-color":MAP_COLORS.park,"fill-opacity":.9},
        any(eq("class","park"),eq("class","cemetery"),eq("class","grass"),eq("class","recreation_ground"))),
      layer("waterway","waterway","line",{"line-color":MAP_COLORS.water,"line-width":["interpolate",["linear"],["zoom"],10,.6,15,2]}),
      line("paths",any(eq("class","path"),eq("class","track"),eq("class","service")) ,
        MAP_COLORS.path,["interpolate",["linear"],["zoom"],12,.3,16,1.2],12),
      line("streets",any(eq("class","minor"),eq("class","tertiary"),eq("class","residential"),eq("class","street")),
        MAP_COLORS.street,["interpolate",["linear"],["zoom"],10,.45,16,2.3],10),
      line("main-roads",any(eq("class","motorway"),eq("class","trunk"),eq("class","primary"),eq("class","secondary")),
        MAP_COLORS.mainRoad,["interpolate",["linear"],["zoom"],10,1,16,3.4]),
      line("railways",railway,MAP_COLORS.railway,
        ["interpolate",["linear"],["zoom"],10,.8,16,2.3],10),
      // Tramvaje mají přednostní odlišnou barvu; pokud jsou v OMT datech rozlišeny.
      line("tramways",eq("subclass","tram"),MAP_COLORS.tram,
        ["interpolate",["linear"],["zoom"],11,1.1,16,2.6],11),
      // Pouze geografické a uliční orientační názvy, nikoliv běžné POI.
      layer("place-labels","place","symbol",{"text-color":MAP_COLORS.text,"text-halo-color":MAP_COLORS.background,"text-halo-width":1.1},
        any(eq("class","city"),eq("class","town"),eq("class","suburb"),eq("class","neighbourhood"),eq("class","village")),9,
        {"text-field":["coalesce",["get","name:cs"],["get","name"],""],"text-font":["Noto Sans Regular"],"text-size":["interpolate",["linear"],["zoom"],9,10,15,13],"text-max-width":8}),
      layer("street-labels","transportation_name","symbol",{"text-color":"#82919a","text-halo-color":MAP_COLORS.background,"text-halo-width":1},
        undefined,14,{"symbol-placement":"line","text-field":["coalesce",["get","name:cs"],["get","name"],""],"text-font":["Noto Sans Regular"],"text-size":10})
    ]
  };
}
