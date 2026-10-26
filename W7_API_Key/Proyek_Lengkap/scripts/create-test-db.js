// Database pengujian TERPISAH. Hanya nama *_test boleh dipakai.
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const name = process.env.TEST_DB_NAME || "soa_bookdata_w8_test";
  if (!/^[a-zA-Z0-9_]+_test$/.test(name)) throw new Error("TEST_DB_NAME harus berakhiran _test");
  const conn = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "", multipleStatements: true });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${name}\``);
    for (const file of ["schema.sql", "seed.sql"]) await conn.query(fs.readFileSync(path.join(__dirname, "../sql", file), "utf8"));
    console.log(`Database uji ${name} siap.`);
  } finally { await conn.end(); }
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; });
