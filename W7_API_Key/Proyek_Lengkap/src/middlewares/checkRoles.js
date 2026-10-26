/**
 * MIDDLEWARE checkRoles — MINGGU 7
 * ================================
 *
 * Otorisasi: "kamu BOLEH?" -- pertanyaan BERBEDA dari verifyJWT
 * ("kamu siapa?"). Karena itu dua middleware terpisah, dan URUTANNYA
 * di route TIDAK BOLEH terbalik:
 *
 *     router.get("/rahasia", verifyJWT, checkRoles("admin"), handler)
 *                              ^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^
 *                              dulu: siapa?  baru: boleh?
 *
 * checkRoles("admin") TIDAK langsung menjadi middleware -- dia
 * MENGEMBALIKAN fungsi middleware. Itulah kenapa di route dia
 * DIPANGGIL (checkRoles("admin")), sedangkan verifyJWT cukup
 * DILETAKKAN (verifyJWT). Pola ini namanya middleware factory:
 * satu fungsi, banyak konfigurasi.
 */
const checkRoles = (...allowedRoles) => {
  // ...allowedRoles = REST parameter: checkRoles("admin") ->
  // allowedRoles = ["admin"]; checkRoles("admin", "editor") ->
  // allowedRoles = ["admin", "editor"].
  return (req, res, next) => {
    // req.pengguna diisi verifyJWT -- kalau middleware ini terpasang
    // SEBELUM verifyJWT, req.pengguna undefined -> error membingungkan.
    // Urutan yang benar ada di file routes.
    const rolesUser = req.pengguna.roles.split(",");

    const bolehMasuk = rolesUser
      .map((role) => allowedRoles.includes(role))
      .find((value) => value === true);

    if (!bolehMasuk) {
      // Terotentikasi TAPI tidak berhak -> 403, bukan 401.
      // Kalau ini 401, client akan menyangka login-nya bermasalah
      // dan login ulang -- sia-sia. Informasinya jelas: hakmu kurang.
      return res.status(403).json({ msg: "Role kamu tidak diizinkan" });
    }

    next();
  };
};

module.exports = checkRoles;
