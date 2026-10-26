// KENNETH: migrasi tambahan untuk database W7 yang sudah berisi data.
// Tidak menjalankan seed atau TRUNCATE. UUID lama di-hash, raw key tetap berlaku.
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const conn = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "soa_minggu7",
    multipleStatements: true });
  try {
    await conn.query(fs.readFileSync(path.join(__dirname, "../sql/api_key_upgrade.sql"), "utf8"));
    const [indexes] = await conn.query("SHOW INDEX FROM pengguna WHERE Key_name = 'uq_pengguna_api_key'");
    if (!indexes.length) await conn.query("ALTER TABLE pengguna ADD UNIQUE KEY uq_pengguna_api_key (api_key)");
    await conn.query(`UPDATE pengguna SET api_key = SHA2(api_key, 256)
      WHERE api_key REGEXP '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'`);
    await conn.query(fs.readFileSync(path.join(__dirname, "../sql/subscription_upgrade.sql"), "utf8"));
    // Mempertahankan Premium manual lama sekali saja. Bukan transaksi pembayaran palsu.
    await conn.query(`INSERT INTO subscriptions
      (pengguna_id, plan, status, starts_at, ends_at, source)
      SELECT p.id, 'premium', 'active', UTC_TIMESTAMP(3),
        DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 DAY), 'legacy_migration'
      FROM pengguna p WHERE p.api_level='premium'
        AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.pengguna_id=p.id)`);
    console.log("Upgrade selesai. Data W7 dipertahankan. Billing siap; Premium manual lama mendapat masa transisi 30 hari sekali.");
  } finally { await conn.end(); }
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; });
