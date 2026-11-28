"use strict";
import {loadMapView,saveMapView,normalizeMapFilters} from "./js/map-preferences.js";
import {dailyStreak,visitedStops} from "./js/progress.js";
import {encodeGameRoute,decodeGameRoute} from "./js/navigation.js";
import {gameDay,addDays,diffDays,pragueBoundaryUtc,nextGameBoundary} from "./js/game-time.js";
import {STORAGE_KEY,loadStoredGame,saveStoredGame} from "./js/storage.js";
import {formatStopDistance,stopLocationState as deriveStopLocationState} from "./js/gps.js";
import {createGameModel} from "./js/game.js";
import {createGameActions} from "./js/game-actions.js";
import {createGpsController} from "./js/gps-controller.js";
import {createDailyScreen} from "./js/screens/daily.js";
import {createRankingScreen} from "./js/screens/ranking.js";
import {createProfileScreen} from "./js/screens/profile.js";
import {createStopScreen} from "./js/screens/stop.js";
import {createMapLayerControls} from "./js/ui.js";
// Celopražský statický výřez auditu PID 19. 11. 2026, bez odhadovaných bodů.
const STOPS = PID_PRAGUE;
// Index pro opakované přístupy k herním územím bez lineárního procházení celé Prahy.
const STOP_BY_ID = new Map(STOPS.map(stop => [stop.id, stop]));
// Dva testovací profily, sdílející stav pouze v tomto prohlížeči.
const PLAYERS=DEMO_PLAYERS;
// Všechny hodnoty a rozpisy jsou v samostatném scoring.js.
// Oddělený scénář s deseti hráči a strategickými polygony.
const STORAGE=STORAGE_KEY;
const $=id=>document.getElementById(id);
const mapLayers=createMapLayerControls({$,getMap:()=>map,setMapOverlayVisibility});
// Herní stav má jednoho vlastníka; obrazovky čtou aktuální stav přes rozhraní.
const gameModel=createGameModel({STOPS,PLAYERS,ROUTE_22_SEED,RULES,captureBreakdown,holdingBreakdown,ACTIVE_SCORE_BONUSES,getState:()=>state,persist:()=>persist()});
const {challengeStopForDay,init,award,captureScore,holdingScore,closeDays,spentAP,remaining,owned,total,challengeStop,visitsFor}=gameModel;
function load(){return loadStoredGame(()=>init())}
let state=load(),selectedStop=null;
function persist(){saveStoredGame(state)}
let gpsController=null;
function stopLocationState(stop){return deriveStopLocationState(stop,gpsController?.snapshot())}
// MapLibre + vlastní vektorový styl. Herní stav zůstává oddělený od podkladu.
const savedMapView=loadMapView(localStorage);
const map = new maplibregl.Map({
  container:"map",style:"https://tiles.openfreemap.org/styles/liberty",
  ...(savedMapView||{center:[14.44,50.085],zoom:10.65}),bearing:0,pitch:0,dragRotate:false,pitchWithRotate:false,attributionControl:true
});
if(matchMedia("(min-width:760px)").matches)map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");
let selectedPlatform=null;
map.touchZoomRotate?.disableRotation();
map.on("moveend",()=>{const c=map.getCenter();saveMapView(localStorage,[c.lng,c.lat],map.getZoom());});
map.on("load",()=>{
  installStopMap(map,STOPS,(id,pointId)=>{
    selectedStop=id;selectedPlatform=pointId;
    confirmingCapture=false;
    note("");
    $("sheet").scrollTop=0;
    openScreen("stop");
  },PLAYERS,state.stops);
  mapLayers.setReady(true);
  setMapOverlayVisibility(map,mapLayers.prefs());
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
let activeScreen="map",otherPlayer=null,statPeriod="30",stopReturn="map";
const tabMemory={map:"map",daily:"daily",ranking:"ranking",profile:"profile"};
const tabFor=name=>name==="stop"?tabFor(stopReturn):name==="player"?"ranking":name.startsWith("profile")?"profile":name;
let rankingPeriod="30";
let dailyHistoryExpanded=false;
let profileEventsExpanded=false;
let pendingProfileAvatar=null;
const {renderDailyHistory,dailyHistoryItems}=createDailyScreen({getState:()=>state,getExpanded:()=>dailyHistoryExpanded,getSelectedPlayer:()=>state.selected,challengeStopForDay,escapeStopText,$});
const {renderRanking}=createRankingScreen({getState:()=>state,getRankingPeriod:()=>rankingPeriod,PLAYERS,total,playerLabel:(id)=>playerLabel(id),escapeStopText,$});
const {profileRecord,playerLabel,avatarUrl,paintAvatar,populateProfileSettings,profileOwnedItems,renderOwnedStops,playerEventEntries,renderProfileEvents}=createProfileScreen({
  getState:()=>state,getEventsExpanded:()=>profileEventsExpanded,setPendingProfileAvatar:value=>{pendingProfileAvatar=value},
  STOPS,STOP_BY_ID,PLAYERS,holdingScore,stopCountdown,escapeStopText,$
});
const screenScroll=new Map();
function openScreen(name,{historyMode="push",restore=false}={}){
  if(!$( "screen-"+name)&&name!=="map")name="map";
  if(activeScreen!=="map")screenScroll.set(activeScreen,$("sheet").scrollTop);
  closeScoreDetailIfOpen();
  if(name==="stop"&&activeScreen!=="stop"&&historyMode!=="none")stopReturn=activeScreen;
  activeScreen=name;
  if(name!=="stop")tabMemory[tabFor(name)]=name;
  const visible=name!=="map";
  $("sheet").hidden=!visible;
  const isStop=name==="stop";
  $("sheet").classList.toggle("is-page",visible&&!isStop);
  $("scrim").hidden=!isStop;
  for(const el of document.querySelectorAll(".screen")) el.hidden=el.id!=="screen-"+name;
  for(const el of document.querySelectorAll(".nav button")){
    const active=el.dataset.screen===tabFor(name);
    el.classList.toggle("active",active);
    if(active)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
  }
  if(name==="map") {selectedStop=null;selectedPlatform=null;confirmingCapture=false;}
  if(name==="profile-settings")populateProfileSettings();
  if(visible){$("map-search-panel").hidden=true;$("map-search-toggle").setAttribute("aria-expanded","false");}
  if(visible)$("sheet").scrollTop=0;
  const hash=encodeGameRoute({screen:name,player:otherPlayer,stop:selectedStop,returnScreen:stopReturn});
  if(historyMode!=="none"&&location.hash!==hash)history[historyMode==="replace"?"replaceState":"pushState"](null,"",location.pathname+location.search+hash);
  render();
  if(visible&&(restore||screenScroll.has(name)))$("sheet").scrollTop=screenScroll.get(name)||0;
}
function note(t){$("message").textContent=t}
function closeScoreDetailIfOpen(){if(!$("score-dialog-overlay").hidden)closeScoreDetail();if(!$("history-dialog-overlay").hidden)closeHistoryDetail()}
let confirmingCapture=false;
$("close").onclick=()=>openScreen(stopReturn);
$("scrim").onclick=()=>openScreen(stopReturn);
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
  const stop=STOP_BY_ID.get(selectedStop);
  if(!stop)return;
  const record=state.stops[stop.id];
  const context={ownerRecord:record,gameDay:gameDay(),diffDays,
    neutral:!record?.owner,bonuses:ACTIVE_SCORE_BONUSES};
  const detail=kind==="capture"?captureBreakdown(stop,context):holdingBreakdown(stop,context);
  scoreDetailType=kind;
  scoreDialogReturnFocus=document.activeElement;
  $("score-dialog-title").textContent=kind==="capture"?"Body za obsazení":"Body denně";
  $("score-dialog-stop").textContent=stop.name;
  const body=detail.lines.map(line=>scoreDetailRow(
    line.label+(kind==="capture"?" ("+Math.round(line.multiplier*100)+" %)":""),
    line.amount+" b."
  )).join("");
  const adjustment=detail.holdingAdjustment
    ?scoreDetailRow("Vliv stáří zastávky",
        (detail.holdingAdjustment>0?"+":"")+detail.holdingAdjustment+" b.","score-detail-adjustment"):"";
  const bonuses=detail.bonusLines.length
    ?detail.bonusLines.map(b=>scoreDetailRow(b.label,"+"+b.amount+" b.")).join("")
    :'<p class="score-detail-empty">Žádné aktuálně platné bonusy</p>';
  const explanation=kind==="holding"?
    '<p class="score-detail-explanation">'+(record?.owner
      ?'Den akce bez výnosu, poté 7 dní plného výnosu a 7 dní sestupné fáze. Sestupná fáze vyplácí postupně 6/6, 5/6, 4/6, 3/6, 2/6, 1/6 a 0 plného výnosu.'
      :'Plný denní výnos podle modelu C ×6 činí 6, 12 nebo 18 bodů podle počtu druhů dopravy. Výnos začne vznikat až po obsazení a nevzniká v den akce.')+'</p>':
    '<p class="score-detail-explanation">První druh dopravy se počítá celý, druhý z poloviny a další ze čtvrtiny. Bonus +16 bodů za neutralitu se přičítá pouze při obsazení neobsazené zastávky.</p>';
  $("score-dialog-lines").innerHTML=body+adjustment+
    '<div class="score-detail-subtitle">Bonusy</div>'+bonuses+
    scoreDetailRow("Celkem",detail.total+" b.","score-detail-total")+explanation;
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

for(const b of document.querySelectorAll(".nav button")) b.onclick=()=>{const tab=b.dataset.screen;openScreen(tabFor(activeScreen)===tab?tab:tabMemory[tab]||tab)};
for(const b of document.querySelectorAll("[data-open-screen]")) b.onclick=()=>openScreen(b.dataset.openScreen);
$("show-challenge").onclick=()=>{
  const s=challengeStop();
  if(!s)return;
  openScreen("map");
  gpsController?.stopFollowing();map.flyTo({center:[s.lon,s.lat],zoom:15.3,essential:true});
};
// Výběr GIS vrstvy neuzavírá detail.
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("map-search-panel").hidden){$("map-search-panel").hidden=true;$("map-search-toggle").setAttribute("aria-expanded","false")}else openScreen(activeScreen==="stop"?stopReturn:"map")}});

