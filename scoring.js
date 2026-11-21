"use strict";
// Jediný klientský model bodování. Server musí při produkčním nasazení ověřit
// identické parametry, bonusy a výslednou transakci autoritativně.
const SCORING_BASE=Object.freeze({
  metro:16,train:14,funicular:12,tram:10,trolleybus:8,ferry:6,
  urban_bus:4,regional_bus:4,bus:4
});
const SCORING_LABELS=Object.freeze({
  metro:"Metro",train:"Vlak",funicular:"Lanovka",tram:"Tramvaj",
  trolleybus:"Trolejbus",ferry:"Přívoz",urban_bus:"Městský autobus",
  regional_bus:"Regionální autobus",bus:"Autobus"
});
// Zatím neexistuje schválený konkrétní bonus. Nikdy jej nevymýšlet z UI.
const ACTIVE_SCORE_BONUSES=Object.freeze([]);
function scoringCategories(stop,kind){
  const unique=[...new Set(stop.cats||[])];
  return kind==="capture"
    ?[...new Set(unique.map(x=>x==="urban_bus"||x==="regional_bus"?"bus":x))]
    :unique;
}
function scoringBreakdown(stop,kind,{ownerRecord=null,gameDay=null,diffDays=null,bonuses=[]}={}){
  if(!["capture","holding"].includes(kind))throw Error("Neznámý druh výpočtu");
  const entries=scoringCategories(stop,kind)
    .filter(c=>Object.hasOwn(SCORING_BASE,c))
    .map(code=>({code,name:SCORING_LABELS[code],base:SCORING_BASE[code]}));
  if(kind==="capture")entries.sort((a,b)=>b.base-a.base);
  const lines=entries.map((e,i)=>({
    code:e.code,label:e.name,base:e.base,
    multiplier:kind==="capture"?(i===0?1:0.5):1,
    amount:kind==="capture"?(i===0?e.base:e.base/2):1
  }));
  const baseTotal=lines.reduce((sum,line)=>sum+line.amount,0);
  const actualHolding=kind!=="holding"||!ownerRecord||!gameDay||!diffDays
    ?baseTotal
    :(diffDays(gameDay,ownerRecord.anchor)+1<=7?baseTotal:0);
  // Bonusy se přijímají jen jako explicitně vypočtené a schválené položky
  // pro danou akci. Testovací verze žádné aktivní bonusy neobsahuje.
  const bonusLines=bonuses.filter(b=>b&&b.action===kind&&
    typeof b.label==="string"&&Number.isInteger(b.points)&&b.points>=0)
    .map(b=>({label:b.label,amount:b.points}));
  const bonusTotal=bonusLines.reduce((sum,b)=>sum+b.amount,0);
  return {kind,lines,baseTotal,bonusLines,bonusTotal,
    holdingAdjustment:kind==="holding"?actualHolding-baseTotal:0,
    total:actualHolding+bonusTotal};
}
function captureBreakdown(stop,ctx={}){return scoringBreakdown(stop,"capture",ctx)}
function holdingBreakdown(stop,ctx={}){return scoringBreakdown(stop,"holding",ctx)}
