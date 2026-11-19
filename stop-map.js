"use strict";
// GeoJSON vrstvy pevně přivázané k souřadnicím. Žádné HTML markery,
// které by zdědily CSS tlačítek a při zoomu se pohybovaly mimo geometrii.
const PLATFORM_ZOOM = 16;
const TERRITORY_AREA_ZOOM = 15.2;
let stopMapInitialized = false;
let clusterPlayers = [];
let territoryPoints = [];
let lastOwnershipSignature = null;
let currentOwnership = {};
const areaGeometryCache = new Map();
let areaGeneration = 0;

// Různé výřezy mapy sdílejí stejné agregace; ikony se generují jen na požádání.
const CLUSTER_ICON_PREFIX = "owner-ring:";


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

// Clustering počítá herní zastávky, nikoliv jednotlivá PID stanoviště.
function ownerColor(id, ownership, players) {
  const player=players.find(p=>p.id===ownership[id]?.owner);
  return player?.color||"#929292";
}
function platformGeoJSON(territories, ownership, players) {
  return geoCollection(territories.flatMap(s=>s.points.map(p=>geoPoint(p.lon,p.lat,{
    territoryId:s.id,territoryName:s.name,pointId:p.id,
    platform:p.platform,metro:p.isMetro?1:0,review:p.review,
    color:ownerColor(s.id,ownership,players)
  }))));
}
// Počet nakreslených polygonů odpovídá pouze okolí aktuálního výřezu.
// Unie se kešují; při oddálení Prahy nic nespočítáváme.
function refreshVisibleAreas(map) {
  if(!map.getZoom || !map.getBounds || !map.getSource("game-territory-areas"))return;
  const generation=++areaGeneration;
  if(map.getZoom()<TERRITORY_AREA_ZOOM) {
    map.getSource("game-territory-areas").setData(geoCollection([]));
    return;
  }
  const b=map.getBounds(),margin=.012;
  const visible=territoryPoints.filter(s=>s.lon>=b.getWest()-margin && s.lon<=b.getEast()+margin &&
    s.lat>=b.getSouth()-margin && s.lat<=b.getNorth()+margin);
  const result=[];
  const source=map.getSource("game-territory-areas");
  let next=0;
  function processBatch(){
    if(generation!==areaGeneration)return;
    const stop=Math.min(visible.length,next+6);
    for(;next<stop;next++){
      const s=visible[next];
      if(!areaGeometryCache.has(s.id)){
        try {
          const circles=s.points.map(p=>turf.circle([p.lon,p.lat],.03,{steps:32,units:"kilometers"}));
          const merged=circles.length===1?circles[0]:turf.union(turf.featureCollection(circles));
          if(!merged)throw Error("Union bez výsledku");
          areaGeometryCache.set(s.id,merged.geometry);
        } catch(error) {
          console.warn("Oblast se nepodařila sloučit:",s.name,error);
          continue;
        }
      }
      result.push({type:"Feature",geometry:areaGeometryCache.get(s.id),
        properties:{territoryId:s.id,name:s.name,approved:false,platformCount:s.points.length,
          color:ownerColor(s.id,currentOwnership,clusterPlayers),
          owned:clusterPlayers.some(p=>p.id===currentOwnership[s.id]?.owner)?1:0}});
    }
    source.setData(geoCollection(result));
    if(next<visible.length)requestAnimationFrame(processBatch);
  }
  processBatch();
}
function ownerProperties(territoryId, ownership, players) {
  const owner=ownership[territoryId]?.owner;
  const values={neutral:players.some(p=>p.id===owner)?0:1};
  players.forEach((p,i)=>{values["owner"+i]=owner===p.id?1:0});
  return values;
}
function clusterAggregates(players) {
  const props={neutral_count:["+",["get","neutral"]]};
  players.forEach((p,i)=>{props["owner"+i+"_count"]=["+",["get","owner"+i]]});
  return props;
}
function territoryGeoJSON(territories, ownership, players) {
  return geoCollection(territories.map(s=>geoPoint(s.lon,s.lat,{
    territoryId:s.id,name:s.name,platforms:s.points.length,
    color:ownerColor(s.id,ownership,players),
    ...ownerProperties(s.id,ownership,players)
  })));
}
function ringIconExpression(players) {
  return ["concat",CLUSTER_ICON_PREFIX,
    ["to-string",["get","point_count"]],
    ...players.map((p,i)=>[ "concat",":",["to-string",["get","owner"+i+"_count"]] ]),
    ":",["to-string",["get","neutral_count"]]
  ];
}
// Části prstence jsou úměrné počtu obsazených herních zastávek.
function ringSegments(counts, playerColors) {
  const total=counts.reduce((a,b)=>a+b,0);
  if(!total)return [];
  return counts.map((count,i)=>({count,
    color:i<playerColors.length?playerColors[i]:"#929292",
    fraction:count/total
  })).filter(s=>s.count>0);
}
function createRingIcon(iconId, map, players) {
  if(!iconId.startsWith(CLUSTER_ICON_PREFIX)||map.hasImage(iconId))return;
  const parts=iconId.slice(CLUSTER_ICON_PREFIX.length).split(":").map(Number);
  const count=parts.shift(), counts=parts;
  if(!Number.isInteger(count)||count<2||counts.length!==players.length+1 ||
     counts.some(n=>!Number.isInteger(n)||n<0) ||
     counts.reduce((a,b)=>a+b,0)!==count)return;
  const canvas=document.createElement("canvas");
  // DPR 2 zaručuje ostrý prstenec i na mobilu; symbol má 52 px.
  canvas.width=104;canvas.height=104;
  const context=canvas.getContext("2d");
  if(!context)return;
  const segments=ringSegments(counts,players.map(p=>p.color));
  context.fillStyle="#24272a";
  context.beginPath();context.arc(52,52,34,0,Math.PI*2);context.fill();
  const gap=segments.length>1?.023:0;
  let angle=-Math.PI/2;
  for(const segment of segments){
    const sweep=segment.fraction*Math.PI*2;
    context.beginPath();
    context.arc(52,52,40,angle+gap,angle+sweep-gap);
    context.strokeStyle=segment.color;
    context.lineWidth=11;context.stroke();
    angle+=sweep;
  }
  // Tenký neutrální rámeček jasně odděluje symbol od podkladu.
  context.beginPath();context.arc(52,52,46,0,Math.PI*2);
  context.strokeStyle="#d2d3d4";context.lineWidth=1.5;context.stroke();
  map.addImage(iconId,context.getImageData(0,0,104,104),{pixelRatio:2});
}

