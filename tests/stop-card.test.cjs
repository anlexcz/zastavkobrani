const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("transport-modes.js","utf8")+"\n"+fs.readFileSync("stop-card.js","utf8");
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
 assert.match(content,/Ochrana území/);
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
 assert.match(content,/Klesající výnos|Výnos dosáhl nuly/);
 assert.match(content,/<strong>1<\/strong>/);
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
 assert.doesNotMatch(content,/class="stop-mode"[^>]*><img[^>]*><span>/);
 assert.match(content,/assets\/temaki\/tram.svg/);
 assert.doesNotMatch(content,/🚋|🚌|🚆/);
});
test("Neobsazená zastávka je v horním označení karty",()=>{
 assert.match(app,/Neobsazená zastávka/);
 assert.doesNotMatch(app,/Neutrální zastávka/);
});

test("Karta používá jen piktogramy s přístupným názvem, bez textových štítků",()=>{
 const content=ctx.card({...args,stop:{...stop,cats:["tram","bus"]}});
 assert.match(content,/aria-label="Tramvaj"/);
 assert.match(content,/aria-label="Autobus"/);
 assert.doesNotMatch(content,/>Tramvaj<|>Autobus</);
});
test("Akční UI má jedno tlačítko a GPS stav bez přímého obsazení při neplatné poloze",()=>{
 assert.match(html,/id="stop-location-status"/);
 assert.match(html,/id="stop-request-location"/);
 assert.match(app,/stopLocationState\(s\)/);
 assert.match(app,/capture\.disabled=!s\|\|captureTimeBlocked\|\|!locationState\.ok/);
 assert.match(app,/const GPS_STALE_MS=15000/);
});

