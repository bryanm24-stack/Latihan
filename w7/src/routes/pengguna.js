/**
 * ROUTES PENGGUNA — MINGGU 7
 * ==========================
 *
 * Hanya satu endpoint: profil milik PENGUNJUNGNYA sendiri.
 *
 * Ini contoh route terproteksi paling sederhana: verifyJWT di depan,
 * controller di belakang. Controller (profil di auth.js) tidak tahu
 * apa-apa soal token -- verifikasi selesai SEBELUM controller jalan.
 * Inilah kenapa middleware dipisah dari controller.
 */
const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");
const verifyJWT = require("../middlewares/verifyJWT");

const { profil } = require("../controllers/auth");

// Route terproteksi: tanpa token -> 401; token tidak valid -> 403;
// token sah -> 200 + data diri.
router
  .route("/profil")
  .get(verifyJWT, profil)
  .all(methodNotAllowed("GET"));

module.exports = router;
