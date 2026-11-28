"use strict";
function intEnv(name, fallback, min, max) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  if (!/^[0-9]+$/.test(value)) throw new Error(`Invalid ${name}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`Invalid ${name}`);
  return parsed;
}
function loadConfig() {
  const host = process.env.HOST || "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1") throw new Error("HOST must be loopback");
  const pgHost = process.env.PGHOST || "/var/run/postgresql";
  if (!pgHost.startsWith("/") || pgHost.includes("\n")) throw new Error("PGHOST must be an absolute Unix socket directory");
  return Object.freeze({
    host,
    port: intEnv("PORT", 3087, 1, 65535),
    pgHost,
    pgPort: intEnv("PGPORT", 5432, 1, 65535),
    pgDatabase: process.env.PGDATABASE || "zastavkobrani_staging",
    pgUser: process.env.PGUSER || "zastavkobrani_app",
    pgPoolMax: intEnv("PGPOOL_MAX", 3, 1, 20),
    pgConnectTimeoutMs: intEnv("PGCONNECT_TIMEOUT_MS", 2000, 100, 30000)
  });
}
module.exports = {loadConfig};
