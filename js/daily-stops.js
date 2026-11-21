"use strict";
import {DAILY_STOP_SCHEDULE} from "./daily-stops.generated.js";

/**
 * Jednotný resolver pro kartu zastávky dne, GPS validaci i historii.
 * Pořadí priorit: schválená výjimka > archivovaný los > nouzový deterministický výběr.
 * Všichni hráči dostanou pro stejné datum stejné stopId.
 */
export function isEligibleDailyStop(stop){
  return !!stop&&Array.isArray(stop.cats)&&stop.cats.length>0&&
    Array.isArray(stop.points)&&stop.points.some(p=>p.insidePrague&&!p.isMetro);
}
export function fallbackDailyStop(day,stops){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!stops.length)return null;
  const key=day.replaceAll("-","");
  let seed=0;
  for(const char of key)seed=(seed*31+char.charCodeAt(0))>>>0;
  for(let i=0;i<stops.length;i++){
    const stop=stops[(seed+i)%stops.length];
    if(isEligibleDailyStop(stop))return stop;
  }
  return null;
}
export function resolveDailyStop(day,stops,schedule=DAILY_STOP_SCHEDULE){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;
  const stopId=schedule?.overrides?.[day]||schedule?.days?.[day];
  if(stopId){
    const stop=stops.find(s=>s.id===stopId);
    // Chybějící nebo neplatná publikovaná ID nevytvářejí další nejednotný los.
    if(!isEligibleDailyStop(stop)){
      console.error("Neplatná publikovaná zastávka dne:",day,stopId);
      return null;
    }
    return stop;
  }
  // Pouze záloha pro data mimo publikované období nebo při výpadku generátoru.
  return fallbackDailyStop(day,stops);
}
export {DAILY_STOP_SCHEDULE};
