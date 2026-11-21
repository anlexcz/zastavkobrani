"use strict";
// Celopražský statický výřez auditu PID 19. 11. 2026, bez odhadovaných bodů.
const STOPS = PID_PRAGUE;
// Dva testovací profily, sdílející stav pouze v tomto prohlížeči.
const PLAYERS=DEMO_PLAYERS;
// Všechny hodnoty a rozpisy jsou v samostatném scoring.js.
// Oddělený scénář s deseti hráči a strategickými polygony.
const STORAGE="zastavkobrani-gps-two-players-v1";
const FIELD_TEST_UNLIMITED_CAPTURES=true;
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
function init(withSeed=true){
  const day=gameDay(),now=new Date();
  const stops={},ledger=[],events=[];
  if(withSeed)for(const name of ROUTE_22_SEED){
    const stop=STOPS.find(s=>s.name===name&&s.cats.includes("tram"));
    if(!stop)continue;
    stops[stop.id]={owner:"p2",anchor:day,capturedAt:now.toISOString(),protectedUntil:null};
    // Výchozí majetek druhého profilu není herní akcí a nevytváří body za obsazení.
  }
  return {version:2,selected:"p1",stops,ledger,events,visits:{},
    lastClosedDay:addDays(day,-1)};
}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE));if(x&&x.version===2&&x.stops&&Array.isArray(x.ledger))return x;}catch(e){}return init()}
let state=load(),selectedStop=null;
// GPS stav je dostupný už při prvním renderování aplikace.
let gpsBusy=false,gpsPermissionDenied=false;
let gpsWatch=null,gpsMarker=null,gpsPosition=null;
function persist(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function award(player,amount,type,day=gameDay()){state.ledger.push({player,amount,type,day,at:new Date().toISOString()})}
function captureScore(s){return captureBreakdown(s,{bonuses:ACTIVE_SCORE_BONUSES}).total}
function holdingScore(s){return holdingBreakdown(s,{bonuses:ACTIVE_SCORE_BONUSES}).total}
function closeDays(){const today=gameDay();let d=addDays(state.lastClosedDay,1),count=0;while(d<today&&count++<730){for(const s of STOPS){const item=state.stops[s.id];if(!item||!item.owner)continue;const age=diffDays(d,item.anchor)+1;if(age>=1&&age<=7)award(item.owner,holdingScore(s),"holding",d);if(age>=22){state.events.unshift({at:new Date().toISOString(),text:s.name+": vlastnictví vypršelo"});delete state.stops[s.id]}}state.lastClosedDay=d;d=addDays(d,1)}if(count>=730&&d<today){state.lastClosedDay=addDays(today,-1);state.events.unshift({at:new Date().toISOString(),text:"Dlouhá neaktivita: staré uzávěrky přeskočeny (demo režim)."});}persist()}
function remaining(){return FIELD_TEST_UNLIMITED_CAPTURES?Infinity:Math.max(0,3-state.events.filter(e=>e.action==="capture"&&e.player===state.selected&&e.day===gameDay()).length)}
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
    confirmingCapture=false;
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
  closeScoreDetailIfOpen();
  activeScreen=name;
  const visible=name!=="map";
  $("sheet").hidden=!visible;
  $("scrim").hidden=!visible;
  for(const el of document.querySelectorAll(".screen")) el.hidden=el.id!=="screen-"+name;
  for(const el of document.querySelectorAll(".nav button")) el.classList.toggle("active",el.dataset.screen===name);
  if(name==="map") {selectedStop=null;selectedPlatform=null;confirmingCapture=false;}
  render();
}
function note(t){$("message").textContent=t}
function closeScoreDetailIfOpen(){if(!$("score-dialog-overlay").hidden)closeScoreDetail()}
let confirmingCapture=false;
$("close").onclick=()=>openScreen("map");
$("scrim").onclick=()=>openScreen("map");
// Překryvný rozpis bodů. Bez změny zvoleného území či herního stavu.
let scoreDetailType=null,scoreDialogReturnFocus=null;
const scoreDialog=$("score-dialog-overlay");
function closeScoreDetail(){
  if(scoreDialog.hidden)return;
  scoreDialog.hidden=true;scoreDetailType=null;
  scoreDialogReturnFocus?.focus?.();scoreDialogReturnFocus=null;
}
function scoreDetailRow(label,value,extraClass=""){
  return '<div class="score-detail-row '+extraClass+'"><span>'+
    escapeStopText(label)+'</span><strong>'+escapeStopText(value)+'</strong></div>';
}
function showScoreDetail(kind){
  const stop=STOPS.find(s=>s.id===selectedStop);
  if(!stop)return;
  const record=state.stops[stop.id];
  const context={ownerRecord:record,gameDay:gameDay(),diffDays,
    bonuses:ACTIVE_SCORE_BONUSES};
  const detail=kind==="capture"?captureBreakdown(stop,context):holdingBreakdown(stop,context);
  scoreDetailType=kind;
  scoreDialogReturnFocus=document.activeElement;
  $("score-dialog-title").textContent=kind==="capture"?"Body za obsazení":"Body denně";
  $("score-dialog-stop").textContent=stop.name;
  const body=detail.lines.map(line=>scoreDetailRow(
    line.label+(kind==="capture"&&line.multiplier!==1?" (50 %)":""),
    line.amount+" b."
  )).join("");
  const adjustment=detail.holdingAdjustment
    ?scoreDetailRow("Stáří zastávky – bez denního výnosu",
        detail.holdingAdjustment+" b.","score-detail-adjustment"):"";
  const bonuses=detail.bonusLines.length
    ?detail.bonusLines.map(b=>scoreDetailRow(b.label,"+"+b.amount+" b.")).join("")
    :'<p class="score-detail-empty">Žádné aktuálně platné bonusy</p>';
  $("score-dialog-lines").innerHTML=body+adjustment+
    '<div class="score-detail-subtitle">Bonusy</div>'+bonuses+
    scoreDetailRow("Celkem",detail.total+" b.","score-detail-total");
  scoreDialog.hidden=false;
  $("score-dialog-close").focus();
}
$("stopdetail").addEventListener("click",event=>{
  const metric=event.target.closest("[data-score-detail]");
  if(metric)showScoreDetail(metric.dataset.scoreDetail);
});
$("score-dialog-close").onclick=closeScoreDetail;
scoreDialog.addEventListener("click",event=>{
  if(event.target===scoreDialog)closeScoreDetail();
});
document.addEventListener("keydown",event=>{
  if(scoreDialog.hidden)return;
  if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeScoreDetail();}
  if(event.key==="Tab"){
    // Překryv obsahuje jediný interaktivní prvek, zavírací tlačítko.
    event.preventDefault();$("score-dialog-close").focus();
  }
},true);

