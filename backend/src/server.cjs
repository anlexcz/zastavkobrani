"use strict";
const {loadConfig} = require("./config.cjs");
const {createPool} = require("./db.cjs");
const {createApp} = require("./app.cjs");
async function main() {
  const config = loadConfig();
  const pool = createPool(config);
  const server = createApp({pool});
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.listen(config.port, config.host, () => {
    console.log(JSON.stringify({event:"listening",host:config.host,port:config.port}));
  });
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      try { await pool.end(); process.exitCode = 0; }
      catch { process.exitCode = 1; }
    });
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
main().catch(error => {
  console.error("Backend startup failed:", error.message);
  process.exitCode = 1;
});
