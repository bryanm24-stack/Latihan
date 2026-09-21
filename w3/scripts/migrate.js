/**
 * SCRIPT MIGRASI — `npm run db:migrate`
 * ======================================
 *
 * Tugasnya tiga, berurutan:
 *   1. Membuat database kalau belum ada (CREATE DATABASE IF NOT EXISTS)
 *   2. Menjalankan sql/schema.sql        -> membuat tabel
 *   3. Menjalankan sql/seed.sql          -> mengisi data awal
 *
 * Kenapa lewat script Node, bukan `mysql < schema.sql` di terminal?
 * Supaya kalian TIDAK WAJIB sudah punya MySQL CLI ter-install dan
 * ter-setting PATH-nya. Cukup `npm install` lalu `npm run db:migrate`,
 * sama seperti perintah lain di project ini.
 *
 * Kalau kalian tetap ingin membaca/mengedit SQL-nya langsung dengan
 * MySQL Workbench atau CLI, file sql/schema.sql dan sql/seed.sql tetap
 * berupa file .sql biasa yang bisa dibuka dan dijalankan manual juga.
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const DB_NAME = process.env.DB_NAME || "soa_minggu3";

const bacaSql = (nama) =>
  fs.readFileSync(path.join(__dirname, "..", "sql", nama), "utf8");

const main = async () => {
  // Koneksi TANPA `database` dulu — kalau database-nya belum ada,
  // menyebutkan nama database yang tidak ada di koneksi awal akan
  // langsung gagal sebelum sempat membuatnya.
  const koneksi = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true, // WAJIB: schema.sql & seed.sql berisi banyak statement
  });

  try {
    console.log(`[migrate] Memastikan database "${DB_NAME}" ada...`);
    await koneksi.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await koneksi.query(`USE \`${DB_NAME}\``);

    console.log("[migrate] Menjalankan sql/schema.sql...");
    await koneksi.query(bacaSql("schema.sql"));

    console.log("[migrate] Menjalankan sql/seed.sql...");
    await koneksi.query(bacaSql("seed.sql"));

    console.log("[migrate] Selesai. Database siap dipakai.");
  } finally {
    await koneksi.end();
  }
};

main().catch((err) => {
  console.error("[migrate] GAGAL:", err.message);
  console.error(
    "[migrate] Periksa: MySQL sudah menyala? Kredensial di .env sudah benar?"
  );
  process.exit(1);
});
