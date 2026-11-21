"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const css=fs.readFileSync("style.css","utf8");
const app=fs.readFileSync("app.js","utf8");
const scoring=fs.readFileSync("scoring.js","utf8");

test("Základní mobile-first rozvržení sdílí tokeny",()=>{
  for(const token of ["--header-h","--nav-h","--accent","--color-success","--action-height"])
    assert.ok(css.includes(token+":"),token);
  assert.match(css,/\.nav\s*\{[^}]*bottom:0/);
  assert.match(css,/@media\(min-width:760px\)/);
});

test("Kritické komponenty nemají duplicitní základní selektory",()=>{
  for(const selector of [
    ".stop-card {",".stop-modes {",".stop-history{",
    ".profile-settings{",".daily-history-item{","#screen-stop .actions {"
  ]){
    assert.equal(css.split(selector).length-1,1,selector);
  }
});

test("Ochrana je konfigurovaná a oba typy akce ji používají",()=>{
  assert.match(scoring,/protectionHours:24/);
  assert.equal((app.match(/RULES\.protectionHours\*60\*60\*1000/g)||[]).length,2);
  assert.doesNotMatch(app,/now\.getTime\(\)\+86400000/);
});

test("Opakované hledání zastávek používá index podle ID",()=>{
  assert.match(app,/const STOP_BY_ID = new Map/);
  assert.match(app,/STOP_BY_ID\.get\(selectedStop\)/);
});
