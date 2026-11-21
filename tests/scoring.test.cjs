const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const scoring=fs.readFileSync("scoring.js","utf8");
const card=fs.readFileSync("stop-card.js","utf8");
const app=fs.readFileSync("app.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const css=fs.readFileSync("style.css","utf8");
const ctx={};
vm.runInNewContext(scoring+"\nthis.scoring={captureBreakdown,holdingBreakdown,ACTIVE_SCORE_BONUSES};",ctx);
const {captureBreakdown,holdingBreakdown,ACTIVE_SCORE_BONUSES}=ctx.scoring;
function plain(o){return JSON.parse(JSON.stringify(o))}
function stop(cats){return {id:"x",name:"Test",cats}}
test("Obsazení používá nejvyšší sazbu a poloviční další kategorie",()=>{
 const result=plain(captureBreakdown(stop(["metro","tram","bus"])));
 assert.equal(result.baseTotal,23);
 assert.equal(result.total,23);
 assert.deepEqual(result.lines.map(x=>x.amount),[16,5,2]);
});
test("Městský a regionální autobus se při obsazení sloučí, ale v denním výnosu rozdělí",()=>{
 const s=stop(["tram","urban_bus","regional_bus"]);
 const capture=plain(captureBreakdown(s));
 const hold=plain(holdingBreakdown(s));
 assert.equal(capture.total,12);
 assert.deepEqual(capture.lines.map(x=>x.code),["tram","bus"]);
 assert.equal(hold.total,3);
 assert.deepEqual(hold.lines.map(x=>x.code),["tram","urban_bus","regional_bus"]);
});
test("Udržování po sedmi dnech ukáže korekci nulového výnosu",()=>{
 const base={ownerRecord:{owner:"p1",anchor:"2026-11-01"},
   gameDay:"2026-11-15",diffDays:()=>14};
 const b=plain(holdingBreakdown(stop(["metro","tram"]),base));
 assert.equal(b.baseTotal,2);
 assert.equal(b.holdingAdjustment,-2);
 assert.equal(b.total,0);
});
test("Žádný neschválený bonus se nepřipočítává automaticky",()=>{
 assert.equal(ACTIVE_SCORE_BONUSES.length,0);
 const b=plain(captureBreakdown(stop(["tram"])));
 assert.equal(b.bonusLines.length,0);
 assert.equal(b.total,10);
});
test("Karta a rozpis jsou klikatelné a používají stejné funkce",()=>{
 assert.match(card,/data-score-detail="capture"/);
 assert.match(card,/data-score-detail="holding"/);
 assert.doesNotMatch(card,/Testovací stav je uložen jen v tomto prohlížeči/);
 assert.match(app,/function captureScore\(s\)\{return captureBreakdown\(s,\{bonuses:ACTIVE_SCORE_BONUSES\}\)\.total\}/);
 assert.match(app,/function holdingScore\(s\)\{return holdingBreakdown\(s,\{bonuses:ACTIVE_SCORE_BONUSES\}\)\.total\}/);
 assert.match(html,/id="score-dialog-overlay"/);
 assert.match(html,/role="dialog"/);
 assert.ok(html.indexOf('src="scoring.js')<html.indexOf('src="app.js'));
 assert.match(css,/score-dialog-overlay\[hidden\]/);
});
