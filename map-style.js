"use strict";

// Zastávkobraní: jen úprava vrstev oficiálního stylu Liberty.
// Zdroj vektorových dat, fonty a ostatní technické parametry ponechává OpenFreeMap.
const MAP_COLORS = Object.freeze({
  background:"#181a1c",water:"#303a3e",park:"#252c29",
  street:"#41464b",mainRoad:"#51565a",path:"#303539",
  railway:"#85898d",tram:"#a29a91",text:"#aeb0b2"
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
    const paint=layer.paint || {};
    // Šrafování ve stylu Liberty bývá fill-pattern / line-pattern.
    // Původní plochy schováme, ať nezakrývají vlastní herní mapu.
    if (paint["fill-pattern"] !== undefined || paint["line-pattern"] !== undefined ||
        paint["background-pattern"] !== undefined || /hatch|pattern/.test(name)) {
      hide(id); modified++; continue;
    }
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
      // Koleje zachovat čitelné, silnice a cesty posunout do pozadí.
      set(id,"line-opacity", /tram/.test(name) ? .95 : /rail|subway|transit/.test(name) ? .88 : /path|foot|cycle|pedestrian|service/.test(name) ? .5 : .72);
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
