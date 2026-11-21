"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

test("Herní čas v modulu respektuje obě pražská časová pásma",async()=>{
 const {gameDay,pragueBoundaryUtc,nextGameBoundary}=await import("../js/game-time.js");
 assert.equal(pragueBoundaryUtc("2026-01-15"),"2026-01-15T02:00:00.000Z");
 assert.equal(pragueBoundaryUtc("2026-07-15"),"2026-07-15T01:00:00.000Z");
 assert.equal(gameDay(new Date("2026-11-21T01:30:00Z")),"2026-11-20");
 assert.equal(nextGameBoundary(new Date("2026-11-21T01:30:00Z")),"2026-11-21T02:00:00.000Z");
});

test("Úložiště zachová testovací schéma a původní klíč",async()=>{
 const {STORAGE_KEY,loadStoredGame,saveStoredGame}=await import("../js/storage.js");
 assert.equal(STORAGE_KEY,"zastavkobrani-route22-ap-v3");
 const data=new Map(),store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const state={version:3,stops:{},ledger:[],events:[],selected:"p1"};
 saveStoredGame(state,store);
 assert.deepEqual(loadStoredGame(()=>{throw Error("Nemá resetovat")},store),state);
 data.set(STORAGE_KEY,"{");
 assert.equal(loadStoredGame(()=>state,store),state);
});

test("GPS vzdálenost i chybějící poloha jsou oddělené od DOM",async()=>{
 const {haversineM,stopLocationState}=await import("../js/gps.js");
 assert.equal(haversineM(50,14,50,14),0);
 const stop={points:[{lat:50,lon:14,isMetro:false,insidePrague:true}]};
 assert.deepEqual(stopLocationState(stop),{ok:false,status:"Poloha nedostupná",distance:null});
 const here=stopLocationState(stop,{position:{lat:50,lng:14,accuracy:5,timestamp:1000},watch:1},1001);
 assert.equal(here.ok,true);assert.equal(here.distance,0);
 assert.equal(stopLocationState(stop,{position:{lat:50,lng:14,accuracy:80,timestamp:1000}},1001).ok,false);
});

test("Lokální herní model nevlastní DOM a zachová datový formát",async()=>{
 const {createGameModel}=await import("../js/game.js");
 let state,writes=0;
 const stop={id:"sample",name:"Test",cats:["tram"],points:[]};
 const model=createGameModel({
  STOPS:[stop],PLAYERS:[{id:"p1",name:"Hráč"}],ROUTE_22_SEED:[],
  RULES:{dailyAP:10},ACTIVE_SCORE_BONUSES:[],
  captureBreakdown:()=>({total:24}),holdingBreakdown:()=>({total:6}),
  getState:()=>state,persist:()=>{writes++}
 });
 state=model.init(false);
 assert.equal(state.version,3);
 assert.equal(state.selected,"p1");
 assert.equal(model.remaining(),10);
 assert.equal(model.captureScore(stop),24);
 assert.equal(model.holdingScore(stop),6);
 model.award("p1",24,"capture");
 assert.equal(model.total("p1"),24);
 assert.equal(writes,0);
});

test("Moduly všech obrazovek a řadičů lze samostatně importovat",async()=>{
 const modules={
  "../js/screens/stop.js":"createStopScreen",
  "../js/screens/daily.js":"createDailyScreen",
  "../js/screens/ranking.js":"createRankingScreen",
  "../js/screens/profile.js":"createProfileScreen",
  "../js/game-actions.js":"createGameActions",
  "../js/gps-controller.js":"createGpsController",
  "../js/ui.js":"createMapLayerControls"
 };
 for(const [path,name] of Object.entries(modules)){
  const module=await import(path);
  assert.equal(typeof module[name],"function",path+"."+name);
 }
});
