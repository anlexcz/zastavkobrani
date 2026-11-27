"use strict";
import {gameDay,diffDays,addDays,pragueBoundaryUtc} from "../game-time.js";
// Funkce profilu čtou sdílený stav, ale neprovádějí herní operace.
export function createProfileScreen({getState,getEventsExpanded,setPendingProfileAvatar,STOPS,STOP_BY_ID,PLAYERS,holdingScore,stopCountdown,escapeStopText,$}){
function profileRecord(id=getState().selected){return getState().profiles?.[id]||{}}
function playerLabel(id){
 const p=PLAYERS.find(x=>x.id===id),alias=profileRecord(id).displayName;
 return alias?.trim()||p?.name||"Neznámý hráč";
}
function avatarUrl(id=getState().selected){
 const img=profileRecord(id).avatar;
 return typeof img==="string"&&img.length<120000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(img)?img:null;
}
function paintAvatar(element,id){
 const p=PLAYERS.find(x=>x.id===id),url=avatarUrl(id);
 element.style.backgroundImage=url?'url("'+url+'")':"none";
 element.style.backgroundColor=url?"#34383e":p?.color||"#474c52";
 element.textContent=url?"":playerLabel(id).trim().charAt(0).toLocaleUpperCase("cs");
}
function populateProfileSettings(){
 setPendingProfileAvatar(null);
 const player=PLAYERS.find(p=>p.id===getState().selected),profile=profileRecord();
 $("profile-username").value=player?.name||"";
 $("profile-display-name").value=profile.displayName||"";
 $("profile-form-status").textContent="";
 $("profile-image").value="";
 paintAvatar($("settings-avatar"),getState().selected);
}
function profileOwnedItems(){
 return STOPS.filter(s=>getState().stops[s.id]?.owner===getState().selected).map(stop=>{
  const record=getState().stops[stop.id],age=diffDays(gameDay(),record.anchor),now=Date.now();
  const protectedUntil=Date.parse(record.protectedUntil||"")||0;
  const expiry=Date.parse(pragueBoundaryUtc(addDays(record.anchor,15)));
  const protectedNow=protectedUntil>now;
  const decline=age>=8;
  const daysLeft=Math.max(0,Math.ceil((expiry-now)/86400000));
  return {stop,age,decline,protectedNow,protectedUntil,expiry,daysLeft,income:holdingScore(stop,record)};
 }).sort((a,b)=>a.expiry-b.expiry||a.stop.name.localeCompare(b.stop.name,"cs"));
}
function renderOwnedStops(){
 const items=profileOwnedItems();$("owned-count").textContent=String(items.length);
 $("owned-list").innerHTML=items.length?items.map(x=>{
  const urgency=x.decline?(x.daysLeft<=3?"is-urgent":"is-declining"):"";
  const status=x.protectedNow?"Ochrana "+stopCountdown(new Date(x.protectedUntil).toISOString()):
    x.decline?"Do zániku "+x.daysLeft+" d":"Údržba dostupná";
  return '<button type="button" class="owned-row '+urgency+'" data-owned-stop="'+escapeStopText(x.stop.id)+'">'+
    '<span class="owned-row-main"><strong>'+escapeStopText(x.stop.name)+'</strong><small>'+escapeStopText(status)+'</small></span>'+
    '<span class="owned-row-side"><strong>'+x.income+' b./den</strong></span>'+
    '<span aria-hidden="true" class="owned-row-arrow">›</span></button>';
 }).join(""):'<p class="empty-state">Zatím nevlastníš žádnou zastávku.</p>';
}
function playerEventEntries(){
 return getState().events.filter(e=>(e.player===getState().selected||e.previousOwner===getState().selected)&&diffDays(gameDay(),e.day)>=0&&diffDays(gameDay(),e.day)<30)
  .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
function renderProfileEvents(){
 const entries=playerEventEntries(),shown=getEventsExpanded()?entries:entries.slice(0,5);
 $("events-count").textContent=entries.length+" za 30 dní";
 $("events").innerHTML=shown.length?shown.map(e=>{
  const d=new Intl.DateTimeFormat("cs-CZ",{timeZone:"Europe/Prague",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(e.at));
  const action=e.previousOwner===getState().selected?(e.action==="expire"?"Zánik vlastnictví":"Ztráta zastávky"):e.action==="capture"?(e.previousOwner?"Převzetí":"Obsazení"):e.action==="maintain"?"Údržba":e.action==="visit"?"Zastávka dne":"Událost";
  const stop=STOP_BY_ID.get(e.stopId);
  return '<div class="player-event"><div><strong>'+escapeStopText(action)+(stop?" · "+escapeStopText(stop.name):"")+'</strong><small>'+d+'</small></div><span>'+ (e.player===getState().selected&&Number.isFinite(e.points)?"+"+e.points+" b.":"") +'</span></div>';
 }).join(""):'<p class="empty-state">Zatím žádné zaznamenané události.</p>';
 $("events-expand").hidden=entries.length<=5;
 $("events-expand").textContent=getEventsExpanded()?"Zobrazit méně":"Zobrazit další události ("+entries.length+")";
 $("events-expand").setAttribute("aria-expanded",String(getEventsExpanded()));
}

return {profileRecord,playerLabel,avatarUrl,paintAvatar,populateProfileSettings,profileOwnedItems,renderOwnedStops,playerEventEntries,renderProfileEvents};
}
