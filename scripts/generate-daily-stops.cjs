#!/usr/bin/env node
"use strict";
/**
 * Publikovaný kalendář zastávek dne pro statickou alpha verzi.
 *
 * Vylosované dny jsou uložené a nikdy se nepřelosovávají.
 * Administrátorské výjimky jsou nezávislé na náhodném rozpisu.
 * Běží denně v GitHub Actions; nevyžaduje databázi ani síť.
 */
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {randomInt}=require("node:crypto");

const ROOT=path.resolve(__dirname,"..");
const OUTPUT=path.join(ROOT,"data/daily-stops.generated.json");
const OVERRIDES=path.join(ROOT,"data/daily-stops.overrides.json");
const BROWSER=path.join(ROOT,"js/daily-stops.generated.js");
const AHEAD_DAYS=14;
const BACKFILL_DAYS=30;

function readJson(file){
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function isDay(value){
  return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
    new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value;
}
function addDays(day,offset){
  const dt=new Date(day+"T12:00:00Z");
  dt.setUTCDate(dt.getUTCDate()+offset);
  return dt.toISOString().slice(0,10);
}
function gameDay(now=new Date()){
  const formatter=new Intl.DateTimeFormat("en-CA",{
    timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",hourCycle:"h23"
  });
  const parts=Object.fromEntries(formatter.formatToParts(now).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  const day=parts.year+"-"+parts.month+"-"+parts.day;
  return Number(parts.hour)<3?addDays(day,-1):day;
}
function isEligible(stop){
  return !!stop&&stop.cats.length>0&&stop.points.some(p=>p.insidePrague&&!p.isMetro);
}
// Jednorázová migrace: dřívější dny zachovají výběr původní alpha hry.
function legacyStopForDay(day,stops){
  const key=day.replaceAll("-","");
  let seed=0;
  for(const char of key)seed=(seed*31+char.charCodeAt(0))>>>0;
  for(let index=0;index<stops.length;index++){
    const stop=stops[(seed+index)%stops.length];
    if(isEligible(stop))return stop;
  }
  return null;
}
function readStops(){
  const source=fs.readFileSync(path.join(ROOT,"pid-prague.js"),"utf8");
  const stops=vm.runInNewContext(source+"\nPID_PRAGUE;",{}, {timeout:10000});
  if(!Array.isArray(stops)||stops.length===0)throw Error("PID dataset je prázdný.");
  return stops;
}
function validateOverride(date,item,stopMap){
  if(!isDay(date))throw Error("Neplatné datum výjimky: "+date);
  if(!item||typeof item!=="object"||Array.isArray(item)||
     typeof item.stopId!=="string"||!isEligible(stopMap.get(item.stopId))){
    throw Error("Výjimka "+date+" neodkazuje na způsobilou herní zastávku.");
  }
  if(item.note!==undefined&&(typeof item.note!=="string"||item.note.length>300)){
    throw Error("Neplatná poznámka k výjimce "+date);
  }
}
function stable(value){return JSON.stringify(value??null)}
function generate(options={}){
  const today=options.today||gameDay();
  if(!isDay(today))throw Error("Neplatný herní den "+today);
  const stops=options.stops||readStops();
  const eligible=stops.filter(isEligible);
  if(!eligible.length)throw Error("Žádné způsobilé zastávky.");
  const stopMap=new Map(stops.map(stop=>[stop.id,stop]));
  const schedule=options.schedule||readJson(OUTPUT);
  const admin=options.admin||readJson(OVERRIDES);
  if(schedule.version!==1||admin.version!==1||!schedule.days||!admin.dates){
    throw Error("Neznámá verze datového schématu zastávky dne.");
  }
  const overrides=admin.dates;
  for(const [day,item] of Object.entries(overrides))validateOverride(day,item,stopMap);
  for(const [day,old] of Object.entries(schedule.publishedOverrides||{})){
    if(day<=today&&stable(old)!==stable(overrides[day])){
      throw Error("Výjimku pro probíhající nebo uzavřený herní den nelze zpětně měnit: "+day);
    }
  }
  for(const [day,item] of Object.entries(overrides)){
    if(day<=today&&stable(item)!==stable((schedule.publishedOverrides||{})[day])){
      throw Error("Výjimku pro probíhající nebo uzavřený herní den nelze nově přidat: "+day);
    }
  }
  const days={...schedule.days};
  const originalCount=Object.keys(days).length;
  for(const [day,stopId] of Object.entries(days)){
    if(!isDay(day)||typeof stopId!=="string"||!isEligible(stopMap.get(stopId))){
      throw Error("Dříve vylosovaná zastávka není platná: "+day+" / "+stopId);
    }
  }
  for(let offset=-BACKFILL_DAYS;offset<=AHEAD_DAYS;offset++){
    const day=addDays(today,offset);
    if(days[day])continue;
    if(day<=today){
      const old=legacyStopForDay(day,stops);
      if(!old)throw Error("Chybí historicky způsobilá zastávka dne "+day);
      days[day]=old.id;
      continue;
    }
    const idx=options.pickIndex?options.pickIndex(eligible.length,day):randomInt(eligible.length);
    if(!Number.isInteger(idx)||idx<0||idx>=eligible.length)throw Error("Neplatný los "+day);
    days[day]=eligible[idx].id;
  }
  const orderedDays=Object.fromEntries(Object.entries(days).sort(([a],[b])=>a.localeCompare(b)));
  const orderedOverrides=Object.fromEntries(Object.entries(overrides).sort(([a],[b])=>a.localeCompare(b)));
  const next={version:1,days:orderedDays,publishedOverrides:orderedOverrides};
  const module={
    version:1,
    days:orderedDays,
    overrides:Object.fromEntries(Object.entries(orderedOverrides).map(([day,row])=>[day,row.stopId]))
  };
  const json=JSON.stringify(next,null,2)+"\n";
  const browser='"use strict";\n// Generováno skriptem scripts/generate-daily-stops.cjs. Neupravovat ručně.\n'+
    "export const DAILY_STOP_SCHEDULE=Object.freeze("+JSON.stringify(module,null,2)+");\n";
  return {json,browser,today,count:Object.keys(orderedDays).length,newCount:Object.keys(orderedDays).length-originalCount};
}
if(require.main===module){
  try{
    const result=generate();
    const check=process.argv.includes("--check");
    if(check){
      if(fs.readFileSync(OUTPUT,"utf8")!==result.json||
         fs.readFileSync(BROWSER,"utf8")!==result.browser){
        console.error("Generovaný rozpis není aktuální.");
        process.exitCode=1;
      }
    }else{
      fs.writeFileSync(OUTPUT,result.json);
      fs.writeFileSync(BROWSER,result.browser);
    }
    console.log("Herní den "+result.today+"; uloženo "+result.count+" termínů, budoucí horizont "+AHEAD_DAYS+" dní.");
  }catch(error){console.error(error.message);process.exitCode=1}
}
module.exports={generate,isDay,gameDay,addDays,isEligible,validateOverride};