for(const b of document.querySelectorAll(".nav button")) b.onclick=()=>openScreen(b.dataset.screen);
$("show-challenge").onclick=()=>{
  const s=challengeStop();
  selectedStop=s.id;selectedPlatform=null;
  map.flyTo({center:[s.lon,s.lat],zoom:15});
  openScreen("stop");
};
// Výběr GIS vrstvy neuzavírá detail.
document.addEventListener("keydown",e=>{if(e.key==="Escape")openScreen("map")});
function render(){closeDays();const p=PLAYERS.find(x=>x.id===state.selected);$("player").value=state.selected;$("profile").textContent=p.name;$("remaining").textContent=FIELD_TEST_UNLIMITED_CAPTURES?"∞":remaining()+"/3";$("owned").textContent=owned();$("points").textContent=total(p.id);$("clock").textContent="Herní den: "+gameDay()+" · uzávěrka ve 03:00 (Praha)";
refreshStopMapColors(map,state.stops,PLAYERS,selectedStop);
const s=STOPS.find(x=>x.id===selectedStop),rec=s&&state.stops[s.id];
$("stopname").textContent=s?.name||"Vyber zastávku na mapě";
const owner=rec&&PLAYERS.find(p=>p.id===rec.owner);
const mine=!!rec?.owner&&rec.owner===state.selected;
const protectionEnd=rec?.protectedUntil?Date.parse(rec.protectedUntil):0;
const protectedNow=!!rec?.owner&&protectionEnd>Date.now();
const protectionOther=protectedNow&&!mine;
const maintenanceDays=mine&&rec?.anchor?Math.max(0,7-diffDays(gameDay(),rec.anchor)):null;
const selfCooldown=state.events.some(e=>e.action==="capture"&&e.player===state.selected&&e.stopId===s?.id&&Date.now()-Date.parse(e.at)<86400000);
const locationState=s?stopLocationState(s):{ok:false,status:"Poloha nedostupná",distance:null};
const captureTimeBlocked=mine||protectionOther||remaining()===0||selfCooldown;
const maintainTimeBlocked=!mine||maintenanceDays>0;
$("sheet").classList.toggle("sheet-stop",activeScreen==="stop");
$("sheet").style.setProperty("--sheet-owner-color",owner?.color||"#929292");
$("stop-owner-heading").textContent=owner?"Vlastní "+owner.name:"Neobsazená zastávka";
$("stop-owner-heading").style.color="var(--muted)";
$("stopdetail").innerHTML=s?stopCardHtml({
  stop:s,record:rec,owner,selectedPlayer:state.selected,
  gameDay:gameDay(),diffDays,captureScore,holdingScore
}):"";
const capture=$("capture"),maintain=$("maintain");
capture.hidden=mine;maintain.hidden=!mine;
capture.disabled=!s||captureTimeBlocked||!locationState.ok||gpsBusy;
capture.dataset.block=captureTimeBlocked?"time":locationState.ok?"":"location";
capture.textContent=mine?"Tvoje zastávka":protectionOther?
  "Převzetí za "+stopCountdown(rec.protectedUntil):remaining()===0?
  "Vyčerpány pokusy":selfCooldown?"Znovu až za 24 h":"Obsadit zastávku";
maintain.disabled=!s||maintainTimeBlocked||!locationState.ok||gpsBusy;
maintain.dataset.block=maintainTimeBlocked?"time":locationState.ok?"":"location";
maintain.textContent=maintenanceDays>0?"Udržet zastávku · za "+maintenanceDays+" dní":"Udržet zastávku";
$("stop-location-status").textContent=locationState.status;
$("stop-distance").textContent=locationState.distance===null?"—":formatStopDistance(locationState.distance);
$("stop-request-location").hidden=!!gpsWatch&&!!gpsPosition;
$("stop-request-location").textContent=gpsPermissionDenied?"Povolení GPS":"Povolit polohu";
$("stop-confirm").hidden=!confirmingCapture||!s||mine;
$("capture").hidden=mine||confirmingCapture;
$("actions").classList.toggle("is-confirming",confirmingCapture&&!mine);
$("confirm-yes").disabled=captureTimeBlocked||!locationState.ok||gpsBusy;
$("stop-location").hidden=activeScreen!=="stop";
const challenge=challengeStop();$("challenge").textContent=challenge.name;$("challengeinfo").textContent=visitsFor(state.selected)?"Dnešní výzva splněna.":"Jedna společná zastávka pro všechny hráče · návštěva vyžaduje GPS.";$("visit").disabled=selectedStop!==challenge.id||visitsFor(state.selected);
$("leaderboard").innerHTML=PLAYERS.slice().sort((a,b)=>total(b.id,30)-total(a.id,30)).map(p=>'<div class="listrow"><span><span style="color:'+p.color+'">●</span> '+p.name+'</span> <b>'+total(p.id,30)+' b.</b></div>').join("");
$("events").innerHTML=state.events.slice(0,8).map(e=>'<div class="listrow">'+e.text+'</div>').join("")||"Zatím žádné události.";}
$("player").innerHTML=PLAYERS.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join("");
$("player").addEventListener("change",e=>{state.selected=e.target.value;confirmingCapture=false;persist();note("");render()});
// GPS kontrolujeme vždy novým měřením v okamžiku akce; poloha z mapy nestačí.
const GPS_STALE_MS=15000;
function formatStopDistance(distance){
  if(distance<1000)return Math.round(distance)+" m";
  if(distance<10000)return (distance/1000).toFixed(1).replace(".",",")+" km";
  return Math.round(distance/1000)+" km";
}
function stopLocationState(stop,now=Date.now()){
  if(gpsPermissionDenied)return {ok:false,status:"Poloha zamítnuta",distance:null};
  if(!gpsPosition)return {ok:false,status:gpsWatch!==null?"Zjišťování polohy":"Poloha nedostupná",distance:null};
  const distance=nearestStopDistance(stop,{latitude:gpsPosition.lat,longitude:gpsPosition.lng});
  if(!Number.isFinite(distance))return {ok:false,status:"GPS bod není dostupný",distance:null};
  if(now-gpsPosition.timestamp>GPS_STALE_MS)return {ok:false,status:"Poloha není aktuální",distance};
  if(gpsPosition.accuracy>30)return {ok:false,status:"Nepřesná GPS (±"+Math.round(gpsPosition.accuracy)+" m)",distance};
  return {ok:distance<=30,status:distance<=30?"V dosahu 30 m":"Mimo dosah 30 m",distance};
}
function haversineM(a,b,c,d){
  const rad=Math.PI/180,dl=(c-a)*rad,doLon=(d-b)*rad;
  const h=Math.sin(dl/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(doLon/2)**2;
  return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
function nearestStopDistance(stop,coords){
  return Math.min(...stop.points.filter(p=>!p.isMetro&&p.insidePrague).map(p=>
    haversineM(coords.latitude,coords.longitude,p.lat,p.lon)));
}
function verifyGps(stop){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation||!window.isSecureContext){
      reject(Error("Pro ověření polohy je nutné HTTPS a přístup ke GPS."));return;
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const age=Date.now()-pos.timestamp;
        const accuracy=pos.coords.accuracy;
        const distance=nearestStopDistance(stop,pos.coords);
        if(age>10000){reject(Error("GPS měření je zastaralé. Zkus to znovu."));return;}
        if(!Number.isFinite(accuracy)||accuracy>30){
          reject(Error("GPS zatím není dost přesná (±"+Math.round(accuracy)+" m). Potřebujeme přesnost nejvýše 30 m."));return;
        }
        if(!Number.isFinite(distance)||distance>30){
          reject(Error("Jsi "+Math.round(distance)+" m od nejbližšího bodu zastávky. Limit je 30 m."));return;
        }
        resolve({distance,accuracy,lat:pos.coords.latitude,lon:pos.coords.longitude});
      },
      err=>reject(Error(({1:"Poloha byla zamítnuta. Povol ji v nastavení prohlížeče.",2:"Polohu se nepodařilo zjistit.",3:"GPS nestihla polohu určit."})[err.code]||"GPS není dostupná.")),
      {enableHighAccuracy:true,maximumAge:0,timeout:20000}
    );
  });
}
async function doGpsAction(action){
  const stop=STOPS.find(s=>s.id===selectedStop);
  if(!stop||gpsBusy)return;
  if(!stopLocationState(stop).ok){note("Nejsi v ověřeném 30m dosahu zastávky.");render();return;}
  const startingPlayer=state.selected, startingStop=selectedStop;
  const validate=()=>{
    if(state.selected!==startingPlayer||selectedStop!==startingStop)return "Během ověřování se změnil hráč nebo zastávka.";
    const rec=state.stops[stop.id],now=Date.now();
    if(action==="capture"){
      if(rec?.owner===startingPlayer)return "Zastávku už vlastníš.";
      if(rec?.protectedUntil&&Date.parse(rec.protectedUntil)>now)return "Zastávka je chráněná.";
      if(remaining()<=0)return "Dnešní limit obsazení je vyčerpán.";
      if(state.events.some(e=>e.action==="capture"&&e.player===startingPlayer&&e.stopId===stop.id&&now-Date.parse(e.at)<86400000))return "Tuto zastávku můžeš znovu obsadit až po 24 hodinách.";
    }
    if(action==="maintain"&&(!rec||rec.owner!==startingPlayer||diffDays(gameDay(),rec.anchor)<7))return "Údržba zatím není dostupná.";
    if(action==="visit"&&(challengeStop().id!==stop.id||visitsFor(startingPlayer)))return "Dnešní návštěvu nelze splnit.";
    return "";
  };
  const invalid=validate();if(invalid){note(invalid);render();return;}
  gpsBusy=true;note("Ověřuji aktuální GPS polohu…");render();
  try{
    const location=await verifyGps(stop);
    const changed=validate();if(changed)throw Error(changed);
    const now=new Date(),day=gameDay(),player=PLAYERS.find(p=>p.id===startingPlayer);
    if(action==="capture"){
      const previous=state.stops[stop.id]?.owner||null;
      state.stops[stop.id]={owner:startingPlayer,anchor:day,capturedAt:now.toISOString(),protectedUntil:new Date(now.getTime()+86400000).toISOString()};
      const points=captureScore(stop);award(startingPlayer,points,"capture");
      state.events.unshift({action:"capture",stopId:stop.id,player:startingPlayer,day,at:now.toISOString(),previousOwner:previous,text:player.name+" obsadil/a "+stop.name+" (+"+points+" b.)"});
    }else if(action==="maintain"){
      state.stops[stop.id].anchor=day;
      state.events.unshift({action:"maintain",stopId:stop.id,player:startingPlayer,day,at:now.toISOString(),text:player.name+" provedl/a údržbu: "+stop.name});
    }else{
      state.visits[day]??={};state.visits[day][startingPlayer]=true;
      state.events.unshift({action:"visit",stopId:stop.id,player:startingPlayer,day,at:now.toISOString(),text:"Návštěva zastávky dne: "+stop.name});
    }
    persist();note("GPS ověřena: "+Math.round(location.distance)+" m od zastávky, přesnost ±"+Math.round(location.accuracy)+" m. Akce zapsána do lokální testovací hry.");
  }catch(error){note(error.message||"GPS ověření selhalo.");}
  finally{gpsBusy=false;render();}
}
$("capture").onclick=()=>{
  const stop=STOPS.find(s=>s.id===selectedStop);
  if(!stop||!stopLocationState(stop).ok||$("capture").disabled)return;
  confirmingCapture=true;render();
};
$("confirm-no").onclick=()=>{confirmingCapture=false;render()};
$("confirm-yes").onclick=()=>{
  if($("confirm-yes").disabled)return;
  confirmingCapture=false;
  render();
  if(!$("capture").disabled)doGpsAction("capture");
};
$("maintain").onclick=()=>doGpsAction("maintain");
$("visit").onclick=()=>{selectedStop=challengeStop().id;doGpsAction("visit");};
$("reset").onclick=()=>{if(!confirm("Opravdu resetovat oba testovací hráče do výchozího stavu?"))return;localStorage.removeItem(STORAGE);state=init(true);persist();selectedStop=null;note("Test byl vynulován.");openScreen("profile")};
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
setInterval(()=>{render()},5000);

