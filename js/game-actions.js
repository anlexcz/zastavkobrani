"use strict";
import {gameDay} from "./game-time.js";
import {verifyGps} from "./gps.js";
// Jediné místo, kde se lokální herní akce mění na zápis události.
export function createGameActions({getState,getSelectedStop,STOP_BY_ID,PLAYERS,remaining,actionCost,captureScore,award,challengeStop,visitsFor,stopLocationState,persist,note,render,$}){
let gpsBusy=false;
async function doGpsAction(action){
  const stop=STOP_BY_ID.get(getSelectedStop());
  if(!stop||gpsBusy)return;
  if(!stopLocationState(stop).ok){note("Nejsi v ověřeném 30m dosahu zastávky.");render();return;}
  const startingPlayer=getState().selected, startingStop=getSelectedStop();
  const validate=()=>{
    if(getState().selected!==startingPlayer||getSelectedStop()!==startingStop)return "Během ověřování se změnil hráč nebo zastávka.";
    const rec=getState().stops[stop.id],now=Date.now();
    if(action==="capture"){
      if(rec?.owner===startingPlayer)return "Zastávku už vlastníš.";
      if(rec?.protectedUntil&&Date.parse(rec.protectedUntil)>now)return "Zastávka je chráněná.";
      if(remaining(startingPlayer)<actionCost(stop,"capture",!!rec?.owner))return "Nedostatek akčních bodů.";
    }
    if(action==="maintain"&&(!rec||rec.owner!==startingPlayer||(rec.protectedUntil&&Date.parse(rec.protectedUntil)>now)||remaining(startingPlayer)<actionCost(stop,"maintain")))return "Údržba není dostupná (ochrana nebo nedostatek AP).";
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
      const previous=getState().stops[stop.id]?.owner||null;
      getState().stops[stop.id]={owner:startingPlayer,anchor:day,capturedAt:now.toISOString(),protectedUntil:new Date(now.getTime()+RULES.protectionHours*60*60*1000).toISOString()};
      const points=captureScore(stop,!previous),apCost=actionCost(stop,"capture",!!previous);award(startingPlayer,points,"capture");
      getState().events.unshift({action:"capture",stopId:stop.id,player:startingPlayer,day,at:now.toISOString(),previousOwner:previous,apCost,points,text:player.name+(previous?" převzal/a ":" obsadil/a ")+stop.name+" (+"+points+" b., −"+apCost+" AP)"});
    }else if(action==="maintain"){
      getState().stops[stop.id].anchor=day;
      getState().stops[stop.id].protectedUntil=new Date(now.getTime()+RULES.protectionHours*60*60*1000).toISOString();
      const apCost=actionCost(stop,"maintain");
      getState().events.unshift({action:"maintain",stopId:stop.id,player:startingPlayer,day,at:now.toISOString(),apCost,text:player.name+" udržel/a "+stop.name+" (−"+apCost+" AP)"});
    }else{
      getState().visits[day]??={};getState().visits[day][startingPlayer]=true;
      getState().events.unshift({action:"visit",stopId:stop.id,player:startingPlayer,day,at:now.toISOString(),text:"Návštěva zastávky dne: "+stop.name});
    }
    persist();note("GPS ověřena: "+Math.round(location.distance)+" m od zastávky, přesnost ±"+Math.round(location.accuracy)+" m. Akce zapsána do lokální testovací hry.");
  }catch(error){note(error.message||"GPS ověření selhalo.");}
  finally{gpsBusy=false;render();}
}


return {doGpsAction};
}
