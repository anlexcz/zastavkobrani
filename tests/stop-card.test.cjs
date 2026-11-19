const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const src=fs.readFileSync("stop-card.js","utf8");
const context={};
vm.runInNewContext(src+"\nthis.card=stopCardHtml;",context);
const stop={
 id:"pidg_demo",name:"Kobylisy",cats:["metro","tram","urban_bus"],
 points:[{id:"675/1",platform:"A",isMetro:false},{id:"675/101",platform:"M1",isMetro:true}]
};
const base={
 stop,selectedPlayer:"p1",selectedPlatform:null,gameDay:"2026-11-19",
 diffDays:()=>0,captureScore:()=>23,holdingScore:()=>3,remaining:2,now:100000
};
test("Neutrální zastávka má bodování, kategorie a rozbalovací PID stanoviště",()=>{
 const html=context.card({...base,record:undefined,owner:undefined});
 assert.match(html,/Neutrální/);
 assert.match(html,/23/);
 assert.match(html,/3/);
 assert.match(html,/Metro/);
 assert.match(html,/Tramvaj/);
 assert.match(html,/Nástupiště a ověřovací body/);
 assert.match(html,/data-platform="675\/101"/);
 assert.match(html,/není serverově ověřována/);
});
test("Karta zobrazí vlastníka a skutečnou ochranu 24 h",()=>{
 const html=context.card({...base,owner:{name:"Rys",color:"#EF4444"},
  record:{owner:"p1",anchor:"2026-11-19",protectedUntil:"2026-11-20T23:00:00Z"},
  now:Date.parse("2026-11-19T12:00:00Z")});
 assert.match(html,/Tvoje zastávka/);
 assert.match(html,/--card-owner:#EF4444/);
 assert.match(html,/Ochrana do/);
 assert.match(html,/Plný denní výnos/);
});
test("Starší vlastnictví zobrazí nulový výnos a údržbu až po sedmi dnech",()=>{
 const html=context.card({...base,owner:{name:"Sova",color:"#3B82F6"},
  record:{owner:"p1",anchor:"2026-11-10",protectedUntil:null},
  diffDays:()=>9});
 assert.match(html,/Bez denního výnosu/);
 assert.match(html,/Lze provést údržbu/);
});
test("Výběr nástupiště jej označí a otevře seznam",()=>{
 const html=context.card({...base,selectedPlatform:"675/101"});
 assert.match(html,/<details class="stop-platforms" open>/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/vybráno M1/);
});
test("Neověřené texty PID nesmí vkládat HTML/JS",()=>{
 const html=context.card({...base,stop:{...stop,cats:['<img src=x onerror=alert(1)>'],
 points:[{id:'a\" onclick=\"alert(1)',platform:'<script>x</script>',isMetro:false}]}});
 assert.ok(!html.includes("<script>"));
 assert.ok(!html.includes("<img"));
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&quot;/);
});
