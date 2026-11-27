"use strict";
import {isEligibleDailyStop} from "../js/daily-stops.js";

export const ADMIN_SECTIONS=Object.freeze([
  {
    "id": "overview",
    "title": "Přehled",
    "description": "Stav aplikace",
    "status": "ready",
    "group": "Přehled"
  },
  {
    "id": "territories",
    "title": "Herní zastávky",
    "description": "Katalog území a GPS bodů",
    "status": "read",
    "group": "Mapa a zastávky"
  },
  {
    "id": "platforms",
    "title": "Stanoviště",
    "description": "Fyzická stanoviště PID",
    "status": "planned",
    "group": "Mapa a zastávky"
  },
  {
    "id": "districts",
    "title": "Čtvrti",
    "description": "Hranice a přiřazení zastávek",
    "status": "planned",
    "group": "Mapa a zastávky"
  },
  {
    "id": "imports",
    "title": "Import dat",
    "description": "Zdrojová data a schvalování",
    "status": "planned",
    "group": "Mapa a zastávky"
  },
  {
    "id": "exceptions",
    "title": "Výjimky a nesrovnalosti",
    "description": "Kontrola změn a GPS",
    "status": "planned",
    "group": "Mapa a zastávky"
  },
  {
    "id": "daily",
    "title": "Zastávka dne",
    "description": "Kalendář a výjimky",
    "status": "draft",
    "group": "Hra"
  },
  {
    "id": "ownership",
    "title": "Vlastnictví",
    "description": "Historie území",
    "status": "planned",
    "group": "Hra"
  },
  {
    "id": "economy",
    "title": "Herní ekonomika",
    "description": "Bodování a bonusy",
    "status": "planned",
    "group": "Hra"
  },
  {
    "id": "game-config",
    "title": "Herní konfigurace",
    "description": "Pravidla a provozní režim",
    "status": "planned",
    "group": "Hra"
  },
  {
    "id": "events",
    "title": "Herní události",
    "description": "Chronologický přehled akcí",
    "status": "planned",
    "group": "Hra"
  },
  {
    "id": "achievements",
    "title": "Sbírky a úspěchy",
    "description": "Budoucí rozšíření",
    "status": "planned",
    "group": "Hra"
  },
  {
    "id": "players",
    "title": "Seznam hráčů",
    "description": "Přehled účtů",
    "status": "planned",
    "group": "Hráči"
  },
  {
    "id": "accounts",
    "title": "Správa účtů",
    "description": "Moderace a ruční obnova hesel",
    "status": "planned",
    "group": "Hráči"
  },
  {
    "id": "suspicious",
    "title": "Podezřelé herní akce",
    "description": "Kontrola bez automatických banů",
    "status": "planned",
    "group": "Hráči"
  },
  {
    "id": "landing",
    "title": "Landing page",
    "description": "Texty veřejného webu",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "news",
    "title": "Novinky",
    "description": "Články",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "changelog",
    "title": "Changelog",
    "description": "Historie verzí",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "faq",
    "title": "FAQ",
    "description": "Otázky a odpovědi",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "rules",
    "title": "Pravidla",
    "description": "Herní dokumentace",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "roadmap",
    "title": "Stav vývoje",
    "description": "Veřejná roadmapa",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "contact",
    "title": "Kontakt",
    "description": "Kontaktní údaje",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "terms",
    "title": "Podmínky",
    "description": "Verze podmínek",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "privacy",
    "title": "Soukromí",
    "description": "Zásady ochrany údajů",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "discord",
    "title": "Discord",
    "description": "Budoucí integrace",
    "status": "planned",
    "group": "Obsah a komunita"
  },
  {
    "id": "system",
    "title": "Stav služeb",
    "description": "Diagnostika",
    "status": "planned",
    "group": "Systém"
  },
  {
    "id": "jobs",
    "title": "Plánované úlohy",
    "description": "Uzávěrky a importy",
    "status": "planned",
    "group": "Systém"
  },
  {
    "id": "audit",
    "title": "Auditní log",
    "description": "Historie zásahů",
    "status": "planned",
    "group": "Systém"
  },
  {
    "id": "config",
    "title": "Konfigurace",
    "description": "Provozní nastavení",
    "status": "planned",
    "group": "Systém"
  }
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
 const normalize=value=>String(value??"").normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase("cs");
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
