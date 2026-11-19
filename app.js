"use strict";
// Celopražský statický výřez auditu PID 19. 11. 2026, bez odhadovaných bodů.
const STOPS = PID_PRAGUE;
// Simulovaní hráči se strategií dojíždění a lokálními rivalitami.
const PLAYERS=DEMO_PLAYERS;
const BASE={metro:16,train:14,funicular:12,tram:10,trolleybus:8,ferry:6,bus:4};
// Oddělený scénář s deseti hráči a strategickými polygony.
const STORAGE="zastavkobrani-alpha-prague-10players-v1";
const $=id=>document.getElementById(id);
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
  if(mapStopLayersReady)setMapOverlayVisibility(map,layerPrefs);
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

const shortDay=d=>d.toISOString().slice(0,10);
const addDays = (day,n) => shortDay(new Date(Date.parse(day+"T12:00:00Z") + n*86400000));
const diffDays=(a,b)=>Math.round((Date.parse(a+"T12:00:00Z")-Date.parse(b+"T12:00:00Z"))/86400000);
function gameDay(date=new Date()){const f=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});const parts=Object.fromEntries(f.formatToParts(date).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));const d=parts.year+"-"+parts.month+"-"+parts.day;return Number(parts.hour)<3?addDays(d,-1):d;}
function init(withDemo=true){
  const day=gameDay(),now=new Date();
  const stops={},ledger=[],events=[];
  for(const stop of (withDemo?STOPS:[])){
    const owner=demoOwner(stop);
    if(!owner)continue;
    stops[stop.id]={owner,anchor:day,capturedAt:now.toISOString(),protectedUntil:null};
    ledger.push({player:owner,amount:captureScore(stop),type:"demo-seed",day,at:now.toISOString()});
  }
  return {version:1,selected:"p1",stops,ledger,events,visits:{},
    lastClosedDay:addDays(day,-1)};
}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE));if(x&&x.version===1&&x.stops&&Array.isArray(x.ledger))return x;}catch(e){}return init()}
let state=load(),selectedStop=null;
function persist(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function award(player,amount,type,day=gameDay()){state.ledger.push({player,amount,type,day,at:new Date().toISOString()})}
function captureScore(s){let vals=[...new Set(s.cats.map(c=>c==="urban_bus"||c==="regional_bus"?"bus":c))].map(c=>BASE[c]||0).sort((a,b)=>b-a);return vals.length?vals[0]+vals.slice(1).reduce((a,b)=>a+b/2,0):0}
function holdingScore(s){return s.cats.length}
function closeDays(){const today=gameDay();let d=addDays(state.lastClosedDay,1),count=0;while(d<today&&count++<730){for(const s of STOPS){const item=state.stops[s.id];if(!item||!item.owner)continue;const age=diffDays(d,item.anchor)+1;if(age>=1&&age<=7)award(item.owner,holdingScore(s),"holding",d);if(age>=22){state.events.unshift({at:new Date().toISOString(),text:s.name+": vlastnictví vypršelo"});delete state.stops[s.id]}}state.lastClosedDay=d;d=addDays(d,1)}if(count>=730&&d<today){state.lastClosedDay=addDays(today,-1);state.events.unshift({at:new Date().toISOString(),text:"Dlouhá neaktivita: staré uzávěrky přeskočeny (demo režim)."});}persist()}
function remaining(){return Math.max(0,3-state.events.filter(e=>e.action==="capture"&&e.player===state.selected&&e.day===gameDay()).length)}
function owned(){return Object.values(state.stops).filter(v=>v.owner===state.selected).length}
function total(id,days){return state.ledger.filter(x=>x.player===id&&(!days||diffDays(gameDay(),x.day)>=0&&diffDays(gameDay(),x.day)<days)).reduce((a,b)=>a+b.amount,0)}
function challengeStop(){const d=gameDay().replaceAll("-","");let n=0;for(const c of d)n=(n*31+c.charCodeAt(0))>>>0;return STOPS[n%STOPS.length]}
function visitsFor(id){return state.visits[gameDay()]?.[id]||false}
// MapLibre + vlastní vektorový styl. Herní stav zůstává oddělený od podkladu.
const map = new maplibregl.Map({
  container:"map",style:"https://tiles.openfreemap.org/styles/liberty",
  center:[14.44,50.085],zoom:10.65,attributionControl:true
});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-left");
let selectedPlatform=null;
map.on("load",()=>{
  installStopMap(map,STOPS,(id,pointId)=>{
    selectedStop=id;selectedPlatform=pointId;
    note("");
    $("sheet").scrollTop=0;
    openScreen("stop");
  },PLAYERS,state.stops);
  mapStopLayersReady=true;
  setMapOverlayVisibility(map,layerPrefs);
  render();
});
// Základem je funkční oficiální Liberty. Neztrácíme zdroje, glyphs ani sprite.
const mapError=$("map-error");
let baseStyleApplied=false;
let rasterFallback=false;
const mapTimer=setTimeout(()=>{
  if(!map.isStyleLoaded()&&!baseStyleApplied) {
    console.warn("Pomalé načítání OpenFreeMap.");
    mapError.hidden=false;
    mapError.textContent="Načítání mapového podkladu trvá déle než obvykle.";
  }
},15000);
map.on("style.load",()=>{
  if(baseStyleApplied||rasterFallback)return;
  baseStyleApplied=true;
  clearTimeout(mapTimer);
  try {
    const result=applyGameMapStyle(map);
    mapError.hidden=true;
    console.info("Zastávkobraní: minimalistické vrstvy aktivní",result);
  } catch(error) {
    // Když samotná úprava selže, původní mapa má zůstat použitelná.
    console.error("Nepodařilo se upravit mapový styl:",error);
    mapError.hidden=false;
    mapError.textContent="Úprava vzhledu mapy selhala. Zůstává výchozí OpenFreeMap.";
  }
});
map.on("error",event=>console.warn("MapLibre:",event.error?.message||event.error));
let activeScreen="map";
function openScreen(name){
  activeScreen=name;
  const visible=name!=="map";
  $("sheet").hidden=!visible;
  $("scrim").hidden=!visible;
  for(const el of document.querySelectorAll(".screen")) el.hidden=el.id!=="screen-"+name;
  for(const el of document.querySelectorAll(".nav button")) el.classList.toggle("active",el.dataset.screen===name);
  if(name==="map") {selectedStop=null;selectedPlatform=null;}
  render();
}
function note(t){$("message").textContent=t}
$("close").onclick=()=>openScreen("map");
$("scrim").onclick=()=>openScreen("map");
for(const b of document.querySelectorAll(".nav button")) b.onclick=()=>openScreen(b.dataset.screen);
$("show-challenge").onclick=()=>{
  const s=challengeStop();
  selectedStop=s.id;selectedPlatform=null;
  map.flyTo({center:[s.lon,s.lat],zoom:15});
  openScreen("stop");
};
// Výběr GIS vrstvy neuzavírá detail.
document.addEventListener("keydown",e=>{if(e.key==="Escape")openScreen("map")});
function render(){closeDays();const p=PLAYERS.find(x=>x.id===state.selected);$("player").value=state.selected;$("profile").textContent=p.name;$("remaining").textContent=remaining()+"/3";$("owned").textContent=owned();$("points").textContent=total(p.id);$("clock").textContent="Herní den: "+gameDay()+" · uzávěrka ve 03:00 (Praha)";
refreshStopMapColors(map,state.stops,PLAYERS,selectedStop);
const s=STOPS.find(x=>x.id===selectedStop),rec=s&&state.stops[s.id];
$("stopname").textContent=s?.name||"Vyber zastávku na mapě";
const owner=rec&&PLAYERS.find(p=>p.id===rec.owner);
const mine=!!rec?.owner&&rec.owner===state.selected;
const protectionEnd=rec?.protectedUntil?Date.parse(rec.protectedUntil):0;
const protectedNow=!!rec?.owner&&protectionEnd>Date.now();
const protectionOther=protectedNow&&!mine;
const maintenanceDays=mine&&rec?.anchor?Math.max(0,7-diffDays(gameDay(),rec.anchor)):null;
$("sheet").classList.toggle("sheet-stop",activeScreen==="stop");
$("sheet").style.setProperty("--sheet-owner-color",owner?.color||"#929292");
$("stop-owner-heading").textContent=owner?"Vlastní "+owner.name:"Neutrální zastávka";
$("stop-owner-heading").style.color=owner?.color||"#b1b3b5";
$("stopdetail").innerHTML=s?stopCardHtml({
  stop:s,record:rec,owner,selectedPlayer:state.selected,
  gameDay:gameDay(),diffDays,captureScore,holdingScore
}):"";
$("capture").disabled=!s||mine||protectedNow||remaining()===0;
$("capture").textContent=mine?"Tvoje zastávka":protectionOther?
  "Převzetí za "+stopCountdown(rec.protectedUntil):remaining()===0?
  "Vyčerpány pokusy":rec?.owner?"Simulovat převzetí":"Simulovat obsazení";
$("maintain").disabled=!s||!mine||maintenanceDays>0;
$("maintain").textContent=!mine?"Údržba":maintenanceDays>0?
  "Údržba za "+maintenanceDays+" dní":"Simulovat údržbu";
const challenge=challengeStop();$("challenge").textContent=challenge.name;$("challengeinfo").textContent=visitsFor(state.selected)?"Dnešní výzva splněna.":"Jedna společná zastávka pro všechny hráče · demo návštěva.";$("visit").disabled=selectedStop!==challenge.id||visitsFor(state.selected);
$("leaderboard").innerHTML=PLAYERS.slice().sort((a,b)=>total(b.id,30)-total(a.id,30)).map(p=>'<div class="listrow"><span><span style="color:'+p.color+'">●</span> '+p.name+'</span> <b>'+total(p.id,30)+' b.</b></div>').join("");
$("events").innerHTML=state.events.slice(0,8).map(e=>'<div class="listrow">'+e.text+'</div>').join("")||"Zatím žádné události.";}
$("player").innerHTML=PLAYERS.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join("");
$("player").addEventListener("change",e=>{state.selected=e.target.value;persist();note("");render()});
$("capture").onclick=()=>{const s=STOPS.find(x=>x.id===selectedStop);if(!s)return;const rec=state.stops[s.id];if(remaining()===0||rec?.owner===state.selected||(rec?.protectedUntil&&Date.now()<Date.parse(rec.protectedUntil))){render();return}const day=gameDay(),now=new Date();state.stops[s.id]={owner:state.selected,anchor:day,capturedAt:now.toISOString(),protectedUntil:new Date(now.getTime()+86400000).toISOString()};const points=captureScore(s);award(state.selected,points,"capture");state.events.unshift({action:"capture",player:state.selected,day,at:now.toISOString(),text:PLAYERS.find(p=>p.id===state.selected).name+" obsadil/a "+s.name+" (+"+points+" b.)"});persist();note("Obsazeno v simulačním režimu.");render()};
$("maintain").onclick=()=>{const s=STOPS.find(x=>x.id===selectedStop),rec=s&&state.stops[s.id];if(!rec||rec.owner!==state.selected||diffDays(gameDay(),rec.anchor)<7)return;rec.anchor=gameDay();state.events.unshift({at:new Date().toISOString(),text:PLAYERS.find(p=>p.id===state.selected).name+" provedl/a údržbu: "+s.name});persist();note("Údržba provedena. Ochrana se neobnovila.");render()};
$("visit").onclick=()=>{const s=challengeStop();if(selectedStop!==s.id||visitsFor(state.selected))return;state.visits[gameDay()]??={};state.visits[gameDay()][state.selected]=true;state.events.unshift({at:new Date().toISOString(),text:"Návštěva zastávky dne: "+s.name});persist();note("Výzva splněna. Bodová odměna zatím není schválena.");render()};
$("reset").onclick=()=>{if(!confirm("Opravdu smazat lokální testovací stav všech deseti hráčů?"))return;localStorage.removeItem(STORAGE);state=init(false);persist();selectedStop=null;note("Test byl vynulován.");openScreen("profile")};
window.addEventListener("storage",e=>{if(e.key===STORAGE){state=load();render()}});render();
setInterval(()=>{
  if(activeScreen==="stop"&&selectedStop){
    const record=state.stops[selectedStop];
    const remainingMs=record?.protectedUntil?Date.parse(record.protectedUntil)-Date.now():0;
    const counter=$("stopdetail").querySelector("[data-protection-countdown]");
    if(counter&&remainingMs>0)counter.textContent=stopCountdown(record.protectedUntil);
    const other=record?.owner!==state.selected;
    if(other&&remainingMs>0){
      $("capture").disabled=true;
      $("capture").textContent="Převzetí za "+stopCountdown(record.protectedUntil);
    }else if(counter&&remainingMs<=0)render();
  }
},1000);
setInterval(()=>{render()},60000);

// GPS je pouze orientační, bez ukládání či serverového ověřování.
let gpsWatch=null, gpsMarker=null, gpsPosition=null;
const gpsButton=$("gps-toggle"), gpsStatus=$("gps-status");
function gpsMessage(text) {gpsStatus.hidden=!text;gpsStatus.textContent=text;}
function accuracyPolygon(lng,lat,radius) {
  const coords=[];
  const latM=111320, lonM=111320*Math.cos(lat*Math.PI/180);
  for(let i=0;i<=64;i++){
    const angle=i*Math.PI/32;
    coords.push([lng+Math.cos(angle)*radius/lonM,lat+Math.sin(angle)*radius/latM]);
  }
  return {type:"Feature",geometry:{type:"Polygon",coordinates:[coords]},properties:{}};
}
function drawAccuracy(){
  if(!gpsPosition||!map.isStyleLoaded())return;
  const point=accuracyPolygon(gpsPosition.lng,gpsPosition.lat,gpsPosition.accuracy);
  if(!map.getSource("gps-accuracy")) {
    map.addSource("gps-accuracy",{type:"geojson",data:point});
    map.addLayer({id:"gps-area",type:"fill",source:"gps-accuracy",
      paint:{"fill-color":"#36a7e2","fill-opacity":.12}});
    map.addLayer({id:"gps-outline",type:"line",source:"gps-accuracy",
      paint:{"line-color":"#36a7e2","line-width":1.5}});
  } else map.getSource("gps-accuracy").setData(point);
}
map.on("style.load",drawAccuracy);
function disableGps(){
  if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch=null;gpsPosition=null;
  if(gpsMarker){gpsMarker.remove();gpsMarker=null;}
  if(map.getSource("gps-accuracy"))map.getSource("gps-accuracy").setData({
    type:"FeatureCollection",features:[]});
  gpsButton.setAttribute("aria-pressed","false");
  gpsButton.querySelector("span").textContent="Zapnout GPS";
  gpsMessage("");
}
function gpsError(error){
  gpsMessage(({1:"Přístup k GPS byl zamítnut.",2:"GPS polohu nelze určit.",3:"Časový limit GPS vypršel."})[error.code]||"GPS není dostupná.");
  if(error.code===1) {
    if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);
    gpsWatch=null;
    gpsButton.setAttribute("aria-pressed","false");
    gpsButton.querySelector("span").textContent="Zapnout GPS";
  }
}
gpsButton.addEventListener("click",()=>{
  if(gpsWatch!==null){disableGps();return;}
  if(!navigator.geolocation||!window.isSecureContext){
    gpsMessage("GPS vyžaduje HTTPS a podporu polohy v prohlížeči.");return;
  }
  gpsMessage("Zjišťuji polohu…");
  gpsButton.setAttribute("aria-pressed","true");
  gpsButton.querySelector("span").textContent="Vypnout GPS";
  gpsWatch=navigator.geolocation.watchPosition(({coords})=>{
    gpsPosition={lng:coords.longitude,lat:coords.latitude,accuracy:Math.max(1,coords.accuracy||1)};
    if(!gpsMarker){
      const el=document.createElement("div");el.className="gps-dot";
      gpsMarker=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([gpsPosition.lng,gpsPosition.lat]).addTo(map);
      map.flyTo({center:[gpsPosition.lng,gpsPosition.lat],zoom:Math.max(map.getZoom(),15)});
    }else gpsMarker.setLngLat([gpsPosition.lng,gpsPosition.lat]);
    drawAccuracy();
    gpsMessage("GPS přesnost ±"+Math.round(gpsPosition.accuracy)+" m · pouze orientační");
  },gpsError,{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
});
