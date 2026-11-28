"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {once} = require("node:events");
const {createApp} = require("../src/app.cjs");
const {loadConfig} = require("../src/config.cjs");
async function serve(fn, checkDb = async () => true) {
  const server = createApp({pool:{},checkDb});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
}
test("GET liveness is independent of DB", async () => {
  await serve(async base => {
    const response = await fetch(base + "/api/health/live");
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{status:"ok"});
    assert.equal(response.headers.get("cache-control"),"no-store");
  }, async () => { throw Error("DB unavailable"); });
});
test("readiness checks DB and hides errors", async () => {
  await serve(async base => {
    const response = await fetch(base + "/api/health/ready");
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{status:"unavailable",database:"unavailable"});
  },async()=>{throw Error("secret database error");});
  await serve(async base => {
    const response = await fetch(base + "/api/health/ready");
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{status:"ok",database:"available"});
  });
});
test("foundation rejects non-health routes and state-changing methods",async()=>{
  await serve(async base=>{
    assert.equal((await fetch(base+"/api/unknown")).status,404);
    assert.equal((await fetch(base+"/api/health/live",{method:"POST"})).status,405);
  });
});
test("default network binding and DB transport are local only",()=>{
  const config=loadConfig();
  assert.equal(config.host,"127.0.0.1");
  assert.equal(config.pgHost,"/var/run/postgresql");
  const previous=process.env.HOST;
  process.env.HOST="0.0.0.0";
  try { assert.throws(()=>loadConfig(),/loopback/); }
  finally { if(previous===undefined) delete process.env.HOST; else process.env.HOST=previous; }
});