test("Nové AP nahrazují limit tří obsazení",()=>{
 assert.match(app,/RULES.dailyAP/);
 assert.doesNotMatch(app,/FIELD_TEST_UNLIMITED_CAPTURES/);
});
test("Potvrzení obsazení je součástí jedné akční oblasti",()=>{
 assert.match(html,/class="actions" id="actions"/);
 assert.match(html,/id="stop-confirm"/);
 assert.match(app,/classList\.toggle\("is-confirming"/);
});

test("Karta zobrazí odpočet zániku až v sestupné fázi",()=>{
 const record={owner:"p1",anchor:"2026-11-01"};
 const base={...args,record,gameDay:"2026-11-10",diffDays:()=>9,
   expiresAt:"2026-11-16T02:00:00Z",now:Date.parse("2026-11-10T12:00:00Z")};
 const html=ctx.card(base);
 assert.match(html,/Do zániku bez údržby/);
 assert.match(html,/data-expiry-countdown="2026-11-16T02:00:00Z"/);
 const full=ctx.card({...base,diffDays:()=>4});
 assert.doesNotMatch(full,/Do zániku bez údržby/);
});
test("Nové stránky mají přepínač žebříčku a splnění denní výzvy pouze na kartě",()=>{
 assert.match(html,/data-ranking-period="30"/);
 assert.match(html,/data-ranking-period="all"/);
 assert.match(html,/id="daily-history"/);
 assert.match(html,/id="daily-history-expand"/);
 assert.match(html,/id="daily-visit"/);
 assert.doesNotMatch(html,/id="visit"/);
 assert.match(app,/function renderDailyHistory/);
 assert.match(app,/function renderRanking/);
 assert.match(app,/\$\("daily-visit"\)\.onclick=\(\)=>doGpsAction\("visit"\)/);
 assert.match(app,/const isDailyStop=!!s&&s\.id===challenge\?\.id/);
});
test("Pražské uzávěrky respektují zimní i letní čas",()=>{
 const start=app.indexOf("function pragueBoundaryUtc(day){");
 const end=app.indexOf("function init(withSeed=true){",start);
 assert.ok(start>=0&&end>start);
 const context={};
 vm.runInNewContext(app.slice(start,end)+"\nthis.boundary=pragueBoundaryUtc",context);
 assert.equal(context.boundary("2026-01-15"),"2026-01-15T02:00:00.000Z");
 assert.equal(context.boundary("2026-07-15"),"2026-07-15T01:00:00.000Z");
 assert.equal(context.boundary("2026-03-29"),"2026-03-29T01:00:00.000Z");
 assert.equal(context.boundary("2026-10-25"),"2026-10-25T02:00:00.000Z");
});

test("Odpočet zániku používá dny, ochrana hodiny",()=>{
 const scope={};
 vm.runInNewContext(source+"\nthis.formatExpiry=stopExpiryCountdown",scope);
 const now=Date.parse("2026-11-10T12:00:00Z");
 assert.equal(scope.formatExpiry("2026-11-12T13:02:03Z",now),"2 dny 01:02:03");
 assert.equal(scope.formatExpiry("2026-11-10T13:00:00Z",now),"01:00:00");
});

test("Čtyři hlavní položky navigace mají ikony a přístupné názvy",()=>{
 for(const key of ["map","daily","ranking","profile"]){
  const button=html.match(new RegExp('<button[^>]*data-screen="'+key+'"[^>]*>[\\s\\S]*?<\\/button>'))?.[0];
  assert.ok(button,key);
  assert.match(button,/<svg/);
  assert.match(button,/aria-label=/);
 }
});
test("Pouze detail zastávky se zobrazuje jako karta, ostatní obrazovky jsou celostránkové",()=>{
 assert.match(app,/const isStop=name==="stop"/);
 assert.match(app,/classList\.toggle\("is-page",visible&&!isStop\)/);
 assert.match(app,/\$\("scrim"\)\.hidden=!isStop/);
 const css=require("node:fs").readFileSync("style.css","utf8");
 assert.match(css,/\.sheet\.is-page\{/);
 assert.match(css,/\.sheet\.is-page \.sheet-head\{display:none\}/);
});
test("Zobrazení denní zastávky pouze vycentruje mapu a nezobrazuje detail",()=>{
 const start=app.indexOf('$("show-challenge").onclick=');
 const end=app.indexOf("};",start);
 const content=app.slice(start,end);
 assert.match(content,/openScreen\("map"\)/);
 assert.match(content,/map\.flyTo/);
 assert.doesNotMatch(content,/openScreen\("stop"\)/);
});
test("Profil má vlastní zastávky, rozbalení událostí a účetní nastavení",()=>{
 for(const id of ["owned-list","owned-count","events-expand","profile-edit","screen-profile-settings","profile-form","profile-display-name","profile-discord","profile-image","profile-username","settings-back"]){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 assert.match(app,/function renderOwnedStops/);
 assert.match(app,/function renderProfileEvents/);
 assert.match(app,/function populateProfileSettings/);
 assert.match(app,/classList\.toggle\("is-page"/);
 assert.match(app,/playerLabel\(p\.id\)/);
 assert.match(app,/\$\("points"\)\.textContent=total\(p\.id,30\)/);
 assert.match(html,/Změna hesla bude dostupná po připojení skutečných účtů k serveru/);
 assert.doesNotMatch(app,/localStorage\.setItem\(["']password/);
});

test("Profil používá výchozí sbalené přístupné seznamy",()=>{
 assert.match(html,/<details class="profile-section compact-disclosure" id="owned-section">/);
 assert.match(html,/<details class="profile-section compact-disclosure" id="events-section">/);
 assert.doesNotMatch(html,/<details[^>]+id="owned-section"[^>]+open/);
 assert.doesNotMatch(html,/<details[^>]+id="events-section"[^>]+open/);
 for(const id of ["owned-title","player-events-title"])
  assert.match(html,new RegExp('<summary[^>]*>[\\s\\S]*?id="'+id+'"'));
});
test("Kompaktní zápisy historie neztrácejí datum, AP ani získané body",()=>{
 assert.match(app,/history-item-points/);
 assert.match(app,/history-item-meta/);
 assert.match(app,/e\.apCost\?"−"\+e\.apCost\+" AP"/);
 assert.match(app,/Number\.isFinite\(e\.points\)/);
 assert.match(app,/class="owned-row/);
 assert.match(app,/data-owned-stop/);
 const css=fs.readFileSync("style.css","utf8");
 assert.match(css,/\.compact-disclosure>summary/);
 assert.match(css,/\.compact-disclosure \.owned-row\{padding:8px 2px/);
 assert.match(css,/\.history-dialog \.history-item\{padding:9px 0/);
});
