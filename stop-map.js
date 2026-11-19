"use strict";
// GeoJSON vrstvy pevně přivázané k souřadnicím. Žádné HTML markery,
// které by zdědily CSS tlačítek a při zoomu se pohybovaly mimo geometrii.
const PLATFORM_ZOOM = 16;
const CAPTURE_PREVIEW_ZOOM = 17.5;
let stopMapInitialized = false;

function geoPoint(lon, lat, properties) {
  return {type:"Feature",geometry:{type:"Point",coordinates:[lon,lat]},properties};
}
function geoCollection(features) {return {type:"FeatureCollection",features};}

function meterCircle(lon,lat,meters) {
  const coords=[], latScale=111320, lonScale=latScale*Math.cos(lat*Math.PI/180);
  for(let i=0;i<=48;i++){
    const angle=i*Math.PI/24;
    coords.push([lon+Math.cos(angle)*meters/lonScale,lat+Math.sin(angle)*meters/latScale]);
  }
  return {type:"Polygon",coordinates:[coords]};
}

function installStopMap(map, territories, showTerritory) {
  if(stopMapInitialized) return;
  stopMapInitialized=true;
  const territoryFeatures=territories.map(s=>geoPoint(s.lon,s.lat,{
    territoryId:s.id,name:s.name,platforms:s.points.length
  }));
  const platformFeatures=territories.flatMap(s=>s.points.map(p=>geoPoint(p.lon,p.lat,{
    territoryId:s.id,territoryName:s.name,pointId:p.id,
    platform:p.platform,metro:p.isMetro?1:0,review:p.review
  })));
  const previewFeatures=territories.flatMap(s=>s.points.map(p=>({
    type:"Feature",geometry:meterCircle(p.lon,p.lat,30),
    properties:{territoryId:s.id,pointId:p.id,approved:false}
  })));

  map.addSource("game-territories",{
    type:"geojson",data:geoCollection(territoryFeatures),cluster:true,
    clusterRadius:45,clusterMaxZoom:15
  });
  map.addSource("game-platforms",{type:"geojson",data:geoCollection(platformFeatures)});
  map.addSource("game-capture-candidates",{type:"geojson",data:geoCollection(previewFeatures)});
  map.addLayer({id:"game-cluster",type:"circle",source:"game-territories",
    filter:["has","point_count"],maxzoom:PLATFORM_ZOOM,
    paint:{"circle-color":"#3e4145","circle-radius":["step",["get","point_count"],14,5,18,10,23],
      "circle-stroke-color":"#d3d6d8","circle-stroke-width":1.6}});
  map.addLayer({id:"game-cluster-count",type:"symbol",source:"game-territories",
    filter:["has","point_count"],maxzoom:PLATFORM_ZOOM,
    layout:{"text-field":["to-string",["get","point_count"]],"text-size":11,
      "text-font":["Noto Sans Regular"]},
    paint:{"text-color":"#f6f6f6"}});
  map.addLayer({id:"game-territory",type:"circle",source:"game-territories",
    filter:["!",["has","point_count"]],maxzoom:PLATFORM_ZOOM,
    paint:{"circle-color":"#929292","circle-radius":7,
      "circle-stroke-color":"#f2f2f2","circle-stroke-width":1.8}});
  map.addLayer({id:"game-territory-label",type:"symbol",source:"game-territories",
    filter:["!",["has","point_count"]],minzoom:14.3,maxzoom:PLATFORM_ZOOM,
    layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],
      "text-size":11,"text-offset":[0,1.5],"text-anchor":"top",
      "text-optional":true},
    paint:{"text-color":"#e3e3e3","text-halo-color":"#181a1c","text-halo-width":1.2}});
  map.addLayer({id:"game-preview-fill",type:"fill",source:"game-capture-candidates",
    minzoom:CAPTURE_PREVIEW_ZOOM,
    paint:{"fill-color":"#9da9a1","fill-opacity":.07}});
  map.addLayer({id:"game-preview-outline",type:"line",source:"game-capture-candidates",
    minzoom:CAPTURE_PREVIEW_ZOOM,
    paint:{"line-color":"#aab5ad","line-opacity":.48,"line-width":1.3,
      "line-dasharray":[2,3]}});
  map.addLayer({id:"game-platform",type:"circle",source:"game-platforms",
    filter:["==",["get","metro"],0],minzoom:PLATFORM_ZOOM,
    paint:{"circle-color":"#929292","circle-radius":["step",["zoom"],5,18,6],
      "circle-stroke-color":"#f2f2f2","circle-stroke-width":1.5}});
  map.addLayer({id:"game-platform-metro",type:"circle",source:"game-platforms",
    minzoom:PLATFORM_ZOOM,filter:["==",["get","metro"],1],
    paint:{"circle-color":"#5f666c","circle-radius":5.5,
      "circle-stroke-color":"#c3cad0","circle-stroke-width":1.5}});
  map.addLayer({id:"game-platform-label",type:"symbol",source:"game-platforms",
    minzoom:17.2,
    layout:{"text-field":["get","platform"],"text-size":10,
      "text-font":["Noto Sans Regular"],"text-offset":[0,1.25],
      "text-anchor":"top","text-optional":true},
    paint:{"text-color":"#f0f0f0","text-halo-color":"#181a1c","text-halo-width":1.1}});

  const selectFeature=e=>{
    const p=e.features?.[0]?.properties;
    if(!p?.territoryId)return;
    showTerritory(p.territoryId,p.pointId||null);
  };
  map.on("click","game-territory",selectFeature);
  map.on("click","game-platform",selectFeature);
  map.on("click","game-platform-metro",selectFeature);
  map.on("click","game-cluster",e=>{
    const f=e.features?.[0],clusterId=f?.properties?.cluster_id;
    if(clusterId===undefined)return;
    const source=map.getSource("game-territories");
    source.getClusterExpansionZoom(clusterId).then(zoom=>{
      map.easeTo({center:f.geometry.coordinates,zoom:Math.max(zoom,map.getZoom()+1)});
    }).catch(error=>console.warn("Shluk nelze přiblížit:",error));
  });
  for(const id of ["game-territory","game-platform","game-platform-metro","game-cluster"])
    map.on("mouseenter",id,()=>{map.getCanvas().style.cursor="pointer"});
  for(const id of ["game-territory","game-platform","game-platform-metro","game-cluster"])
    map.on("mouseleave",id,()=>{map.getCanvas().style.cursor=""});
}

function refreshStopMapColors(map,ownership,players,selectedId) {
  if(!stopMapInitialized || !map.getLayer("game-territory"))return;
  const match=["match",["get","territoryId"]];
  for(const id of Object.keys(ownership)){
    const p=players.find(p=>p.id===ownership[id].owner);
    if(p){match.push(id,p.color)}
  }
  match.push("#929292");
  for(const id of ["game-territory","game-platform","game-platform-metro"])
    map.setPaintProperty(id,"circle-color",match);
  for(const id of ["game-territory","game-platform","game-platform-metro"])
    map.setPaintProperty(id,"circle-stroke-width",
      ["case",["==",["get","territoryId"],selectedId||""],3,1.6]);
}
