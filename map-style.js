"use strict";

// Zastávkobraní: jen úprava vrstev oficiálního stylu Liberty.
// Zdroj vektorových dat, fonty a ostatní technické parametry ponechává OpenFreeMap.
const MAP_COLORS = Object.freeze({
  background:"#182129",water:"#204a60",park:"#263d35",
  street:"#56636d",mainRoad:"#69737d",path:"#3d4a52",
  railway:"#8d9bb1",tram:"#b58b69",text:"#abb7c0"
});

function applyGameMapStyle(map) {
  const layers = map.getStyle()?.layers || [];
  if (!layers.length) throw new Error("OpenFreeMap neobsahuje vrstvy.");
  let modified = 0;
  const set = (id, key, value) => map.setPaintProperty(id,key,value);
  const hide = id => map.setLayoutProperty(id,"visibility","none");
  for (const layer of layers) {
    const id=layer.id;
    const name=id.toLowerCase();
    const source=(layer["source-layer"] || "").toLowerCase();
    const category=name+" "+source;
    if (/building|housenumber|poi|aeroway|airport|mountain_peak|transit_stop/.test(category)) {
      hide(id); modified++; continue;
    }
    if (layer.type==="background") {
      set(id,"background-color",MAP_COLORS.background);modified++;
    } else if (layer.type==="fill") {
      if (/water/.test(category)) set(id,"fill-color",MAP_COLORS.water);
      else if (/park|landcover|landuse|wood|grass|forest|cemetery/.test(category)) set(id,"fill-color",MAP_COLORS.park);
      else set(id,"fill-color",MAP_COLORS.background);
      modified++;
    } else if (layer.type==="line") {
      const c=/tram/.test(name)?MAP_COLORS.tram
        :/rail|subway|transit/.test(name)?MAP_COLORS.railway
        :/water/.test(category)?MAP_COLORS.water
        :/motorway|trunk|primary|secondary|highway/.test(name)?MAP_COLORS.mainRoad
        :/path|foot|cycle|pedestrian|service/.test(name)?MAP_COLORS.path
        :MAP_COLORS.street;
      set(id,"line-color",c);
      modified++;
    } else if (layer.type==="symbol") {
      if (/place|city|town|suburb|neighbourhood|street|road|transportation_name/.test(category)
          && !/poi|stop|housenumber/.test(name)) {
        if(layer.layout?.["icon-image"]) map.setLayoutProperty(id,"icon-image","");
        if(layer.paint?.["text-color"]!==undefined) set(id,"text-color",MAP_COLORS.text);
        if(layer.paint?.["text-halo-color"]!==undefined) set(id,"text-halo-color",MAP_COLORS.background);
      } else hide(id);
      modified++;
    } else if(layer.type==="fill-extrusion") {
      hide(id);modified++;
    }
  }
  if (!modified) throw new Error("Žádná vrstva nebyla upravena.");
  return {total:layers.length,modified};
}
