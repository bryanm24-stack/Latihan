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
  apiKeyRouter,
  partnerRouter,
  plansRouter,
  subscriptionRouter,
  paymentRouter,
} = require("./src/routes");




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
    service: "BookData API W7 + API Key",
    version: "2.0.0",
    endpoints: [
      "/api/v1/contoh",
      "/api/v1/buku",
      "/api/v1/contohAxios",
      "/api/v1/auth",
      "/api/v1/pengguna",
      "/api/v1/api-key",
      "/api/v1/partner",
      "/api/v1/plans",
      "/api/v1/subscriptions",
      "/api/v1/payments",
    ],
  })
);

app.use("/api/v1/contoh", contohRouter);
// Data sumber hanya dikelola admin. Pelanggan memakai layanan partner sesuai paket.
app.use("/api/v1/buku", require("./src/middlewares/verifyJWT"),
  require("./src/middlewares/checkRoles")("admin"), bukuRouter);
app.use("/api/v1/contohAxios", axiosRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/pengguna", penggunaRouter);
app.use("/api/v1/api-key", apiKeyRouter);
app.use("/api/v1/partner", partnerRouter);
app.use("/api/v1/plans", plansRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/payments", paymentRouter);

/* ------------------------------------------------------------------ */
/* 3. PENANGKAP DI PALING BAWAH                                        */
/*    Keduanya HARUS setelah semua router, bukan sebelumnya.           */
/* ------------------------------------------------------------------ */
app.use(notFound);       // tidak ada route yang cocok  -> 404
app.use(errorHandler);   // ada error yang tidak tertangkap -> 500

module.exports = app;
