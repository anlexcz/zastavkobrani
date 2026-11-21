"use strict";
// Trvalé předvolby mapových vrstev a ovládání dostupnosti vrstev.
export function createMapLayerControls({$,getMap,setMapOverlayVisibility}){
const LAYER_PREFS_KEY="zastavkobrani-map-layers-v1";
function loadLayerPrefs(){
  try {
    const stored=JSON.parse(localStorage.getItem(LAYER_PREFS_KEY));
    if(stored&&typeof stored==="object")return {
      stops:stored.stops!==false,polygons:stored.polygons!==false
    };
  } catch(error){console.warn("Nastavení vrstev nelze načíst:",error)}
  return {stops:true,polygons:true};
}
let layerPrefs=loadLayerPrefs();
let mapStopLayersReady=false;
function setLayerPrefs(type,enabled){
  layerPrefs[type]=!!enabled;
  try{localStorage.setItem(LAYER_PREFS_KEY,JSON.stringify(layerPrefs))}
  catch(error){console.warn("Nastavení vrstev nelze uložit:",error)}
  if(mapStopLayersReady)setMapOverlayVisibility(getMap(),layerPrefs);
}
function setupMapLayerControls(){
  const button=$("map-layers-toggle"),panel=$("map-layers-panel");
  const checkStops=$("layer-stops"),checkPolygons=$("layer-polygons");
  checkStops.checked=layerPrefs.stops;
  checkPolygons.checked=layerPrefs.polygons;
  button.addEventListener("click",()=>{
    const open=panel.hidden;
    panel.hidden=!open;
    button.setAttribute("aria-expanded",String(open));
  });
  checkStops.addEventListener("change",()=>setLayerPrefs("stops",checkStops.checked));
  checkPolygons.addEventListener("change",()=>setLayerPrefs("polygons",checkPolygons.checked));
  document.addEventListener("pointerdown",event=>{
    if(!panel.hidden&&!event.target.closest(".map-layer-controls")){
      panel.hidden=true;
      button.setAttribute("aria-expanded","false");
    }
  });
}
setupMapLayerControls();


return {prefs:()=>layerPrefs,setReady:value=>{mapStopLayersReady=!!value}};
}
