"use strict";
// GeoJSON vrstvy pevně přivázané k souřadnicím. Žádné HTML markery,
// které by zdědily CSS tlačítek a při zoomu se pohybovaly mimo geometrii.
const PLATFORM_ZOOM = 16;
const TERRITORY_AREA_ZOOM = 14.5;
let stopMapInitialized = false;
let clusterPlayers = [];
let territoryPoints = [];
let lastOwnershipSignature = null;
let currentOwnership = {};
const areaGeometryCache = new Map();
const territoryBounds = new Map();
let areaGeneration = 0;

// Různé výřezy mapy sdílejí stejné agregace; ikony se generují jen na požádání.
const CLUSTER_ICON_PREFIX = "owner-ring:";
const STRATEGIC_MAX_ZOOM = 15.5;
const CLUSTER_VISIBLE_ZOOM = 11.6;
// Zdrojové body zastávek jsou trvale vykreslené nezávisle na shlucích.
// Neprovádíme přepínání zdroje při změně zoomu (dříve mezera 11,6–16).
const STOP_DOTS_MIN_ZOOM = 0;
const MAP_OVERLAY_LAYER_IDS = Object.freeze({
  stops:["game-territory","game-cluster","game-cluster-count","game-territory-label",
    "game-platform","game-platform-metro","game-platform-label",
    "game-territory-area-fill","game-territory-area-outline"],
  polygons:["game-strategic-fill","game-owner-border-glow","game-owner-border","game-owner-border-highlight"]
});
let mapOverlayState = {stops:true,polygons:true};

