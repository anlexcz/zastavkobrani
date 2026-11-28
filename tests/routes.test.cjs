"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const r=require("../web/routes.js");
test("Canonical routes have static entrypoints and base paths",()=>{for(const path of new Set(Object.values(r.paths))){const page=fs.readFileSync(path?path+"/index.html":"index.html","utf8");assert.ok(page.includes('web/routes.js'));assert.ok(page.includes('<base href="'+(path?"../".repeat(path.split("/").length):"./")+'">'));}});
test("Route resolution and legacy aliases",()=>{assert.equal(r.resolve("prihlaseni/"),"login");assert.equal(r.resolve("jak-hrat/pravidla/index.html"),"pravidla");assert.equal(r.resolve("","#changelog"),"vyvoj");assert.equal(r.resolve("","#register"),"register");assert.equal(r.resolve("unknown"),null);assert.equal(r.url("changelog"),"vyvoj/");assert.throws(()=>r.url("unknown"));});
