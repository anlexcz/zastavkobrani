"use strict";
import {gameDay,addDays} from "../game-time.js";
export function createDailyScreen({getState,getExpanded,getSelectedPlayer,challengeStopForDay,escapeStopText,$}){
function dailyHistoryItems(day=gameDay()){
 const result=[];
 for(let i=1;i<=30;i++){const d=addDays(day,-i),stop=challengeStopForDay(d);if(stop)result.push({day:d,name:stop.name,done:!!getState().visits[d]?.[getSelectedPlayer()]});}
 return result;
}
function renderDailyHistory(){
 const items=dailyHistoryItems(),shown=getExpanded()?items:items.slice(0,5);
 const fmt=new Intl.DateTimeFormat("cs-CZ",{day:"numeric",month:"numeric",year:"numeric",timeZone:"Europe/Prague"});
 $("daily-history").innerHTML=shown.map(item=>
  '<div class="daily-history-item"><div><time datetime="'+item.day+'">'+fmt.format(new Date(item.day+"T12:00:00Z"))+'</time><strong>'+escapeStopText(item.name)+'</strong></div><span class="daily-history-result '+(item.done?"is-done":"")+'">'+(item.done?"Splněno":"Nesplněno")+'</span></div>'
 ).join("")||'<p class="muted">Zatím žádná historie.</p>';
 $("daily-history-expand").hidden=items.length<=5;
 $("daily-history-expand").textContent=getExpanded()?"Zobrazit méně":"Zobrazit celou historii ("+items.length+")";
 $("daily-history-expand").setAttribute("aria-expanded",String(getExpanded()));
}

return {renderDailyHistory,dailyHistoryItems};
}
