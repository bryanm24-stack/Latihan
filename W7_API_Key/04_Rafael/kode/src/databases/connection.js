/**
 * KONEKSI DATABASE (SEQUELIZE) — MINGGU 4
 * =======================================
 *
 * Bandingkan dengan src/config/database.js versi Minggu 3.
 *
 * Minggu 3 kita membuat pool `mysql2` mentah. Minggu ini pool itu
 * dibungkus di dalam SEQUELIZE — satu objek `sequelize` yang:
 *   1. Mengelola connection pool-nya sendiri (option `pool` di bawah).
 *      Jadi pool dari Minggu 3 TIDAK hilang — kini urusan pool bukan
 *      kalian yang tulis, tapi ORM.
 *   2. Menjadi "pabrik" untuk semua model — setiap file di src/models/
 *      menerima instance ini lewat src/models/index.js.
 *
 * `dialect: "mysql"` berarti Sequelize menerjemahkan pemanggilan model
 * menjadi SQL MySQL. Ganti dialect-nya (postgres, sqlite, ...) dan
 * SELURUH controller tetap bekerja tanpa diubah — inilah portabilitas
 * yang tidak dimiliki raw query Minggu 3.
 */
const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "soa_minggu7",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    timezone: "+00:00",

    // Pool — versi ORM dari konfigurasi pool Minggu 3.
    pool: {
      max: 10,     // maksimal 10 koneksi aktif bersamaan
      min: 0,      // boleh 0 koneksi saat sepi
      idle: 10000, // koneksi diam 10 detik dilepas
    },

    /**
     * LOGGING SQL — alat belajar paling penting minggu ini.
     *
     * Sequelize menulis SQL untuk kalian, dan ini satu-satunya cara
     * melihat SQL apa yang sebenarnya dikirim. Selama minggu ini, biarkan
     * `console.log` — setiap panggilan endpoint akan menampilkan query-nya
     * di terminal. Perhatikan khususnya: include menghasilkan SATU query
     * dengan JOIN, bukan satu query per baris (N+1).
     *
     * Setelah selesai belajar, ganti menjadi `logging: false`.
     */
    logging: process.env.SQL_LOG === "true" ? (sql) => console.log("[SQL]", sql) : false,
    // logging: false,

    define: {
      // Secara default Sequelize membentuk nama tabel dari nama model
      // (Buku -> "Bukus"). Kita TIDAK mau itu: nama tabel ditentukan
      // eksplisit per model lewat `tableName`, dan tidak diubah-ubah.
      freezeTableName: true,
    },
  }
);

/**
 * Dipanggil sekali saat server menyala (lihat index.js) — sama seperti
 * Minggu 3: kalau kredensial salah atau MySQL belum jalan, ketahuan
 * SEKARANG lewat pesan yang jelas.
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      `[DB] Terhubung ke MySQL "${process.env.DB_NAME || "soa_minggu7"}" (via Sequelize)`
    );
  } catch (err) {
    console.error("[DB] GAGAL terhubung ke MySQL:", err.message);
    console.error(
      "[DB] Periksa: MySQL sudah menyala? .env sudah benar? Sudah menjalankan `npm run db:migrate`?"
    );
    // Sengaja TIDAK process.exit() — alasan sama seperti Minggu 3.
  }
};

module.exports = { sequelize, testConnection };
