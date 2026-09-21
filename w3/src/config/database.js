/**
 * KONEKSI DATABASE — MINGGU 3
 * ===========================
 *
 * Minggu 2 datanya sebuah array di memori. Sekarang datanya di MySQL,
 * dan koneksinya dibuat SEKALI di sini, lalu dipakai ulang oleh seluruh
 * aplikasi lewat `pool`.
 *
 * Kenapa POOL, bukan satu koneksi biasa?
 *
 * Satu koneksi = satu "telepon" ke MySQL. Kalau dua request datang
 * bersamaan dan cuma ada satu koneksi, request kedua harus ANTRE
 * sampai request pertama selesai memakainya — padahal MySQL sanggup
 * melayani banyak koneksi sekaligus.
 *
 * Pool menyiapkan BEBERAPA koneksi di muka (default di bawah: 10),
 * lalu meminjamkannya ke siapa pun yang butuh, dan menerima kembali
 * begitu selesai. `mysql2/promise` mengurus pinjam-kembalikan ini
 * otomatis — kita cukup `pool.query(...)`, tidak perlu `getConnection()`
 * dan `release()` manual untuk kasus sesederhana ini.
 *
 * Kenapa `mysql2/promise`, bukan `mysql2` biasa?
 * Supaya bisa `await pool.query(...)` alih-alih memakai callback.
 * Seluruh controller Minggu 3 ditulis dengan async/await; tanpa varian
 * `/promise` ini, setiap query harus dibungkus Promise manual.
 */
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "soa_minggu3",

  waitForConnections: true, // request BARU menunggu antrean, bukan langsung error
  connectionLimit: 10,      // maksimal 10 koneksi aktif bersamaan
  queueLimit: 0,             // 0 = antrean tanpa batas panjang (dibatasi memori saja)

  // Angka dari MySQL (DECIMAL, BIGINT) datang sebagai string secara default,
  // supaya presisi tidak hilang. Kolom kita (INT) aman dikonversi ke Number.
  decimalNumbers: true,
});

/**
 * Dipanggil sekali saat server menyala (lihat index.js).
 * Tujuannya cuma satu: kalau .env salah atau MySQL belum jalan,
 * kita tahu SEKARANG lewat pesan yang jelas — bukan nanti, lewat error
 * membingungkan di tengah request pertama seorang mahasiswa.
 */
const testConnection = async () => {
  try {
    const koneksi = await pool.getConnection();
    await koneksi.ping();
    koneksi.release();
    console.log(`[DB] Terhubung ke MySQL "${process.env.DB_NAME || "soa_minggu3"}"`);
  } catch (err) {
    console.error("[DB] GAGAL terhubung ke MySQL:", err.message);
    console.error(
      "[DB] Periksa: MySQL sudah menyala? .env sudah benar? Sudah menjalankan `npm run db:migrate`?"
    );
    // Sengaja TIDAK proses.exit(). Endpoint /api/v1/contoh tidak butuh
    // database sama sekali dan tetap boleh berjalan untuk latihan itu.
    // Endpoint /api/v1/buku akan gagal satu per satu dengan error yang
    // jelas kalau memang koneksinya belum ada.
  }
};

module.exports = { pool, testConnection };
