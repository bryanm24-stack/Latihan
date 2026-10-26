/**
 * TITIK MASUK APLIKASI
 *
 * Tugas file ini HANYA tiga:
 *   1. memasang middleware global
 *   2. memasang router
 *   3. menyalakan server
 *
 * Tidak boleh ada logika bisnis di sini. Kalau file ini mulai panjang,
 * berarti ada yang salah tempat.
 */
require("dotenv").config();

const accessSecret = process.env.ACCESS_TOKEN_SECRET || "";
const refreshSecret = process.env.REFRESH_TOKEN_SECRET || "";
const validJwtSecrets =
  accessSecret.length >= 64 &&
  refreshSecret.length >= 64 &&
  accessSecret !== refreshSecret &&
  !/ganti|placeholder|example/i.test(accessSecret + refreshSecret);

if (!validJwtSecrets) {
  console.error(
    "[AUTH] Konfigurasi JWT tidak aman. Isi dua secret acak, berbeda, minimal 64 karakter di .env.\n" +
      "[AUTH] Generate masing-masing dengan:\n" +
      'node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
  process.exit(1);
}

const express = require("express");
const app = express();

const logger = require("./src/middlewares/logger");
const notFound = require("./src/middlewares/notFound");
const errorHandler = require("./src/middlewares/errorHandler");
const {
  contohRouter,
  bukuRouter,
  axiosRouter,
  authRouter,
  penggunaRouter,
} = require("./src/routes");
const { testConnection } = require("./src/databases/connection");

const port = process.env.PORT || 3001;

/* ------------------------------------------------------------------ */
/* 1. MIDDLEWARE GLOBAL                                                */
/*    Urutan itu penting. Middleware dijalankan dari atas ke bawah.    */
/* ------------------------------------------------------------------ */

// WAJIB. Tanpa dua baris ini req.body akan undefined.
app.use(express.json());                          // untuk Content-Type: application/json
app.use(express.urlencoded({ extended: true }));  // untuk form x-www-form-urlencoded

// MINGGU 7: membaca cookie dari request -- yang menulisnya res.cookie()
// saat login (refresh token). Tanpa ini req.cookies undefined.
app.use(require("cookie-parser")());

// Logger sederhana. Middleware formal kini kalian tulis sendiri
// (verifyJWT, checkRoles) -- tapi logger ini tetap global middleware
// yang paling awal: dia catat SEMUA request, termasuk yang nanti
// ditolak auth.
app.use(logger);

/* ------------------------------------------------------------------ */
/* 2. ROUTER                                                           */
/* ------------------------------------------------------------------ */
app.get("/", (req, res) =>
  res.json({
    service: "SOA Minggu 7",
    version: "1.0.0",
    endpoints: [
      "/api/v1/contoh",
      "/api/v1/buku",
      "/api/v1/contohAxios",
      "/api/v1/auth",
      "/api/v1/pengguna",
    ],
  })
);

app.use("/api/v1/contoh", contohRouter);
app.use("/api/v1/buku", bukuRouter);
app.use("/api/v1/contohAxios", axiosRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/pengguna", penggunaRouter);

/* ------------------------------------------------------------------ */
/* 3. PENANGKAP DI PALING BAWAH                                        */
/*    Keduanya HARUS setelah semua router, bukan sebelumnya.           */
/* ------------------------------------------------------------------ */
app.use(notFound);       // tidak ada route yang cocok  -> 404
app.use(errorHandler);   // ada error yang tidak tertangkap -> 500

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
  // Dites SETELAH server menyala, bukan sebelum: kalau MySQL belum siap,
  // /api/v1/contoh (tidak butuh database) tetap bisa dipakai untuk latihan.
  testConnection();
});
