"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {generate,gameDay,isEligible}=require("../scripts/generate-daily-stops.cjs");

const stops=[
  {id:"a",name:"A",cats:["tram"],points:[{insidePrague:true,isMetro:false}]},
  {id:"b",name:"B",cats:["bus"],points:[{insidePrague:true,isMetro:false}]},
  {id:"metro-only",name:"Metro",cats:["metro"],points:[{insidePrague:true,isMetro:true}]}
];
const initial={version:1,days:{},publishedOverrides:{}};
const override={version:1,dates:{"2026-11-25":{stopId:"b",note:"Předem připravená výjimka"}}};

test("Generator vyplní archiv i 14 dní předem a zachová uložené losy",()=>{
  const first=generate({today:"2026-11-21",stops,schedule:initial,admin:override,pickIndex:()=>0});
  const data=JSON.parse(first.json);
  assert.equal(Object.keys(data.days).length,45);
  assert.equal(data.days["2026-11-21"],"a");
  assert.equal(data.days["2026-12-05"],"a");
  assert.equal(data.publishedOverrides["2026-11-25"].stopId,"b");
  const again=generate({today:"2026-11-22",stops,schedule:data,admin:override,pickIndex:()=>1});
  const updated=JSON.parse(again.json);
  assert.equal(updated.days["2026-11-25"],"a");
  assert.equal(updated.days["2026-12-06"],"b");
  assert.equal(Object.keys(updated.days).length,46);
});

test("Vylosované dny nejsou přepsané novou náhodou",()=>{
  const prior={version:1,days:{"2026-11-22":"b"},publishedOverrides:{}};
  const result=JSON.parse(generate({
    today:"2026-11-21",stops,schedule:prior,
    admin:{version:1,dates:{}},pickIndex:()=>0
  }).json);
  assert.equal(result.days["2026-11-22"],"b");
});

test("Ruční výjimky lze měnit dopředu, nikoli do minulosti nebo dnes",()=>{
  const published={version:1,days:{"2026-11-21":"a"},publishedOverrides:{"2026-11-20":{stopId:"b"}}};
  assert.throws(()=>generate({today:"2026-11-21",stops,schedule:published,
    admin:{version:1,dates:{}},pickIndex:()=>0}),/zpětně měnit/);
  assert.throws(()=>generate({today:"2026-11-21",stops,schedule:published,
    admin:{version:1,dates:{"2026-11-20":{stopId:"b"},"2026-11-21":{stopId:"a"}}},
    pickIndex:()=>0}),/nově přidat/);
  assert.doesNotThrow(()=>generate({today:"2026-11-21",stops,schedule:published,
    admin:{version:1,dates:{"2026-11-20":{stopId:"b"},"2026-11-24":{stopId:"a"}}},
    pickIndex:()=>0}));
});

test("Neplatné datum nebo GPS nezpůsobilá zastávka se odmítnou",()=>{
  assert.equal(isEligible(stops[2]),false);
  for(const invalid of [
    {"2026-02-30":{stopId:"a"}},
    {"2026-12-01":{stopId:"metro-only"}},
    {"2026-12-02":{stopId:"missing"}}
  ])assert.throws(()=>generate({today:"2026-11-21",stops,schedule:initial,admin:{version:1,dates:invalid},pickIndex:()=>0}));
});

test("Herní den generátoru přepne ve 03:00 v Praze",()=>{
  assert.equal(gameDay(new Date("2026-11-21T01:59:59Z")),"2026-11-20");
  assert.equal(gameDay(new Date("2026-11-21T02:00:00Z")),"2026-11-21");
  assert.equal(gameDay(new Date("2026-07-21T00:59:59Z")),"2026-07-20");
  assert.equal(gameDay(new Date("2026-07-21T01:00:00Z")),"2026-07-21");
});

test("Oficiální výjimka na 17. listopad odpovídá existující Národní třídě",()=>{
  const source=fs.readFileSync("pid-prague.js","utf8");
  const catalog=vm.runInNewContext(source+"\nPID_PRAGUE;",{}, {timeout:10000});
  const overrides=JSON.parse(fs.readFileSync("data/daily-stops.overrides.json","utf8"));
  const item=overrides.dates["2027-11-17"];
  const stop=catalog.find(s=>s.id===item.stopId);
  assert.equal(stop?.name,"Národní třída");
  assert.equal(isEligible(stop),true);
});

test("Webový resolver preferuje přepsání před připraveným losem",async()=>{
  const {resolveDailyStop,fallbackDailyStop}=await import("../js/daily-stops.js");
  const calendar={days:{"2026-11-25":"a"},overrides:{"2026-11-25":"b"}};
  assert.equal(resolveDailyStop("2026-11-25",stops,calendar).id,"b");
  assert.equal(resolveDailyStop("2026-11-26",stops,calendar).id,
               fallbackDailyStop("2026-11-26",stops).id);
  assert.equal(resolveDailyStop("2026-11-25",stops,{days:{},overrides:{"2026-11-25":"bad"}}),null);
});
