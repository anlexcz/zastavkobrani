export const MAP_VIEW_KEY="zastavkobrani-map-view-v1";
export function loadMapView(storage){try{const v=JSON.parse(storage.getItem(MAP_VIEW_KEY));if(v&&Array.isArray(v.center)&&v.center.length===2&&v.center.every(Number.isFinite)&&v.center[0]>=-180&&v.center[0]<=180&&v.center[1]>=-85&&v.center[1]<=85&&Number.isFinite(v.zoom)&&v.zoom>=0&&v.zoom<=22)return {center:v.center,zoom:v.zoom};}catch{}return null;}
export function saveMapView(storage,center,zoom){try{storage.setItem(MAP_VIEW_KEY,JSON.stringify({center,zoom}));}catch{}}
export function normalizeMapFilters(v){return {owner:["all","mine","neutral","others"].includes(v?.owner)?v.owner:"all",visited:v?.visited===true};}
