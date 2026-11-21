const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("stop-card.js","utf8");
const app=fs.readFileSync("app.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const ctx={};
vm.runInNewContext(source+"\nthis.card=stopCardHtml;this.countdown=stopCountdown;",ctx);
const stop={id:"demo",name:"Líbeznická",cats:["tram"],
 points:[{id:"1",platform:"A"},{id:"2",platform:"B"}]};
const args={stop,selectedPlayer:"p1",gameDay:"2026-11-19",diffDays:()=>0,
 captureScore:()=>10,holdingScore:()=>1,now:Date.parse("2026-11-19T12:00:00Z")};
test("Karta má jen bodové údaje a kategorie bez počtu sloupků a platforem",()=>{
 const content=ctx.card(args);
 assert.match(content,/Bodů za obsazení/);
 assert.match(content,/Plný výnos \/ den/);
 assert.match(content,/Tramvaj/);
 assert.doesNotMatch(content,/Stanovišť PID|Nástupiště|data-platform|Herní zastávka/);
});
test("Vlastník je nad názvem a barva je tenká horní lišta",()=>{
 assert.match(html,/id="stop-owner-heading"/);
 assert.ok(html.indexOf('id="stop-owner-heading"')<html.indexOf('id="stopname"'));
 assert.match(app,/--sheet-owner-color/);
 assert.doesNotMatch(html,/<div class="eyebrow">Herní zastávka<\/div>/);
});
test("Ochrana má viditelný odpočet nahoře a na tlačítku převzetí",()=>{
 const content=ctx.card({...args,owner:{name:"Sova"},
  record:{owner:"p2",anchor:"2026-11-19",protectedUntil:"2026-11-19T13:01:02Z"}});
 assert.match(content,/Ochrana proti převzetí/);
 assert.match(content,/01:01:02/);
 assert.match(content,/data-protection-countdown/);
 assert.match(app,/Převzetí za/);
 assert.match(app,/setInterval\(\(\)=>\{/);
});
test("Vlastní ochrana se v kartě zobrazuje, neutrál časovač nemá",()=>{
 const mine=ctx.card({...args,record:{owner:"p1",anchor:"2026-11-19",
  protectedUntil:"2026-11-20T12:00:00Z"}});
 const neutral=ctx.card(args);
 assert.match(mine,/data-protection-countdown/);
 assert.doesNotMatch(neutral,/data-protection-countdown/);
});
test("Starší vlastnictví má nulový aktuální výnos",()=>{
 const content=ctx.card({...args,record:{owner:"p2",anchor:"2026-11-09"},diffDays:()=>10});
 assert.match(content,/Bez denního výnosu/);
 assert.match(content,/<strong>0<\/strong>/);
});
test("Neznámé HTML v kategorii se escapuje",()=>{
 const content=ctx.card({...args,stop:{...stop,cats:['<img src=x onerror=alert(1)>']}});
 assert.doesNotMatch(content,/<img/);
 assert.match(content,/&lt;img/);
});
test("Odpočet správně přechází na nulu",()=>{
 const until="2026-11-19T12:00:05Z";
 assert.equal(ctx.countdown(until,Date.parse("2026-11-19T12:00:00Z")),"00:00:05");
 assert.equal(ctx.countdown(until,Date.parse("2026-11-19T12:00:10Z")),"00:00:00");
});

test("Kategorie mají existující piktogramy Temaki, ale žádné emoji",()=>{
 const content=ctx.card(args);
 assert.match(content,/class="stop-mode-icon"/);
 assert.match(content,/icons\/tram.svg/);
 assert.doesNotMatch(content,/🚋|🚌|🚆/);
});
test("Neobsazená zastávka je v horním označení karty",()=>{
 assert.match(app,/Neobsazená zastávka/);
 assert.doesNotMatch(app,/Neutrální zastávka/);
});
