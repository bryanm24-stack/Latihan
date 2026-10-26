/**
 * ROUTES AUTH — MINGGU 7
 * ======================
 *
 * Empat endpoint + satu route admin-only (demo checkRoles).
 * Perhatikan: TIDAK ADA satu pun endpoint auth yang bisa MEMBUAT admin.
 */
const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");
const asyncHandler = require("../utils/asyncHandler");
const verifyJWT = require("../middlewares/verifyJWT");
const checkRoles = require("../middlewares/checkRoles");

const { register, login, refresh, logout, profil } = require("../controllers/auth");

// Semua auth dibuka untuk publik -- justru login/register HARUS bisa
// diakses tanpa token. Yang diproteksi bukan pintu masuk, tapi pintu
// setelahnya (profil, rahasia, dst).
router.route("/register").post(asyncHandler(register)).all(methodNotAllowed("POST"));
router.route("/login").post(asyncHandler(login)).all(methodNotAllowed("POST"));
router.route("/refresh").post(asyncHandler(refresh)).all(methodNotAllowed("POST"));
router.route("/logout").post(asyncHandler(logout)).all(methodNotAllowed("POST"));

/* ------------------------------------------------------------------
 * DEMO ROUTE ADMIN-ONLY -- bukti checkRoles bekerja.
 *
 * URUTAN MIDDLEWARE TIDAK BOLEH TERBALIK:
 *   verifyJWT dulu ("kamu siapa?" -> req.pengguna terisi),
 *   baru checkRoles ("kamu boleh?" -> membaca req.pengguna.roles).
 *
 * checkRoles membaca req.pengguna.roles yang disiapkan verifyJWT;
 * urutan middleware karena itu wajib.
 * ------------------------------------------------------------------ */
router
  .route("/rahasia")
  .get(verifyJWT, checkRoles("admin"), (req, res) => {
    return res.status(200).json({
      pesan: "Rahasia hanya untuk admin",
      kamu: req.pengguna.pengguna_nama,
    });
  })
  .all(methodNotAllowed("GET"));

module.exports = router;