function installStopMap(map, territories, showTerritory, players=[], ownership={}) {
  if(stopMapInitialized) return;
  stopMapInitialized=true;
  clusterPlayers=players;
  territoryPoints=territories;
  currentOwnership=ownership;
  const initialTerritories=territoryGeoJSON(territories,ownership,players);
  lastOwnershipSignature=JSON.stringify(territories.map(s=>ownership[s.id]?.owner||null));
  // Oblasti se tvoří pouze při detailním přiblížení, ne pro celou Prahu.
  const platformFeatures=platformGeoJSON(territories,ownership,players);
  map.addSource("game-territories",{
    type:"geojson",data:initialTerritories,cluster:true,
    clusterRadius:45,clusterMaxZoom:15,clusterProperties:clusterAggregates(players)
  });
  map.addSource("game-platforms",{type:"geojson",data:geoCollection(platformFeatures)});
  map.addSource("game-territory-areas",{type:"geojson",data:geoCollection([])});
  // Oblast je viditelná už před rozpadem skupiny na stanoviště.
  // Jde o pracovní náhled neověřených GPS bodů, ne povolení herní akce.
  map.addLayer({id:"game-territory-area-fill",type:"fill",
    source:"game-territory-areas",minzoom:TERRITORY_AREA_ZOOM,
    paint:{"fill-color":["get","color"],"fill-opacity":["case",["==",["get","owned"],1],.23,.075]}});
  map.addLayer({id:"game-territory-area-outline",type:"line",
    source:"game-territory-areas",minzoom:TERRITORY_AREA_ZOOM,
    paint:{"line-color":["get","color"],"line-opacity":.38,"line-width":1.15}});
  map.on("styleimagemissing",event=>createRingIcon(event.id,map,players));
  map.addLayer({id:"game-cluster",type:"symbol",source:"game-territories",
    filter:["has","point_count"],maxzoom:PLATFORM_ZOOM,
    layout:{"icon-image":ringIconExpression(players),
      "icon-size":1,"icon-allow-overlap":true,"icon-ignore-placement":true}});
  map.addLayer({id:"game-cluster-count",type:"symbol",source:"game-territories",
    filter:["has","point_count"],maxzoom:PLATFORM_ZOOM,
    layout:{"text-field":["to-string",["get","point_count"]],"text-size":12,
      "text-font":["Noto Sans Regular"],"text-allow-overlap":true,"text-ignore-placement":true},
    paint:{"text-color":"#f6f6f6"}});
  map.addLayer({id:"game-territory",type:"circle",source:"game-territories",
    filter:["!",["has","point_count"]],maxzoom:PLATFORM_ZOOM,
    paint:{"circle-color":["get","color"],"circle-radius":7,
      "circle-stroke-color":"#f2f2f2","circle-stroke-width":1.8}});
  map.addLayer({id:"game-territory-label",type:"symbol",source:"game-territories",
    filter:["!",["has","point_count"]],minzoom:14.3,maxzoom:PLATFORM_ZOOM,
    layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],
      "text-size":11,"text-offset":[0,1.5],"text-anchor":"top",
      "text-optional":true},
    paint:{"text-color":"#e3e3e3","text-halo-color":"#181a1c","text-halo-width":1.2}});
  map.addLayer({id:"game-platform",type:"circle",source:"game-platforms",
    filter:["==",["get","metro"],0],minzoom:PLATFORM_ZOOM,
    paint:{"circle-color":["get","color"],"circle-radius":["step",["zoom"],5,18,6],
      "circle-stroke-color":"#f2f2f2","circle-stroke-width":1.5}});
  map.addLayer({id:"game-platform-metro",type:"circle",source:"game-platforms",
    minzoom:PLATFORM_ZOOM,filter:["==",["get","metro"],1],
    paint:{"circle-color":["get","color"],"circle-radius":5.5,
      "circle-stroke-color":"#c3cad0","circle-stroke-width":1.5}});
  map.addLayer({id:"game-platform-label",type:"symbol",source:"game-platforms",
    minzoom:17.2,
    layout:{"text-field":["get","platform"],"text-size":10,
      "text-font":["Noto Sans Regular"],"text-offset":[0,1.25],
      "text-anchor":"top","text-optional":true},
    paint:{"text-color":"#f0f0f0","text-halo-color":"#181a1c","text-halo-width":1.1}});

  map.on("moveend",()=>refreshVisibleAreas(map));
  refreshVisibleAreas(map);
  const selectFeature=e=>{
    const p=e.features?.[0]?.properties;
    if(!p?.territoryId)return;
    showTerritory(p.territoryId,p.pointId||null);
  };
  map.on("click","game-territory",selectFeature);
  map.on("click","game-territory-area-fill",selectFeature);
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
  for(const id of ["game-territory","game-territory-area-fill","game-platform","game-platform-metro","game-cluster"])
    map.on("mouseenter",id,()=>{map.getCanvas().style.cursor="pointer"});
  for(const id of ["game-territory","game-platform","game-platform-metro","game-cluster"])
    map.on("mouseleave",id,()=>{map.getCanvas().style.cursor=""});
}

function refreshStopMapColors(map,ownership,players,selectedId) {
  if(!stopMapInitialized || !map.getLayer("game-territory"))return;
  const signature=JSON.stringify(territoryPoints.map(s=>ownership[s.id]?.owner||null));
  if(signature!==lastOwnershipSignature){
    lastOwnershipSignature=signature;
    currentOwnership=ownership;
    map.getSource("game-territories").setData(territoryGeoJSON(territoryPoints,ownership,clusterPlayers));
    map.getSource("game-platforms").setData(platformGeoJSON(territoryPoints,ownership,clusterPlayers));
    refreshVisibleAreas(map);
  }
  // Výplň čte flag owned přímo z GeoJSON – žádný 1000položkový match výraz.
  map.setPaintProperty("game-territory-area-outline","line-opacity",
    ["case",["==",["get","territoryId"],selectedId||""],.85,
      ["==",["get","owned"],1],.68,.26]);
  for(const id of ["game-territory","game-platform","game-platform-metro"])
    map.setPaintProperty(id,"circle-stroke-width",
      ["case",["==",["get","territoryId"],selectedId||""],3,1.6]);
}
