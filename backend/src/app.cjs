"use strict";
const http = require("node:http");
const {checkDatabase} = require("./db.cjs");
const MAX_PATH_LENGTH = 2048;
function json(response, code, payload) {
  response.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}
function createApp({pool, checkDb = checkDatabase}) {
  return http.createServer(async (request, response) => {
    // No request body is read or logged in this foundation.
    const path = (request.url || "").split("?")[0];
    if (path.length > MAX_PATH_LENGTH) return json(response, 414, {error:"uri_too_long"});
    if (request.method !== "GET" && request.method !== "HEAD") return json(response, 405, {error:"method_not_allowed"});
    if (path === "/api/health/live") return json(response, 200, {status:"ok"});
    if (path === "/api/health/ready") {
      try {
        if (await checkDb(pool)) return json(response, 200, {status:"ok",database:"available"});
      } catch {
        // Do not expose database errors, credentials, names or stack traces.
      }
      return json(response, 503, {status:"unavailable",database:"unavailable"});
    }
    return json(response, 404, {error:"not_found"});
  });
}
module.exports = {createApp};
