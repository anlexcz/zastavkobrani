"use strict";
import {gameDay,diffDays,addDays,pragueBoundaryUtc} from "../game-time.js";
import {formatStopDistance} from "../gps.js";
// Vykreslení karty zastávky nepřepisuje herní stav.
export function createStopScreen({getState,getSelectedStop,getActiveScreen,getConfirmingCapture,getGpsSnapshot,isActionBusy,STOP_BY_ID,PLAYERS,actionCost,remaining,playerLabel,stopLocationState,stopCardHtml,stopCountdown,captureScore,holdingScore,renderStopHistory,$}){
function renderStop(){
const s=STOP_BY_ID.get(getSelectedStop()),rec=s&&getState().stops[s.id];
$("stopname").textContent=s?.name||"Vyber zastávku na mapě";
const owner=rec&&PLAYERS.find(p=>p.id===rec.owner);
const mine=!!rec?.owner&&rec.owner===getState().selected;
const protectionEnd=rec?.protectedUntil?Date.parse(rec.protectedUntil):0;
const protectedNow=!!rec?.owner&&protectionEnd>Date.now();
const protectionOther=protectedNow&&!mine;
const cost=s?actionCost(s,"capture",!!rec?.owner):Infinity;
const maintainCost=s?actionCost(s,"maintain"):Infinity;
const selfCooldown=false; // Jediný cooldown je ochrana území po akci.
const locationState=s?stopLocationState(s):{ok:false,status:"Poloha nedostupná",distance:null};
const captureTimeBlocked=mine||protectionOther||remaining()<cost;
const maintainTimeBlocked=!mine||protectedNow||remaining()<maintainCost;
$("sheet").classList.toggle("sheet-stop",getActiveScreen()==="stop");
$("sheet").style.setProperty("--sheet-owner-color",owner?.color||"#929292");
$("stop-owner-heading").textContent=owner?"Vlastní "+playerLabel(owner.id):"Neobsazená zastávka";
$("stop-owner-heading").style.color="var(--muted)";
$("stopdetail").innerHTML=s?stopCardHtml({
  stop:s,record:rec,owner,selectedPlayer:getState().selected,
  gameDay:gameDay(),diffDays,captureScore:(stop)=>captureScore(stop,!rec?.owner),holdingScore:(stop)=>holdingScore(stop,rec),expiresAt:rec?.anchor?pragueBoundaryUtc(addDays(rec.anchor,15)):null
}):"";
renderStopHistory(s);
const capture=$("capture"),maintain=$("maintain");
capture.hidden=mine;maintain.hidden=!mine;
capture.disabled=!s||captureTimeBlocked||!locationState.ok||isActionBusy();
capture.dataset.block=captureTimeBlocked?"time":locationState.ok?"":"location";
capture.textContent=mine?"Tvoje zastávka":protectionOther?
  "Převzetí za "+stopCountdown(rec.protectedUntil):remaining()<cost?
  "Nedostatek AP (potřeba "+cost+")":(rec?.owner?"Převzít · ":"Obsadit · ")+cost+" AP";
maintain.disabled=!s||maintainTimeBlocked||!locationState.ok||isActionBusy();
maintain.dataset.block=maintainTimeBlocked?"time":locationState.ok?"":"location";
maintain.textContent=protectedNow?"Údržba za "+stopCountdown(rec.protectedUntil):remaining()<maintainCost?"Nedostatek AP (potřeba "+maintainCost+")":"Udržet · "+maintainCost+" AP";
$("stop-location-status").textContent=locationState.status;
$("stop-distance").textContent=locationState.distance===null?"—":formatStopDistance(locationState.distance);
$("stop-request-location").hidden=!!getGpsSnapshot().watch&&!!getGpsSnapshot().position;
$("stop-request-location").textContent=getGpsSnapshot().permissionDenied?"Povolení GPS":"Povolit polohu";
$("stop-confirm").hidden=!getConfirmingCapture()||!s||mine;
$("capture").hidden=mine||getConfirmingCapture();
$("actions").classList.toggle("is-confirming",getConfirmingCapture()&&!mine);
$("confirm-yes").disabled=captureTimeBlocked||!locationState.ok||isActionBusy();
$("stop-location").hidden=activeScreen!=="stop";

return {stop:s,locationState};
}
return {renderStop};
}
