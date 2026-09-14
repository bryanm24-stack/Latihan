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
const { contohRouter, bukuRouter } = require("./src/routes");
const { contohRouter, bukuRouter, penulisRouter } = require("./src/routes");

const port = process.env.PORT || 3001;

/* ------------------------------------------------------------------ */
/* 1. MIDDLEWARE GLOBAL                                                */
/*    Urutan itu penting. Middleware dijalankan dari atas ke bawah.    */
/* ------------------------------------------------------------------ */

// WAJIB. Tanpa dua baris ini req.body akan undefined.
app.use(express.json());                          // untuk Content-Type: application/json
app.use(express.urlencoded({ extended: true }));  // untuk form x-www-form-urlencoded

// Logger sederhana. Middleware formal dibahas Minggu 7,
// tapi sebenarnya kalian sudah memakainya sejak baris di atas.
app.use(logger);

/* ------------------------------------------------------------------ */
/* 2. ROUTER                                                           */
/* ------------------------------------------------------------------ */
app.get("/", (req, res) =>
  res.json({
    service: "SOA Minggu 2",
    version: "1.0.0",
    endpoints: ["/api/v1/contoh", "/api/v1/buku"],
  })
);

app.use("/api/v1/contoh", contohRouter);
app.use("/api/v1/buku", bukuRouter);
app.use("/api/v1/penulis", penulisRouter);

/* ------------------------------------------------------------------ */
/* 3. PENANGKAP DI PALING BAWAH                                        */
/*    Keduanya HARUS setelah semua router, bukan sebelumnya.           */
/* ------------------------------------------------------------------ */
app.use(notFound);       // tidak ada route yang cocok  -> 404
app.use(errorHandler);   // ada error yang tidak tertangkap -> 500

app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
