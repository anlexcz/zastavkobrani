"use strict";
import {gameDay,addDays,diffDays} from "./game-time.js";
import {resolveDailyStop} from "./daily-stops.js";
// Lokální demo model; autoritativní serverové transakce jej v produkci nahradí.
export function createGameModel({STOPS,PLAYERS,ROUTE_22_SEED,RULES,captureBreakdown,holdingBreakdown,ACTIVE_SCORE_BONUSES,getState,persist}){
function challengeStopForDay(day){return resolveDailyStop(day,STOPS)}
function init(withSeed=true){
 const day=gameDay(),now=new Date(),stops={},ledger=[],events=[];
 if(withSeed)ROUTE_22_SEED.forEach((name,index)=>{
  const stop=STOPS.find(s=>s.name===name&&s.cats.includes("tram"));
  if(!stop)return;
  // Neutrální zastávky střídáme s obsazenými; historii vytváříme jen z testovacích událostí.
  if(index%5===4)return;
  const owner=index%3===0?"p1":"p2";
  const date=new Date(now.getTime()-(6+index%3)*3600000);
  const previous=owner==="p1"?"p2":"p1";
  const past=new Date(date.getTime()-3*86400000);
  const pastDay=gameDay(past),captureDay=gameDay(date);
  events.push({action:"capture",stopId:stop.id,player:previous,day:pastDay,at:past.toISOString(),previousOwner:null,points:captureScore(stop,true),
   text:PLAYERS.find(p=>p.id===previous).name+" obsadil/a "+stop.name,seed:true});
  events.push({action:"capture",stopId:stop.id,player:owner,day:captureDay,at:date.toISOString(),previousOwner:previous,points:captureScore(stop),
   text:PLAYERS.find(p=>p.id===owner).name+" převzal/a "+stop.name,seed:true});
  stops[stop.id]={owner,anchor:captureDay,capturedAt:date.toISOString(),protectedUntil:new Date(date.getTime()+RULES.protectionHours*60*60*1000).toISOString()};
  ledger.push({player:previous,amount:captureBreakdown(stop,{neutral:true}).total,type:"capture",day:pastDay,at:past.toISOString(),seed:true});
  ledger.push({player:owner,amount:captureBreakdown(stop).total,type:"capture",day:captureDay,at:date.toISOString(),seed:true});
 });
 events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 return {version:3,selected:"p1",stops,ledger,events,visits:{},lastClosedDay:addDays(day,-1)};
}
function award(player,amount,type,day=gameDay(),stopId=null){getState().ledger.push({player,amount,type,day,at:new Date().toISOString(),...(stopId?{stopId}:{})})}
function captureScore(s,neutral=false){return captureBreakdown(s,{bonuses:ACTIVE_SCORE_BONUSES,neutral}).total}
function holdingScore(s,record=null,day=gameDay()){return holdingBreakdown(s,{ownerRecord:record,gameDay:day,diffDays,bonuses:ACTIVE_SCORE_BONUSES}).total}
function closeDays(){
 const today=gameDay();let d=addDays(getState().lastClosedDay,1),count=0;
 while(d<today&&count++<730){
  for(const stop of STOPS){
   const item=getState().stops[stop.id];if(!item?.owner)continue;
   const age=diffDays(d,item.anchor);
   if(age>0&&age<=14){
    const income=holdingScore(stop,item,d);
    if(income>0)award(item.owner,income,"holding",d,stop.id);
   }
   if(age>=14&&holdingScore(stop,item,d)===0){
    getState().events.unshift({action:"expire",stopId:stop.id,day:d,at:new Date().toISOString(),previousOwner:item.owner,text:stop.name+": vlastnictví vypršelo"});
    delete getState().stops[stop.id];
   }
  }
  getState().lastClosedDay=d;d=addDays(d,1);
 }
 if(count>=730&&d<today)getState().lastClosedDay=addDays(today,-1);
 persist();
}
function spentAP(player=getState().selected,day=gameDay()){
 return getState().events.filter(e=>!e.seed&&e.player===player&&e.day===day&&["capture","maintain"].includes(e.action))
  .reduce((sum,e)=>sum+(e.apCost||0),0);
}
function remaining(player=getState().selected){return Math.max(0,RULES.dailyAP-spentAP(player))}
function owned(){return Object.values(getState().stops).filter(v=>v.owner===getState().selected).length}
function total(id,days){return getState().ledger.filter(x=>x.player===id&&(!days||diffDays(gameDay(),x.day)>=0&&diffDays(gameDay(),x.day)<days)).reduce((a,b)=>a+b.amount,0)}
function challengeStop(){return challengeStopForDay(gameDay())}
function visitsFor(id){return getState().visits[gameDay()]?.[id]||false}

return {challengeStopForDay,init,award,captureScore,holdingScore,closeDays,spentAP,remaining,owned,total,challengeStop,visitsFor};
}