function setMapOverlayVisibility(map, next) {
  mapOverlayState={...mapOverlayState,...next};
  for(const [type,ids] of Object.entries(MAP_OVERLAY_LAYER_IDS)){
    for(const id of ids){
      if(map.getLayer(id))map.setLayoutProperty(id,"visibility",mapOverlayState[type]?"visible":"none");
    }
  }
  if(mapOverlayState.stops)refreshVisibleAreas(map);
  else {
    areaGeneration++;
    const source=map.getSource("game-territory-areas");
    if(source)source.setData(geoCollection([]));
  }
}



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
// Topologie hran je statická a má maximálně jednu linii na společném rozhraní.
// Vykreslíme pouze vnější hranice sousedících oblastí různých vlastníků.
function ownerBoundaryGeoJSON(topology,ownership,players){
  const known=new Map(players.map(p=>[p.id,p.color]));
  const rendered=[];
  for(const [a,b,lines] of topology){
    const first=ownership[a]?.owner;
    const second=b?ownership[b]?.owner:null;
    const ownedA=known.has(first)?first:null;
    const ownedB=known.has(second)?second:null;
    if(ownedA===ownedB)continue; // neobrylovat hranice uvnitř stejného hráče ani neutrál/neutral
    const disputed=ownedA!==null&&ownedB!==null;
    rendered.push({
      type:"Feature",
      properties:{
        territoryId:a,neighborId:b||"",
        color:disputed?"#111418":known.get(ownedA||ownedB),
        contested:disputed?1:0
      },
      geometry:{type:"MultiLineString",coordinates:lines}
    });
  }
  return geoCollection(rendered);
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
  if(!mapOverlayState.stops || !map.getZoom || !map.getBounds || !map.getSource("game-territory-areas"))return;
  const generation=++areaGeneration;
  if(map.getZoom()<TERRITORY_AREA_ZOOM) {
    map.getSource("game-territory-areas").setData(geoCollection([]));
    return;
  }
  const b=map.getBounds(),margin=.012;
  const visible=territoryPoints.filter(s=>{
    const box=territoryBounds.get(s.id);
    return box.east>=b.getWest()-margin && box.west<=b.getEast()+margin &&
      box.north>=b.getSouth()-margin && box.south<=b.getNorth()+margin;
  });
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
          // Stejná kandidátní stanoviště jako v lokální GPS validaci.
          // V rámci území používáme UNION, aby se průhlednost nepřičítala.
          const points=s.points.filter(p=>!p.isMetro&&p.insidePrague);
          if(!points.length)continue;
          const circles=points.map(p=>turf.circle([p.lon,p.lat],.03,{steps:48,units:"kilometers"}));
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
  // Výřez podle rozsahu všech skutečných stanovišť, nikoli pouze group.avgLat/Lon.
  for(const s of territories){
    const lats=s.points.map(p=>p.lat),lons=s.points.map(p=>p.lon);
    territoryBounds.set(s.id,{
      west:Math.min(...lons),east:Math.max(...lons),
      south:Math.min(...lats),north:Math.max(...lats)
    });
  }
  const initialTerritories=territoryGeoJSON(territories,ownership,players);
  lastOwnershipSignature=JSON.stringify(territories.map(s=>ownership[s.id]?.owner||null));
  // Oblasti se tvoří pouze při detailním přiblížení, ne pro celou Prahu.
  const platformFeatures=platformGeoJSON(territories,ownership,players);
  // Vizuální strategické oblasti: maximálně 390 m od reprezentativní PID group.
  // NEJSOU to capture zones; jejich geometrie se při změně vlastníka nemění.
  const strategicFeatures=PID_STRATEGIC_POLYGONS.features.map(f=>({
    ...f,properties:{...f.properties,
      color:ownerColor(f.properties.territoryId,ownership,players),
      owned:players.some(p=>p.id===ownership[f.properties.territoryId]?.owner)?1:0}
  }));
  map.addSource("game-strategic",{type:"geojson",data:geoCollection(strategicFeatures)});
  map.addSource("game-owner-borders",{type:"geojson",
    data:ownerBoundaryGeoJSON(PID_OWNER_BOUNDARIES,ownership,players)});
  // Trvalý georeferencovaný katalog (neshlukovaný) pro všechny úrovně mapy.
  map.addSource("game-stop-points",{type:"geojson",data:initialTerritories});
  map.addSource("game-territories",{
    type:"geojson",data:initialTerritories,cluster:true,
    attribution:'Zastávková data: <a href="https://pid.cz/o-systemu/opendata/" target="_blank" rel="noopener noreferrer">PID (CC BY)</a>',
    clusterRadius:45,clusterMaxZoom:12.9,clusterProperties:clusterAggregates(players)
  });
  map.addSource("game-platforms",{type:"geojson",data:platformFeatures});
  map.addSource("game-territory-areas",{type:"geojson",data:geoCollection([])});
  map.addLayer({id:"game-strategic-fill",type:"fill",source:"game-strategic",
    maxzoom:STRATEGIC_MAX_ZOOM,
    paint:{"fill-color":["get","color"],
      "fill-opacity":["interpolate",["linear"],["zoom"],
        10,.22,13,.20,15.5,.11]}});
  // Glow je pod tmavým obrysem: měkká hráčská barva, žádné neonové hrany.
  // Společné hranice stejného vlastníka už filtruje ownerBoundaryGeoJSON.
  map.addLayer({id:"game-owner-border-glow",type:"line",source:"game-owner-borders",
    maxzoom:STRATEGIC_MAX_ZOOM,
    filter:["==",["get","contested"],0],
    layout:{"line-join":"round","line-cap":"round"},
    paint:{"line-color":["get","color"],
      "line-width":["interpolate",["linear"],["zoom"],9,5,11,7,14,9,15.5,10],
      "line-opacity":.34,"line-blur":3.3}});
  map.addLayer({id:"game-owner-border",type:"line",source:"game-owner-borders",
    maxzoom:STRATEGIC_MAX_ZOOM,layout:{"line-join":"round","line-cap":"round"},
    paint:{"line-color":"#111418",
      "line-width":["interpolate",["linear"],["zoom"],9,1.3,11,1.8,14,2.2,15.5,2.6],
      "line-opacity":.9,"line-blur":.25}});
  map.addLayer({id:"game-owner-border-highlight",type:"line",source:"game-owner-borders",
    maxzoom:STRATEGIC_MAX_ZOOM,
    filter:["==",["get","contested"],0],
    layout:{"line-join":"round","line-cap":"round"},
    paint:{"line-color":["get","color"],
      "line-width":["interpolate",["linear"],["zoom"],9,.7,11,1,14,1.4,15.5,1.6],
      "line-opacity":.65,"line-blur":1.2}});
  // Oblast je viditelná už před rozpadem skupiny na stanoviště.
  // Jde o pracovní náhled neověřených GPS bodů, ne povolení herní akce.
  // Jeden geograficky sloučený 30m polygon na herní zastávku.
  // Přesný dosah je viditelný už před rozpadem sloupků, nezávisle na
  // přepínači strategických území (která mají zcela jiný význam).
  map.addLayer({id:"game-territory-area-fill",type:"fill",
    source:"game-territory-areas",minzoom:TERRITORY_AREA_ZOOM,
    paint:{"fill-color":["case",["==",["get","owned"],1],["get","color"],"#a7d5e2"],
      "fill-opacity":.19}});
  map.addLayer({id:"game-territory-area-outline",type:"line",
    source:"game-territory-areas",minzoom:TERRITORY_AREA_ZOOM,
    paint:{"line-color":["case",["==",["get","owned"],1],["get","color"],"#bce7f2"],
      "line-opacity":.91,"line-width":["interpolate",["linear"],["zoom"],
        15.2,1.6,16,2.0,18,2.7]}});
  map.on("styleimagemissing",event=>createRingIcon(event.id,map,players));
  map.addLayer({id:"game-territory",type:"circle",source:"game-stop-points",
    minzoom:STOP_DOTS_MIN_ZOOM,
    paint:{"circle-color":["get","color"],
      "circle-radius":["interpolate",["linear"],["zoom"],0,1.6,9.5,2,10.65,2.7,12,3.5,14,5,16,5.5,18,4],
      "circle-opacity":.96,
      "circle-stroke-color":"#e2e4e5",
      "circle-stroke-width":["interpolate",["linear"],["zoom"],9,.35,12,.65,15,1.25,18,1.4]}});
  map.addLayer({id:"game-daily-ring",type:"circle",source:"game-stop-points",filter:["==",["get","territoryId"],""],paint:{"circle-color":"rgba(0,0,0,0)","circle-stroke-color":"#e7bf63","circle-stroke-width":2,"circle-radius":["interpolate",["linear"],["zoom"],0,5,12,8,16,10,20,11]}});
  map.addLayer({id:"game-cluster",type:"symbol",source:"game-territories",
    filter:["has","point_count"],minzoom:CLUSTER_VISIBLE_ZOOM,maxzoom:PLATFORM_ZOOM,
    layout:{"icon-image":ringIconExpression(players),
      "icon-size":1,"icon-allow-overlap":true,"icon-ignore-placement":true}});
  map.addLayer({id:"game-cluster-count",type:"symbol",source:"game-territories",
    filter:["has","point_count"],minzoom:CLUSTER_VISIBLE_ZOOM,maxzoom:PLATFORM_ZOOM,
    layout:{"text-field":["to-string",["get","point_count"]],"text-size":12,
      "text-font":["Noto Sans Regular"],"text-allow-overlap":true,"text-ignore-placement":true},
    paint:{"text-color":"#f6f6f6"}});
  map.addLayer({id:"game-territory-label",type:"symbol",source:"game-stop-points",
    minzoom:14.1,maxzoom:PLATFORM_ZOOM,
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
  map.on("click","game-strategic-fill",selectFeature);
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
  for(const id of ["game-strategic-fill","game-territory","game-territory-area-fill","game-platform","game-platform-metro","game-cluster"])
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
    const refreshedTerritories=territoryGeoJSON(territoryPoints,ownership,clusterPlayers);
    map.getSource("game-territories").setData(refreshedTerritories);
    map.getSource("game-stop-points").setData(refreshedTerritories);
    map.getSource("game-owner-borders").setData(
      ownerBoundaryGeoJSON(PID_OWNER_BOUNDARIES,ownership,players));
    map.getSource("game-platforms").setData(platformGeoJSON(territoryPoints,ownership,clusterPlayers));
    const strategic=map.getSource("game-strategic");
    if(strategic)strategic.setData(geoCollection(PID_STRATEGIC_POLYGONS.features.map(f=>({
      ...f,properties:{...f.properties,
        color:ownerColor(f.properties.territoryId,ownership,players),
        owned:players.some(p=>p.id===ownership[f.properties.territoryId]?.owner)?1:0}
    }))));
    refreshVisibleAreas(map);
  }
  // Zvýraznění vybrané zastávky má vlastní hranu i výplň.
  const selectedExpression=["==",["get","territoryId"],selectedId||""];
  map.setPaintProperty("game-territory-area-fill","fill-opacity",
    ["case",selectedExpression,.30,.19]);
  map.setPaintProperty("game-territory-area-outline","line-opacity",
    ["case",selectedExpression,1,.91]);
  for(const id of ["game-territory","game-platform","game-platform-metro"])
    map.setPaintProperty(id,"circle-stroke-width",
      ["case",["==",["get","territoryId"],selectedId||""],3,1.6]);
}

let lastHighlightKey=null;
function refreshGameHighlights(map,ownership,player,filter,visited,dailyId){
 if(!map.getLayer("game-daily-ring"))return;
 const matching=territoryPoints.filter(s=>{const owner=ownership[s.id]?.owner;return filter==="all"||filter==="mine"&&owner===player||filter==="neutral"&&!owner||filter==="others"&&!!owner&&owner!==player;}).filter(s=>!visited||visited.has(s.id)).map(s=>s.id);
 const key=JSON.stringify([matching,dailyId,filter,!!visited]);if(key===lastHighlightKey)return;lastHighlightKey=key;
 const expr=["in",["get","territoryId"],["literal",matching]];
 for(const id of ["game-territory","game-platform","game-platform-metro"])if(map.getLayer(id))map.setPaintProperty(id,"circle-opacity",["case",expr,1,.22]);
 if(map.getLayer("game-strategic-fill"))map.setPaintProperty("game-strategic-fill","fill-opacity",["case",expr,.20,.045]);
 map.setFilter("game-daily-ring",["==",["get","territoryId"],dailyId||""]);
}
