/**
 * ROUTES CONTOH AXIOS — MINGGU 6
 * ==============================
 *
 * Resource "contohAxios": perantara ke API pihak ketiga (Kitsu).
 * URL-nya tetap milik KITA — consumer tidak perlu tahu upstream kita
 * siapa. Kalau suatu hari Kitsu diganti API lain, URL dan kontrak
 * response tidak berubah; yang berubah hanya controller ini.
 */

const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");
const asyncHandler = require("../utils/asyncHandler");

const { queryAnime, ujiWebhook } = require("../controllers/contohAxios");

// GET /api/v1/contohAxios?q=jojo&limit=3
// asyncHandler: seperti sejak Minggu 3, error dari await diteruskan
// ke errorHandler -- meskipun contohAxios menangkap sebagian besar
// errornya sendiri (502/504), ada jalur `throw` yang tetap lewat sini.
router.route("/").get(asyncHandler(queryAnime)).all(methodNotAllowed("GET"));

// POST /api/v1/contohAxios/webhook  { pesan } -- latihan Minggu 6
router
  .route("/webhook")
  .post(asyncHandler(ujiWebhook))
  .all(methodNotAllowed("POST"));

module.exports = router;
