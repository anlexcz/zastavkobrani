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
test("Schválené sazby 8/12/16 a váhy 100/50/25",()=>{
 const b=captureBreakdown(stop(["metro","tram","bus"]));
 assert.deepEqual(Array.from(b.lines,x=>x.amount),[16,6,2]);
 assert.equal(b.total,24);
});
test("Neutrální bonus +8 neplatí na převzetí",()=>{
 assert.equal(captureBreakdown(stop(["tram"]),{neutral:true}).total,20);
 assert.equal(captureBreakdown(stop(["tram"])).total,12);
});
test("Autobusové kategorie se pro obsazení sloučí",()=>{
 const s=stop(["tram","urban_bus","regional_bus"]);
 assert.equal(captureBreakdown(s).total,16);
 assert.equal(holdingBreakdown(s).total,2);
});
test("AP rozpočet, drahé území a příplatek za převzetí",()=>{
 assert.equal(RULES.dailyAP,10);
 assert.equal(actionCost(stop(["tram"]),"capture",false),1);
 assert.equal(actionCost(stop(["tram"]),"capture",true),2);
 assert.equal(actionCost(stop(["metro","tram","bus"]),"capture",true),3);
 assert.equal(actionCost(stop(["metro","tram","bus"]),"maintain"),2);
});
test("Den akce nula, sedm plných dnů a pokles do nuly",()=>{
 const s=stop(["tram","bus"]),rec={anchor:"2026-11-01"};
 const age=(day)=>Number(day);
 assert.equal(holdingIncome(s,rec,"0",()=>0),0);
 assert.equal(holdingIncome(s,rec,"7",()=>7),2);
 assert.equal(holdingIncome(s,rec,"8",()=>8),2);
 assert.equal(holdingIncome(s,rec,"14",()=>14),0);
});
test("Rozpis, historie a AP na mapě jsou propojené",()=>{
 assert.match(html,/id="stop-history-list"/);
 assert.match(html,/id="ap-map"/);
 assert.match(app,/function renderStopHistory/);
 assert.match(app,/function spentAP/);
 assert.match(app,/protectedUntil=new Date/);
});
