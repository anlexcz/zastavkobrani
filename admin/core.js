"use strict";
import {isEligibleDailyStop} from "../js/daily-stops.js";

export const ADMIN_SECTIONS=Object.freeze([
 {id:"overview",title:"Přehled",description:"Stav aplikace a otevřené úkoly",status:"ready"},
 {id:"daily",title:"Zastávka dne",description:"Kalendář, losování a ruční výjimky",status:"draft"},
 {id:"territories",title:"Zastávky a GPS",description:"Katalog herních území a fyzických bodů",status:"read"},
 {id:"imports",title:"PID importy",description:"Zdrojová data, změnové sady a schvalování",status:"planned"},
 {id:"players",title:"Hráči",description:"Účty, role, moderace a žádosti o výmaz",status:"planned"},
 {id:"ownership",title:"Vlastnictví a akce",description:"Převzetí, údržba, opravy a audit událostí",status:"planned"},
 {id:"economy",title:"Ekonomika",description:"Verze pravidel, bodování a bonusy",status:"planned"},
 {id:"achievements",title:"Achievementy",description:"Definice sad zastávek a podmínky odměn",status:"planned"},
 {id:"audit",title:"Audit",description:"Schválení, historie změn a dohledání zásahů",status:"planned"},
 {id:"system",title:"Systém",description:"Uzávěrky, diagnostika a provoz",status:"planned"}
]);
export function validDay(day){
 return typeof day==="string" && /^\d{4}-\d{2}-\d{2}$/.test(day)&&
   !Number.isNaN(Date.parse(day+"T12:00:00Z")) &&
   new Date(day+"T12:00:00Z").toISOString().slice(0,10)===day;
}
export function safeCatalog(stops){
 if(!Array.isArray(stops))throw new Error("Katalog PID není pole.");
 return new Map(stops.map(stop=>[stop.id,stop]));
}
export function cloneOverrides(input,stops){
 if(!input||input.version!==1||!input.dates||typeof input.dates!=="object"||
    Array.isArray(input.dates))throw new Error("Neplatné schéma výjimek (očekáváno version:1, dates).");
 const catalog=safeCatalog(stops),dates={};
 for(const [day,row] of Object.entries(input.dates)){
   if(!validDay(day))throw new Error("Neplatné datum: "+day);
   if(!row||typeof row!=="object"||Array.isArray(row)||
      typeof row.stopId!=="string"||!isEligibleDailyStop(catalog.get(row.stopId))){
     throw new Error("Neznámá nebo nezpůsobilá zastávka pro "+day);
   }
   if(row.note!==undefined&&(typeof row.note!=="string"||row.note.length>300))
     throw new Error("Poznámka pro "+day+" musí mít nejvýše 300 znaků.");
   dates[day]={stopId:row.stopId,...(row.note?{note:row.note}:{})};
 }
 return {version:1,dates:Object.fromEntries(Object.entries(dates).sort(([a],[b])=>a.localeCompare(b)))};
}
export function applyDraftChange(current,day,stopId,note,today,stops){
 if(!validDay(day)||day<=today)throw new Error("Měnit lze jen následující herní dny.");
 const dates={...current.dates};
 if(stopId===null){delete dates[day]}
 else {
   const catalog=safeCatalog(stops);
   if(!isEligibleDailyStop(catalog.get(stopId)))throw new Error("Zastávka není způsobilá pro denní výzvu.");
   const clean=String(note||"").trim();
   if(clean.length>300)throw new Error("Poznámka je příliš dlouhá.");
   dates[day]={stopId,...(clean?{note:clean}:{})};
 }
 return cloneOverrides({version:1,dates},stops);
}
export function effectiveDaily(day,calendar,overrides,stops){
 const map=safeCatalog(stops);
 const overrideId=overrides?.dates?.[day]?.stopId;
 const generatedId=calendar?.days?.[day]||null;
 const stop=map.get(overrideId||generatedId);
 return {
  day,
  stop:stop||null,
  generated:map.get(generatedId)||null,
  overridden:!!overrideId,
  source:overrideId?"manual":generatedId?"random":"unpublished"
 };
}
export function filterStops(stops,query,{eligibleOnly=false,limit=40}={}){
 const normalize=value=>String(value??"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLocaleLowerCase("cs");
 const normalized=normalize(String(query||"").trim());
 const result=[];
 for(const stop of stops){
   if(eligibleOnly&&!isEligibleDailyStop(stop))continue;
   if(normalized&&!normalize(stop.name).includes(normalized)&&
      !normalize(stop.id).includes(normalized))continue;
   result.push(stop);
   if(result.length>=limit)break;
 }
 return result;
}
export function enforcePublishedDates(original,next,today){
 const dates=new Set([...Object.keys(original.dates),...Object.keys(next.dates)]);
 for(const day of dates){
   if(day<=today&&JSON.stringify(original.dates[day]||null)!==JSON.stringify(next.dates[day]||null))
     throw new Error("Nelze změnit dnešní nebo historickou výjimku: "+day);
 }
 return next;
}
export function exportOverrides(input,stops){
 return JSON.stringify(cloneOverrides(input,stops),null,2)+"\n";
}