const historyOverlay=$("history-dialog-overlay");
let historyReturnFocus=null;
function closeHistoryDetail(){
 if(historyOverlay.hidden)return;
 historyOverlay.hidden=true;
 historyReturnFocus?.focus?.();
 historyReturnFocus=null;
}
function stopHistoryEntries(stop){
 return state.events.filter(e=>e.stopId===stop.id&&diffDays(gameDay(),e.day)>=0&&diffDays(gameDay(),e.day)<30&&["capture","expire"].includes(e.action))
  .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
function renderStopHistory(stop){
 const count=$("stop-history-count");
 if(!stop){count.textContent="0 událostí";return;}
 const n=stopHistoryEntries(stop).length;
 count.textContent=n===1?"1 událost":n>=2&&n<=4?n+" události":n+" událostí";
}
function showHistoryDetail(){
 const stop=STOP_BY_ID.get(selectedStop);if(!stop)return;
 if(!$("score-dialog-overlay").hidden)closeScoreDetail();
 const entries=stopHistoryEntries(stop);
 historyReturnFocus=document.activeElement;
 $("history-dialog-stop").textContent=stop.name;
 $("stop-history-list").innerHTML=entries.length?entries.map(e=>{
  const who=e.player?playerLabel(e.player):"Systém";
  const old=e.previousOwner?playerLabel(e.previousOwner):null;
  const label=e.action==="maintain"?"Údržba · "+who:e.action==="expire"?"Zánik vlastnictví":old?"Převzetí · "+old+" → "+who:"Obsazení · "+who;
  const time=new Intl.DateTimeFormat("cs-CZ",{timeZone:"Europe/Prague",day:"numeric",month:"numeric",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(e.at));
  const parts=[Number.isFinite(e.points)?"+"+e.points+" b.":null,e.apCost?"−"+e.apCost+" AP":null].filter(Boolean);
  return '<div class="history-item"><div class="history-item-head"><strong>'+escapeStopText(label)+'</strong>'+
   (parts.length?'<span class="history-item-points">'+escapeStopText(parts.join(" · "))+'</span>':"")+'</div>'+
   '<div class="history-item-meta"><time>'+escapeStopText(time)+'</time>'+(e.seed?'<span>Testovací záznam</span>':"")+'</div></div>';
 }).join(""):'<p class="stop-history-empty">Zatím žádná historie.</p>';
 historyOverlay.hidden=false;
 $("history-dialog-close").focus();
}
$("stop-history-open").onclick=showHistoryDetail;
$("history-dialog-close").onclick=closeHistoryDetail;
historyOverlay.addEventListener("click",event=>{if(event.target===historyOverlay)closeHistoryDetail()});
document.addEventListener("keydown",event=>{
 if(historyOverlay.hidden)return;
 if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeHistoryDetail();}
 if(event.key==="Tab"){event.preventDefault();$("history-dialog-close").focus();}
},true);
for(const b of document.querySelectorAll("[data-ranking-period]"))b.onclick=()=>{rankingPeriod=b.dataset.rankingPeriod;renderRanking()};
$("daily-history-expand").onclick=()=>{dailyHistoryExpanded=!dailyHistoryExpanded;renderDailyHistory()};
const {renderStop}=createStopScreen({
  getState:()=>state,getSelectedStop:()=>selectedStop,getActiveScreen:()=>activeScreen,
  getConfirmingCapture:()=>confirmingCapture,getGpsSnapshot:()=>gpsController?.snapshot(),
  isActionBusy:()=>gameActions?.isBusy(),STOP_BY_ID,PLAYERS,actionCost,remaining,
  playerLabel:(id)=>playerLabel(id),stopLocationState,stopCardHtml,stopCountdown,
  captureScore,holdingScore,renderStopHistory,$
});
function render(){closeDays();const p=PLAYERS.find(x=>x.id===state.selected);$("player").value=state.selected;$("profile").textContent=playerLabel(p.id);$("remaining").textContent=remaining()+"/"+RULES.dailyAP;$("ap-map").textContent=remaining()+"/"+RULES.dailyAP;$("owned").textContent=owned();$("points").textContent=total(p.id,30);$("clock").textContent="Herní den "+gameDay()+" · uzávěrka 03:00";$("profile-handle").textContent="Testovací účet · "+p.name;paintAvatar($("profile-avatar"),p.id);
refreshStopMapColors(map,state.stops,PLAYERS,selectedStop);
refreshGameHighlights(map,state.stops,state.selected,$("owner-filter").value,$("visited-filter").checked?visitedStops(state,state.selected):null,visitsFor(state.selected)?null:challengeStop()?.id);
const {stop:s,locationState}=renderStop();
const challenge=challengeStop(),done=visitsFor(state.selected);
$("challenge").textContent=challenge?.name||"Není dostupná";
const streak=dailyStreak(state.visits,state.selected,gameDay());$("daily-streak").innerHTML='<strong>'+streak+' dní v sérii</strong><span>64 zastávkobodů za splnění · bonus 256 každých 7 dní</span><div class="streak-track">'+Array.from({length:7},(_,i)=>'<i class="'+(i<(streak?((streak-1)%7)+1:0)?"is-done":"")+'"></i>').join("")+'</div>';
$("challengeinfo").textContent=done?"Dnes splněno":"Zatím nesplněno";
$("challengeinfo").classList.toggle("is-done",done);
$("challenge-countdown").dataset.until=nextGameBoundary();$("challenge-countdown").textContent=stopCountdown(nextGameBoundary());
$("show-challenge").disabled=!challenge;
const isDailyStop=!!s&&s.id===challenge?.id;
$("daily-stop-action").hidden=!isDailyStop;
$("daily-visit").disabled=navigator.onLine===false||!isDailyStop||done||!locationState.ok||gameActions?.isBusy();
$("daily-visit").textContent=done?"Dnes splněno":"Splnit zastávku dne";
$("daily-stop-hint").textContent=done?"Návštěva byla zaznamenána.":"Samostatná GPS návštěva · 0 AP";
$("offline-banner").hidden=navigator.onLine!==false;if(navigator.onLine===false){$("capture").disabled=true;$("maintain").disabled=true;$("confirm-yes").disabled=true;}
if(activeScreen==="daily")renderDailyHistory();
renderRanking();
if(activeScreen==="profile"||activeScreen==="profile-stops")renderOwnedStops();
if(activeScreen==="profile-activity")renderProfileEvents();
if(activeScreen==="profile-statistics")renderStatistics();
if(activeScreen==="player")renderOtherPlayer();}
$("player").innerHTML=PLAYERS.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join("");
$("player").addEventListener("change",e=>{state.selected=e.target.value;confirmingCapture=false;profileEventsExpanded=false;persist();note("");render()});
const gameActions=createGameActions({
  getState:()=>state,getSelectedStop:()=>selectedStop,STOP_BY_ID,PLAYERS,RULES,
  remaining,actionCost,captureScore,award,challengeStop,visitsFor,
  stopLocationState,persist,note,render,$
});
const {doGpsAction}=gameActions;
function metricRow(label,value){return '<div class="profile-metric"><span>'+escapeStopText(label)+'</span><strong>'+escapeStopText(String(value))+'</strong></div>'}
function renderStatistics(){
 const id=state.selected,days=statPeriod==="30"?30:null;
 const entries=state.ledger.filter(x=>x.player===id&&(!days||diffDays(gameDay(),x.day)>=0&&diffDays(gameDay(),x.day)<days));
 $("profile-statistics").innerHTML=metricRow("Zastávkobody celkem",total(id,days))+["capture","holding","daily","streak"].map((kind,i)=>metricRow(["Obsazování","Denní výnos","Zastávka dne","Série"][i],entries.filter(e=>e.type===kind).reduce((sum,e)=>sum+e.amount,0))).join("")+metricRow("Aktuálně vlastněné zastávky",owned())+metricRow("Navštívené zastávky",visitedStops(state,id).size+" / "+STOPS.length);
 for(const b of document.querySelectorAll("[data-stat-period]"))b.setAttribute("aria-pressed",String(b.dataset.statPeriod===statPeriod));
}
for(const b of document.querySelectorAll("[data-stat-period]"))b.onclick=()=>{statPeriod=b.dataset.statPeriod;renderStatistics()};
function renderOtherPlayer(){
 const p=PLAYERS.find(x=>x.id===otherPlayer);if(!p)return;
 paintAvatar($("other-avatar"),p.id);$("other-name").textContent=playerLabel(p.id);$("other-handle").textContent="@"+p.name;
 const list=STOPS.filter(s=>state.stops[s.id]?.owner===p.id).sort((a,b)=>a.name.localeCompare(b.name,"cs"));
 $("other-stats").innerHTML=metricRow("Zastávkobody za 30 dní",total(p.id,30))+metricRow("Zastávkobody celkem",total(p.id))+metricRow("Vlastněné zastávky",list.length);
 $("other-stops").innerHTML=list.map(s=>'<button class="owned-row" data-other-stop="'+escapeStopText(s.id)+'"><strong>'+escapeStopText(s.name)+'</strong><span>›</span></button>').join("")||'<p class="empty-state">Žádné zastávky.</p>';
}
$("leaderboard").addEventListener("click",e=>{const b=e.target.closest("[data-player-id]");if(!b)return;otherPlayer=b.dataset.playerId;openScreen(otherPlayer===state.selected?"profile":"player")});
$("other-stops").addEventListener("click",e=>{const b=e.target.closest("[data-other-stop]");if(!b)return;selectedStop=b.dataset.otherStop;selectedPlatform=null;confirmingCapture=false;openScreen("stop")});
const normalizeSearch=s=>String(s).normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase("cs");
$("map-search-toggle").onclick=()=>{const panel=$("map-search-panel");panel.hidden=!panel.hidden;$("map-search-toggle").setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden)$("map-search-input").focus()};
$("map-search-input").oninput=()=>{const q=normalizeSearch($("map-search-input").value.trim());$("map-search-results").innerHTML=q?STOPS.filter(s=>normalizeSearch(s.name).includes(q)).slice(0,30).map(s=>'<button data-result-stop="'+escapeStopText(s.id)+'">'+escapeStopText(s.name)+'</button>').join("")||'<p>Žádné výsledky.</p>':""};
$("map-search-results").onclick=e=>{const b=e.target.closest("[data-result-stop]");if(!b)return;const s=STOP_BY_ID.get(b.dataset.resultStop);if(!s)return;$("map-search-panel").hidden=true;$("map-search-toggle").setAttribute("aria-expanded","false");gpsController?.stopFollowing();map.flyTo({center:[s.lon,s.lat],zoom:15.4});selectedStop=s.id;selectedPlatform=null;confirmingCapture=false;openScreen("stop")};
$("profile-edit").onclick=()=>openScreen("profile-settings");
$("settings-back").onclick=()=>openScreen("profile");
$("owned-sort").onchange=renderOwnedStops;$("events-filter").onchange=renderProfileEvents;
let mapFilters;try{mapFilters=normalizeMapFilters(JSON.parse(localStorage.getItem("zastavkobrani-map-filters-v1")));}catch{mapFilters=normalizeMapFilters(null);}
$("owner-filter").value=mapFilters.owner;$("visited-filter").checked=mapFilters.visited;
function updateMapFilters(){try{localStorage.setItem("zastavkobrani-map-filters-v1",JSON.stringify({owner:$("owner-filter").value,visited:$("visited-filter").checked}));}catch{}render();}
$("owner-filter").onchange=updateMapFilters;$("visited-filter").onchange=updateMapFilters;
window.addEventListener("online",render);window.addEventListener("offline",render);
$("events-expand").onclick=()=>{profileEventsExpanded=!profileEventsExpanded;renderProfileEvents()};
$("owned-list").addEventListener("click",event=>{
 const btn=event.target.closest("[data-owned-stop]");
 if(!btn)return;
 const stop=STOP_BY_ID.get(btn.dataset.ownedStop);
 if(!stop)return;
 selectedStop=stop.id;selectedPlatform=null;confirmingCapture=false;
 gpsController?.stopFollowing();map.flyTo({center:[stop.lon,stop.lat],zoom:15.4,essential:true});
 openScreen("stop");
});
$("profile-form").addEventListener("submit",event=>{
 event.preventDefault();
 const name=$("profile-display-name").value.trim();
 state.profiles??={};
 state.profiles[state.selected]={...profileRecord(),displayName:name.slice(0,36),...(pendingProfileAvatar?{avatar:pendingProfileAvatar}:{})};
 persist();openScreen("profile");
});
$("profile-image").addEventListener("change",event=>{
 const file=event.target.files?.[0];if(!file)return;
 const status=$("profile-form-status");
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){
  status.textContent="Vyber JPEG, PNG nebo WebP menší než 5 MB.";return;
 }
 const reader=new FileReader();
 reader.onload=()=>{
  const img=new Image();
  img.onload=()=>{
   const canvas=document.createElement("canvas");canvas.width=160;canvas.height=160;
   const ctx=canvas.getContext("2d");
   const edge=Math.min(img.width,img.height);
   ctx.drawImage(img,(img.width-edge)/2,(img.height-edge)/2,edge,edge,0,0,160,160);
   const data=canvas.toDataURL("image/jpeg",.72);
   if(data.length>120000){status.textContent="Obrázek je příliš velký.";return;}
   pendingProfileAvatar=data;
   $("settings-avatar").style.backgroundImage='url("'+data+'")';
   $("settings-avatar").textContent="";
   status.textContent="Obrázek je připravený. Pro uložení klikni na Uložit profil.";
  };
  img.onerror=()=>{status.textContent="Obrázek se nepodařilo načíst."};
  img.src=String(reader.result);
 };
 reader.onerror=()=>{status.textContent="Obrázek se nepodařilo načíst."};
 reader.readAsDataURL(file);
});
$("capture").onclick=()=>{
  const stop=STOP_BY_ID.get(selectedStop);
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
$("daily-visit").onclick=()=>doGpsAction("visit");
$("reset").onclick=()=>{if(!confirm("Opravdu resetovat testovací data linky 22?"))return;localStorage.removeItem(STORAGE);state=init(true);persist();selectedStop=null;note("Test byl vynulován.");openScreen("profile")};
gpsController=createGpsController({map,maplibregl,render,note,$});
window.addEventListener("storage",e=>{if(e.key===STORAGE){state=load();render()}});
function restoreRoute(){
 const r=decodeGameRoute(location.hash);
 otherPlayer=PLAYERS.some(p=>p.id===r.player)?r.player:null;
 selectedStop=STOP_BY_ID.has(r.stop)?r.stop:null;selectedPlatform=null;confirmingCapture=false;stopReturn=r.returnScreen;
 if(r.screen==="player"&&!otherPlayer)r.screen="ranking";
 if(r.screen==="stop"&&!selectedStop)r.screen="map";
 if(stopReturn==="player"&&!otherPlayer)stopReturn="ranking";
 openScreen(r.screen,{historyMode:"none",restore:true});
}
window.addEventListener("popstate",restoreRoute);
restoreRoute();
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
setInterval(()=>{
 if(activeScreen==="daily")$("challenge-countdown").textContent=stopCountdown(nextGameBoundary());
 if(activeScreen==="stop"&&selectedStop){const e=$("stopdetail").querySelector("[data-expiry-countdown]");if(e)e.textContent=stopExpiryCountdown(e.dataset.expiryCountdown);}
},1000);
const timePopover=$("time-popover");
document.addEventListener("click",e=>{const target=e.target.closest(".countdown-trigger");if(!target){if(!e.target.closest("#time-popover"))timePopover.hidden=true;return;}const until=target.dataset.until||target.dataset.protectionCountdown||target.dataset.expiryCountdown;const timestamp=Date.parse(until);if(!Number.isFinite(timestamp))return;timePopover.textContent=new Intl.DateTimeFormat("cs-CZ",{timeZone:"Europe/Prague",dateStyle:"medium",timeStyle:"medium"}).format(new Date(timestamp));timePopover.hidden=false;const r=target.getBoundingClientRect();timePopover.style.left=Math.max(8,Math.min(r.left,innerWidth-timePopover.offsetWidth-8))+"px";timePopover.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-timePopover.offsetHeight-8))+"px";});
document.addEventListener("keydown",e=>{if(e.key==="Escape")timePopover.hidden=true;});
setInterval(()=>{if(!document.hidden)render()},5000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});