// Vizuální sledování GPS. Akce samostatně vyžadují nové přesné měření.
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
  gpsWatch=null;gpsPosition=null;gpsPermissionDenied=false;render();
  if(gpsMarker){gpsMarker.remove();gpsMarker=null;}
  if(map.getSource("gps-accuracy"))map.getSource("gps-accuracy").setData({
    type:"FeatureCollection",features:[]});
  gpsButton.setAttribute("aria-pressed","false");
  gpsButton.querySelector("span").textContent="Zapnout GPS";
  gpsMessage("");
}
function gpsError(error){
  gpsPermissionDenied=error.code===1;
  gpsPosition=null;
  gpsMessage(({1:"Přístup k GPS byl zamítnut.",2:"GPS polohu nelze určit.",3:"Časový limit GPS vypršel."})[error.code]||"GPS není dostupná.");
  if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch=null;
  gpsButton.setAttribute("aria-pressed","false");
  gpsButton.querySelector("span").textContent="Zapnout GPS";
  render();
}
function requestGps(){
  gpsPermissionDenied=false;
  if(gpsWatch!==null){render();return;}
  if(!navigator.geolocation||!window.isSecureContext){
    gpsMessage("GPS vyžaduje HTTPS a podporu polohy v prohlížeči.");return;
  }
  gpsMessage("Zjišťuji polohu…");
  gpsButton.setAttribute("aria-pressed","true");
  gpsButton.querySelector("span").textContent="Vypnout GPS";
  gpsWatch=navigator.geolocation.watchPosition((position)=>{
    const coords=position.coords;
    gpsPosition={lng:coords.longitude,lat:coords.latitude,
      accuracy:Math.max(1,coords.accuracy||Infinity),timestamp:position.timestamp};
    gpsPermissionDenied=false;
    if(!gpsMarker){
      const el=document.createElement("div");el.className="gps-dot";
      gpsMarker=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([gpsPosition.lng,gpsPosition.lat]).addTo(map);
      map.flyTo({center:[gpsPosition.lng,gpsPosition.lat],zoom:Math.max(map.getZoom(),15)});
    }else gpsMarker.setLngLat([gpsPosition.lng,gpsPosition.lat]);
    drawAccuracy();
    gpsMessage("GPS přesnost ±"+Math.round(gpsPosition.accuracy)+" m · akce kontrolují nové měření");
    render();
  },gpsError,{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  render();
}
$("stop-request-location").onclick=()=>{
  if(gpsPermissionDenied){note("Povol polohu v nastavení oprávnění tohoto webu v prohlížeči.");}
  requestGps();
};
gpsButton.addEventListener("click",()=>{
  if(gpsWatch!==null){disableGps();return;}
  requestGps();
});
