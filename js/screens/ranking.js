"use strict";
export function createRankingScreen({getState,getRankingPeriod,PLAYERS,total,playerLabel,escapeStopText,$}){
function renderRanking(){
 const period=getRankingPeriod()==="30"?30:null;
 const sorted=PLAYERS.slice().sort((a,b)=>total(b.id,period)-total(a.id,period)||a.name.localeCompare(b.name,"cs"));
 $("leaderboard").innerHTML=sorted.map((p,i)=>{
  const current=Object.values(getState().stops).filter(x=>x.owner===p.id).length;
  return '<tr'+(p.id===getState().selected?' class="is-me"':'')+'><td>'+(i+1)+'.</td><td><button class="ranking-player-link" data-player-id="'+escapeStopText(p.id)+'"><span class="ranking-player-dot" style="background:'+escapeStopText(p.color)+'"></span>'+escapeStopText(playerLabel(p.id))+'</button></td><td>'+total(p.id,period).toLocaleString("cs-CZ")+'</td><td>'+current+'</td></tr>';
 }).join("");
 for(const b of document.querySelectorAll("[data-ranking-period]"))b.setAttribute("aria-pressed",String(b.dataset.rankingPeriod===getRankingPeriod()));
}

return {renderRanking};
}
