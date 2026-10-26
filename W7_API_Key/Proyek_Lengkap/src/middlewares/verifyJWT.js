/**
 * MIDDLEWARE verifyJWT — MINGGU 7
 * ===============================
 *
 * Autentikasi: "kamu SIAPA?"
 *
 * Jalur middleware selalu sama bentuknya (kalau kalian perhatikan, ini
 * pola ketiga kalinya: methodNotAllowed, logger, kini ini):
 *
 *     (req, res, next) => {
 *       ...periksa...
 *       if (gagal)   return res.status(...).json(...);  // STOP di sini
 *       ...siapkan data...
 *       next();                                          // lanjut
 *     }
 *
 * Dua jebakan klasik yang dijaga di bawah:
 *   - lupa `return` sebelum res  -> response terkirim dua kali
 *     ("Cannot set headers after they are sent")
 *   - lupa `next()` di jalur sukses -> request MENGGANTUNG SELAMANYA
 *     (client menunggu, server menganggap belum selesai)
 */
const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
  // Header format standar: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    // Tidak ada kredensial sama sekali -> 401: "siapa kamu?"
    return res.status(401).json({ msg: "Header Authorization tidak ada" });
  }

  // "Bearer <token>" -> ambil bagian kedua
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Token ADA tapi tidak valid (signature salah / kedaluwarsa)
      // -> 403. Bukan 401: client SUDAH berusaha, kredensialnya yang
      // tidak sah. Perbedaan 401 vs 403 -- lihat PANDUAN bagian
      // "401 dan 403: dua pertanyaan berbeda".
      return res.status(403).json({ msg: "Token tidak valid" });
    }

    // Teruskan identitas ke controller lewat req.
    // Isi payload sengaja MINIMAL: id, nama, roles. Jangan pernah
    // menyimpan password/hash di dalam JWT -- payload JWT bisa dibaca
    // siapa pun yang memegang token.
    req.pengguna = decoded.pengguna;
    next();
  });
};

module.exports = verifyJWT;
