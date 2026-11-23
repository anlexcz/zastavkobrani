"use strict";
const {Pool} = require("pg");
function createPool(config) {
  return new Pool({
    host: config.pgHost,
    port: config.pgPort,
    database: config.pgDatabase,
    user: config.pgUser,
    max: config.pgPoolMax,
    connectionTimeoutMillis: config.pgConnectTimeoutMs,
    idleTimeoutMillis: 10000,
    application_name: "zastavkobrani_staging_api"
  });
}
async function checkDatabase(pool) {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
  } finally {
    client.release();
  }
}
module.exports = {createPool, checkDatabase};
