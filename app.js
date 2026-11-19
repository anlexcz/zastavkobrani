"use strict";
// DEMO fixtures: orientační body pouze pro ověření UI a herní logiky.
// 14 skutečných PID skupin a jejich fyzické body.
const STOPS = PID_KOBYLISY;
const PLAYERS=[{id:"p1",name:"Hráč 1",color:"#ef4444"},{id:"p2",name:"Hráč 2",color:"#3b82f6"},{id:"p3",name:"Hráč 3",color:"#22c55e"}];
const BASE={metro:16,train:14,funicular:12,tram:10,trolleybus:8,ferry:6,bus:4};
// Oddělený vizuální demo scénář, původní uložená Alpha 1.2 zůstává nedotčena.
const STORAGE="zastavkobrani-alpha-owners-v1";
// 10 ze 14 území (~71 %) je předem rozdělených mezi tři demo hráče.
const DEMO_OWNER_NAMES={
  "Kobylisy":"p1",
  "Služská":"p2",
  "Ke Stírce":"p3",
  "Střelničná":"p2",
  "Březiněveská":"p1",
  "Líbeznická":"p3",
  "Vozovna Kobylisy":"p1",
  "Mirovická":"p2",
  "Vychovatelna":"p3",
  "Hercovka":"p1"
};
const $=id=>document.getElementById(id);
const shortDay=d=>d.toISOString().slice(0,10);
const addDays = (day,n) => shortDay(new Date(Date.parse(day+"T12:00:00Z") + n*86400000));
const diffDays=(a,b)=>Math.round((Date.parse(a+"T12:00:00Z")-Date.parse(b+"T12:00:00Z"))/86400000);
function gameDay(date=new Date()){const f=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});const parts=Object.fromEntries(f.formatToParts(date).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));const d=parts.year+"-"+parts.month+"-"+parts.day;return Number(parts.hour)<3?addDays(d,-1):d;}
function init(){
  const day=gameDay(),now=new Date();
  const stops={},ledger=[],events=[];
  for(const stop of STOPS){
    const owner=DEMO_OWNER_NAMES[stop.name];
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
  center:[14.454,50.126],zoom:15.5,attributionControl:true
});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-left");
let selectedPlatform=null;
map.on("load",()=>{
  installStopMap(map,STOPS,(id,pointId)=>{
    selectedStop=id;selectedPlatform=pointId;openScreen("stop");
  });
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
const s=STOPS.find(x=>x.id===selectedStop),rec=s&&state.stops[s.id];$("stopname").textContent=s?.name||"Vyber zastávku na mapě";const owner=rec&&PLAYERS.find(p=>p.id===rec.owner);const protectedNow=rec?.protectedUntil&&Date.now()<Date.parse(rec.protectedUntil);$("stopdetail").innerHTML=s
 ? '<span class="pill">'+s.cats.join(" + ")+'</span>'+
   '<p>Vlastník: <b>'+(owner?.name||"Neutrální")+'</b></p>'+
   '<p>Obsazení: '+captureScore(s)+' bodů · držení: '+holdingScore(s)+' bodů/den</p>'+
   '<p><b>'+s.points.length+' stanovišť PID</b> tvoří jedno herní území.</p>'+
   (selectedPlatform?'<p>Vybrané nástupiště: <b>'+s.points.find(p=>p.id===selectedPlatform)?.platform+'</b> ('+selectedPlatform+')</p>':'')+
   '<p class="notice">GPS okruhy 30 m jsou pouze náhled. Žádný bod není zatím schválen pro skutečné obsazení.</p>'+
   '<div class="platform-list">'+s.points.map(p=>'<button type="button" data-platform="'+p.id+'">'+p.platform+(p.isMetro?' · metro':'')+'</button>').join("")+'</div>'+
   (protectedNow?'<p>Ochrana do '+new Date(rec.protectedUntil).toLocaleString("cs-CZ")+'</p>':'')
 : 'Klepni na bod zastávky.';
for(const el of $("stopdetail").querySelectorAll("[data-platform]")){
  el.onclick=()=>{
    const point=s.points.find(p=>p.id===el.dataset.platform);
    if(!point)return;
    selectedPlatform=point.id;
    map.flyTo({center:[point.lon,point.lat],zoom:18.2});
    render();
  };
}
$("capture").disabled=!s||!!(rec?.owner===state.selected)||!!protectedNow||remaining()===0;
$("capture").textContent=rec?.owner?"Převzít":"Obsadit";
$("maintain").disabled=!s||rec?.owner!==state.selected||diffDays(gameDay(),rec.anchor)<7;
const challenge=challengeStop();$("challenge").textContent=challenge.name;$("challengeinfo").textContent=visitsFor(state.selected)?"Dnešní výzva splněna.":"Jedna společná zastávka pro všechny hráče · demo návštěva.";$("visit").disabled=selectedStop!==challenge.id||visitsFor(state.selected);
$("leaderboard").innerHTML=PLAYERS.slice().sort((a,b)=>total(b.id,30)-total(a.id,30)).map(p=>'<div class="listrow"><span><span style="color:'+p.color+'">●</span> '+p.name+'</span> <b>'+total(p.id,30)+' b.</b></div>').join("");
$("events").innerHTML=state.events.slice(0,8).map(e=>'<div class="listrow">'+e.text+'</div>').join("")||"Zatím žádné události.";}
$("player").innerHTML=PLAYERS.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join("");
$("player").addEventListener("change",e=>{state.selected=e.target.value;persist();note("");render()});
$("capture").onclick=()=>{const s=STOPS.find(x=>x.id===selectedStop);if(!s)return;const rec=state.stops[s.id];if(remaining()===0||rec?.owner===state.selected||(rec?.protectedUntil&&Date.now()<Date.parse(rec.protectedUntil))){render();return}const day=gameDay(),now=new Date();state.stops[s.id]={owner:state.selected,anchor:day,capturedAt:now.toISOString(),protectedUntil:new Date(now.getTime()+86400000).toISOString()};const points=captureScore(s);award(state.selected,points,"capture");state.events.unshift({action:"capture",player:state.selected,day,at:now.toISOString(),text:PLAYERS.find(p=>p.id===state.selected).name+" obsadil/a "+s.name+" (+"+points+" b.)"});persist();note("Obsazeno v simulačním režimu.");render()};
$("maintain").onclick=()=>{const s=STOPS.find(x=>x.id===selectedStop),rec=s&&state.stops[s.id];if(!rec||rec.owner!==state.selected||diffDays(gameDay(),rec.anchor)<7)return;rec.anchor=gameDay();state.events.unshift({at:new Date().toISOString(),text:PLAYERS.find(p=>p.id===state.selected).name+" provedl/a údržbu: "+s.name});persist();note("Údržba provedena. Ochrana se neobnovila.");render()};
$("visit").onclick=()=>{const s=challengeStop();if(selectedStop!==s.id||visitsFor(state.selected))return;state.visits[gameDay()]??={};state.visits[gameDay()][state.selected]=true;state.events.unshift({at:new Date().toISOString(),text:"Návštěva zastávky dne: "+s.name});persist();note("Výzva splněna. Bodová odměna zatím není schválena.");render()};
$("reset").onclick=()=>{if(!confirm("Opravdu smazat všechna lokální testovací data všech tří hráčů?"))return;localStorage.removeItem(STORAGE);state=init();selectedStop=null;note("Test byl vynulován.");openScreen("profile")};
window.addEventListener("storage",e=>{if(e.key===STORAGE){state=load();render()}});render();setInterval(()=>{render()},60000);

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
