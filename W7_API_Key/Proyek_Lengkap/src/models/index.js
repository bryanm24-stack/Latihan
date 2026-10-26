/**
 * DAFTAR MODEL — MINGGU 7
 * =======================
 *
 * Satu tempat yang membangun semua model terhadap koneksi yang sama,
 * lalu MENYALAKAN semua relasi.
 *
 * Kenapa dua langkah (bangun dulu, relasi belakangan)?
 *
 * `static associate(models)` di dalam model merujuk ke model LAIN lewat
 * nama — Buku.hasMany(models.Karakter, ...). Kalau relasi dinyatakan
 * langsung saat model masih dibangun satu per satu, ada kemungkinan
 * model yang dirujuk belum ada -> "Cannot read property 'Karakter' of
 * undefined" — error yang membingungkan padahal penyebabnya cuma urutan.
 *
 * Maka: bangun SEMUA model dulu, baru jalankan SEMUA associate().
 * Pola ini disalin dari struktur model standar Sequelize (yang juga
 * dipakai minggu referensi), jadi kalian akan menemukannya lagi nanti.
 *
 * Kalau kalian menambah model baru (misalnya Penulis), langkahnya:
 *   1. buat src/models/Penulis.js
 *   2. require + daftarkan di objek `db` di bawah
 *   3. selesai — associate() model lain bisa langsung merujuknya.
 */
const db = {};

const { sequelize } = require("../databases/connection");

const Buku = require("./Buku");
const Karakter = require("./Karakter");
const Pengguna = require("./Pengguna");
const ApiLog = require("./ApiLog");

db.Buku = Buku(sequelize, sequelize.Sequelize);
db.Karakter = Karakter(sequelize, sequelize.Sequelize);
db.Pengguna = Pengguna(sequelize, sequelize.Sequelize);
db.ApiLog = ApiLog(sequelize, sequelize.Sequelize);

// Relasi dinyatakan SETELAH semua model ada. Urutan di objek `db`
// tidak penting; yang penting semua sudah terdaftar di baris atas.
for (const key of Object.keys(db)) {
  if (typeof db[key].associate === "function") {
    db[key].associate(db);
  }
}

db.sequelize = sequelize;
module.exports = db;
