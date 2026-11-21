const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const src=fs.readFileSync("scoring.js","utf8");
const app=fs.readFileSync("app.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const ctx={};
vm.runInNewContext(src+"\nthis.api={captureBreakdown,holdingBreakdown,actionCost,holdingIncome,RULES};",ctx);
const {captureBreakdown,holdingBreakdown,actionCost,holdingIncome,RULES}=ctx.api;
const stop=cats=>({id:"x",name:"Test",cats});
test("Schválené sazby 16/24/32 a váhy 100/50/25",()=>{
 const b=captureBreakdown(stop(["metro","tram","bus"]));
 assert.deepEqual(Array.from(b.lines,x=>x.amount),[32,12,4]);
 assert.equal(b.total,48);
});
test("Neutrální bonus +16 neplatí na převzetí",()=>{
 assert.equal(captureBreakdown(stop(["tram"]),{neutral:true}).total,40);
 assert.equal(captureBreakdown(stop(["tram"])).total,24);
});
test("Městský a regionální autobus se ve všech herních výpočtech počítají jako jeden druh",()=>{
 const s=stop(["tram","urban_bus","regional_bus"]);
 assert.equal(captureBreakdown(s).total,32);
 assert.equal(holdingBreakdown(s).total,12);
});
test("AP rozpočet, drahé území a příplatek za převzetí",()=>{
 assert.equal(RULES.dailyAP,10);
 assert.equal(actionCost(stop(["tram"]),"capture",false),1);
 assert.equal(actionCost(stop(["tram"]),"capture",true),2);
 assert.equal(actionCost(stop(["metro","tram","bus"]),"capture",true),3);
 assert.equal(actionCost(stop(["metro","tram","bus"]),"maintain"),2);
 assert.equal(RULES.significantCategories,2);
 assert.equal(actionCost(stop(["tram","bus"]),"capture",false),2);
 assert.equal(actionCost(stop(["tram","bus"]),"capture",true),3);
 assert.equal(actionCost(stop(["tram","bus"]),"maintain"),2);
 assert.equal(actionCost(stop(["bus"]),"maintain"),1);
 assert.equal(actionCost(stop(["urban_bus","regional_bus"]),"capture",false),1);
 assert.equal(actionCost(stop(["tram","urban_bus","regional_bus"]),"capture",false),2);
});
test("Den akce nula, sedm plných dnů a pokles do nuly",()=>{
 const s=stop(["tram","bus"]),rec={anchor:"2026-11-01"};
 const age=(day)=>Number(day);
 assert.equal(holdingIncome(s,rec,"0",()=>0),0);
 assert.equal(holdingIncome(s,rec,"7",()=>7),12);
 assert.equal(holdingIncome(s,rec,"8",()=>8),12);
 for(const [age,amount] of [[9,10],[10,8],[11,6],[12,4],[13,2],[14,0]])assert.equal(holdingIncome(s,rec,"x",()=>age),amount);
});
test("Rozpis, historie a AP na mapě jsou propojené",()=>{
 assert.match(html,/id="stop-history-list"/);
 assert.match(html,/id="stop-history-open"/);
 assert.match(html,/id="history-dialog-overlay"/);
 assert.match(app,/function showHistoryDetail/);
 assert.match(app,/function closeHistoryDetail/);
 assert.match(html,/id="ap-map"/);
 assert.match(app,/function renderStopHistory/);
 assert.match(app,/function spentAP/);
 assert.match(app,/protectedUntil=new Date/);
});

test("Celý nepřerušený výnosový cyklus dává 63 × váha modelu C",()=>{
 for(const [cats,full,total] of [[["bus"],6,63],[["tram","bus"],12,126],[["metro","tram","bus"],12,126],[["metro","tram","bus","trolleybus"],18,189]]){
  const rec={anchor:"2026-11-01"},s=stop(cats);
  assert.equal(holdingBreakdown(s).total,full);
  const actual=Array.from({length:15},(_,age)=>holdingIncome(s,rec,"2026-11-01",()=>age)).reduce((a,b)=>a+b,0);
  assert.equal(actual,total);
 }
});
test("Nový neutrální bonus a obsazení pražských kombinací",()=>{
 assert.equal(captureBreakdown(stop(["bus"]),{neutral:true}).total,32);
 assert.equal(captureBreakdown(stop(["tram","bus"]),{neutral:true}).total,48);
 assert.equal(captureBreakdown(stop(["metro","tram","bus"]),{neutral:true}).total,64);
 assert.equal(captureBreakdown(stop(["metro","tram","bus"])).total,48);
 assert.equal(RULES.version,"2026-11-21-economy-v3");
});

test("Obsazovací základ ×2, schválený bonus neutrality a nulová změna denního základu",()=>{
 assert.equal(RULES.neutralBonus,16);
 assert.equal(captureBreakdown(stop(["metro"])).total,32);
 assert.equal(captureBreakdown(stop(["train"])).total,32);
 assert.equal(captureBreakdown(stop(["ferry"])).total,24);
 assert.equal(captureBreakdown(stop(["trolleybus"])).total,24);
 assert.equal(captureBreakdown(stop(["urban_bus","regional_bus"]),{neutral:true}).total,32);
 assert.equal(captureBreakdown(stop(["metro","tram","bus","trolleybus"])).total,54);
 assert.equal(holdingBreakdown(stop(["bus"])).total,6);
 assert.equal(holdingBreakdown(stop(["tram","bus"])).total,12);
 assert.deepEqual(Array.from(RULES.declining),[6,5,4,3,2,1,0]);
});

test("Autobusová kombinace nemá zvýhodnění při držení ani AP",()=>{
 const solo=stop(["bus"]),both=stop(["urban_bus","regional_bus"]);
 assert.equal(captureBreakdown(both,{neutral:true}).total,captureBreakdown(solo,{neutral:true}).total);
 assert.equal(holdingBreakdown(both).total,holdingBreakdown(solo).total);
 assert.equal(actionCost(both,"capture"),actionCost(solo,"capture"));
 const multi=stop(["tram","urban_bus","regional_bus"]);
 const normalized=stop(["tram","bus"]);
 assert.equal(captureBreakdown(multi).total,captureBreakdown(normalized).total);
 assert.equal(holdingBreakdown(multi).total,holdingBreakdown(normalized).total);
 assert.equal(actionCost(multi,"capture"),actionCost(normalized,"capture"));
 assert.equal(actionCost(multi,"maintain"),actionCost(normalized,"maintain"));
});
