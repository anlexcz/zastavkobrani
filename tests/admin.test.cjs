"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const demo=[
 {id:"a",name:"A",cats:["tram"],points:[{id:"a/1",insidePrague:true,isMetro:false}]},
 {id:"b",name:"B",cats:["metro"],points:[{id:"b/1",insidePrague:true,isMetro:true}]},
 {id:"c",name:"C",cats:["bus"],points:[{id:"c/1",insidePrague:true,isMetro:false}]}
];
const base={version:1,dates:{"2027-11-17":{stopId:"c",note:"Výročí"}}};
let core;
test.before(async()=>{core=await import("../admin/core.js")});
test("Moduly administrace mají stabilní unikátní ID a záměrně různé schopnosti",()=>{
 const {ADMIN_SECTIONS}=core;
 assert.equal(new Set(ADMIN_SECTIONS.map(x=>x.id)).size,ADMIN_SECTIONS.length);
 for(const id of ["overview","daily","territories","imports","players","ownership","economy","achievements","audit","system"]){
  assert.ok(ADMIN_SECTIONS.some(x=>x.id===id),id);
 }
});
test("Editace je možná výhradně pro budoucí herní den",()=>{
 const {applyDraftChange}=core;
 const result=applyDraftChange(base,"2027-11-18","a","Nová výjimka","2027-11-17",demo);
 assert.equal(result.dates["2027-11-18"].stopId,"a");
 assert.deepEqual(base.dates,{"2027-11-17":{stopId:"c",note:"Výročí"}});
 for(const day of ["2027-11-17","2027-11-16"])
  assert.throws(()=>applyDraftChange(base,day,"a","", "2027-11-17",demo),/následující/);
 assert.throws(()=>applyDraftChange(base,"2027-11-18","b","", "2027-11-17",demo),/způsobilá/);
});
test("Odstranění výjimky obnoví uložený původní los",()=>{
 const {applyDraftChange,effectiveDaily}=core;
 const cal={days:{"2027-11-17":"a"}};
 const old=effectiveDaily("2027-11-17",cal,base,demo);
 assert.equal(old.stop.id,"c");assert.equal(old.generated.id,"a");assert.equal(old.source,"manual");
 const result=applyDraftChange(base,"2027-11-17",null,"","2027-11-16",demo);
 const next=effectiveDaily("2027-11-17",cal,result,demo);
 assert.equal(next.stop.id,"a");assert.equal(next.source,"random");
});
test("Export validuje schéma, datum, identitu a příliš dlouhé poznámky",()=>{
 const {exportOverrides,cloneOverrides}=core;
 const json=exportOverrides(base,demo);
 assert.equal(JSON.parse(json).dates["2027-11-17"].stopId,"c");
 assert.throws(()=>cloneOverrides({version:1,dates:{"2027-02-30":{stopId:"a"}}},demo),/datum/);
 assert.throws(()=>cloneOverrides({version:1,dates:{"2027-11-18":{stopId:"b"}}},demo),/způsobilá/);
 assert.throws(()=>cloneOverrides({version:1,dates:{"2027-11-18":{stopId:"a",note:"x".repeat(301)}}},demo),/poznámka/i);
});
test("Import konceptu nesmí zpětně měnit existující zveřejněné výjimky",()=>{
 const {enforcePublishedDates}=core;
 const changed={version:1,dates:{"2027-11-17":{stopId:"a"}}};
 assert.throws(()=>enforcePublishedDates(base,changed,"2027-11-17"),/historickou/);
 assert.doesNotThrow(()=>enforcePublishedDates(base,changed,"2027-11-16"));
});
test("Vyhledávání vrací filtrované zastávky bez závislosti na DOM",()=>{
 const {filterStops}=core;
 assert.deepEqual(filterStops(demo,"c",{eligibleOnly:true}).map(x=>x.id),["c"]);
 assert.deepEqual(filterStops(demo,"",{eligibleOnly:true}).map(x=>x.id),["a","c"]);
});
test("Admin stránka je nezávislá na běžném mobilním navigátoru hry",()=>{
 const html=fs.readFileSync(path.join(ROOT,"admin/index.html"),"utf8");
 const js=fs.readFileSync(path.join(ROOT,"admin/admin.js"),"utf8");
 assert.match(html,/id="admin-menu"/);
 assert.match(html,/id="admin-view"/);
 assert.match(html,/veřejný náhled|Veřejný náhled/);
 assert.match(js,/Stáhnout JSON výjimek/);
 assert.doesNotMatch(js,/fetch\([^)]*method\s*:\s*["']POST/);
});
