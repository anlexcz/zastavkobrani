"use strict";
const RULES=Object.freeze({version:"2026-11-21-economy-v3",dailyAP:10,significantCategories:3,neutralBonus:16,
 captureRates:{metro:32,train:32,funicular:24,tram:24,trolleybus:24,ferry:24,bus:16},
 holdingByCategories:[0,6,12,12,18],declining:[6,5,4,3,2,1,0]});
const SCORING_BASE=Object.freeze({...RULES.captureRates,urban_bus:16,regional_bus:16});
const SCORING_LABELS=Object.freeze({metro:"Metro",train:"Vlak",funicular:"Lanovka",tram:"Tramvaj",trolleybus:"Trolejbus",ferry:"Přívoz",bus:"Autobus",urban_bus:"Městský autobus",regional_bus:"Regionální autobus"});
const ACTIVE_SCORE_BONUSES=Object.freeze([]);
function scoringCategories(stop,kind){
 const categories=[...new Set(stop.cats||[])];
 return kind==="capture"?[...new Set(categories.map(c=>["urban_bus","regional_bus"].includes(c)?"bus":c))]:categories;
}
function actionCost(stop,kind,hasOpponent=false){
 return (scoringCategories(stop,"holding").length>=RULES.significantCategories?2:1)+(kind==="capture"&&hasOpponent?1:0);
}
function holdingIncome(stop,record,day,diffDays){
 const n=scoringCategories(stop,"holding").length,full=RULES.holdingByCategories[Math.min(n,4)]||0;
 if(!record||!day||!diffDays)return full;
 const age=diffDays(day,record.anchor);
 if(age<=0||age>=15)return 0;
 if(age<=7)return full;
 return (full/6)*RULES.declining[age-8];
}
function scoringBreakdown(stop,kind,{ownerRecord=null,gameDay=null,diffDays=null,bonuses=[],neutral=false}={}){
 if(!["capture","holding"].includes(kind))throw Error("Neznámý druh výpočtu");
 const cats=scoringCategories(stop,kind);
 const entries=cats.filter(c=>Object.hasOwn(SCORING_BASE,c)).map(code=>({code,label:SCORING_LABELS[code],base:SCORING_BASE[code]}));
 if(kind==="capture")entries.sort((a,b)=>b.base-a.base||a.code.localeCompare(b.code));
 const full=RULES.holdingByCategories[Math.min(cats.length,4)]||0;
 const lines=kind==="capture"?entries.map((e,i)=>({...e,multiplier:i===0?1:i===1?.5:.25,amount:e.base*(i===0?1:i===1?.5:.25)})):[{code:"holding",label:"Denní základ ("+cats.length+" druhů)",base:full,multiplier:1,amount:full}];
 const baseTotal=lines.reduce((n,e)=>n+e.amount,0);
 const current=kind==="holding"&&ownerRecord?holdingIncome(stop,ownerRecord,gameDay,diffDays):baseTotal;
 const bonusLines=bonuses.filter(b=>b?.action===kind&&typeof b.label==="string"&&Number.isInteger(b.points)&&b.points>=0).map(b=>({label:b.label,amount:b.points}));
 if(kind==="capture"&&neutral)bonusLines.unshift({label:"Bonus za neutrální zastávku",amount:RULES.neutralBonus});
 const bonusTotal=bonusLines.reduce((n,b)=>n+b.amount,0);
 return {kind,lines,baseTotal,bonusLines,bonusTotal,holdingAdjustment:kind==="holding"?current-baseTotal:0,total:current+bonusTotal};
}
function captureBreakdown(stop,ctx={}){return scoringBreakdown(stop,"capture",ctx)}
function holdingBreakdown(stop,ctx={}){return scoringBreakdown(stop,"holding",ctx)}
