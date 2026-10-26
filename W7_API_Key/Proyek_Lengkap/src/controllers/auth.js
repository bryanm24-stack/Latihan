/**
 * CONTROLLER AUTH — MINGGU 7
 * ==========================
 *
 * Empat endpoint + satu profil:
 *
 *   POST /api/v1/auth/register  -> buat akun, password DI-HASH
 *   POST /api/v1/auth/login     -> verifikasi password, terbitkan token
 *   POST /api/v1/auth/refresh   -> access token baru dari refresh token
 *   POST /api/v1/auth/logout    -> hapus refresh token (cookie)
 *   GET  /api/v1/pengguna/profil -> CONTOH route terproteksi (verifyJWT)
 *
 * Konsep yang membuat auth ini "aman alasan-alasannya":
 *   - hash bukan enkripsi (bcrypt.hash / bcrypt.compare)
 *   - JWT: ditandatangani, BUKAN disandikan (bisa dibaca siapa pun)
 *   - access token 15 menit secara default (ACCESS_TOKEN_TTL dapat diatur)
 *   - refresh token panjang (1 hari), di httpOnly cookie
 */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pengguna } = require("../models");
const { validasiJoi } = require("../utils/validation/validateJoi");
const Joi = require("joi");

// Hash dummy membuat jalur "username tidak ada" tetap menjalankan satu
// bcrypt.compare. Tanpanya, perbedaan waktu respons dapat membocorkan
// apakah username terdaftar meski pesan error sama.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  crypto.randomBytes(32).toString("hex"),
  10
);

/* ================================================================== */
/* ATURAN VALIDASI REGISTER — Joi, bekal Minggu 5                      */
/* ================================================================== */
const aturanRegister = Joi.object({
  pengguna_nama: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .label("Nama Pengguna")
    .messages({
      "any.required": "{#label} harus diisi",
      "string.empty": "{#label} harus diisi",
      "string.alphanum": "{#label} harus dalam bentuk alphanumeric saja",
      "string.min": "{#label} minimal {#limit} karakter",
      "string.max": "{#label} maksimal {#limit} karakter",
    }),

  pengguna_jk: Joi.string()
    .valid("L", "P")
    .label("Jenis Kelamin")
    .messages({
      "any.only": "{#label} harus L atau P",
    }),

  pengguna_password: Joi.string()
    .pattern(
      new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$")
    )
    .required()
    .label("Password")
    .messages({
      "any.required": "{#label} harus diisi",
      "string.empty": "{#label} harus diisi",
      "string.pattern.base":
        "{#label} harus diisi dengan minimal 1 huruf kecil, 1 huruf besar, 1 angka dan 1 simbol, dengan panjang minimal 8 karakter",
    }),
});

/* ================================================================== */
/* POST /api/v1/auth/register                                          */
/* ================================================================== */
const register = async (req, res) => {
  const { valid, errors, value } = validasiJoi(aturanRegister, req.body);
  if (!valid) {
    return res.status(400).json({ msg: "Validasi gagal", errors });
  }

  // bcrypt.hash(password, COST). Cost 10 = ~100ms per hash --
  // disengaja LAMBAT: biar pencobaan brute-force juga lambat. Naikkan
  // ke 12 dan rasakan bedanya di terminal.
  const hashedPassword = await bcrypt.hash(value.pengguna_password, 10);

  try {
    const hasil = await Pengguna.create({
      pengguna_nama: value.pengguna_nama,
      pengguna_jk: value.pengguna_jk,
      pengguna_password: hashedPassword,
      // TIDAK ADA parameter roles dari body. Register SELALU visitor --
      // kalau client bisa mengirim roles, POST {"roles":"admin"}
      // menciptakan admin baru. (Ini versi mass assignment paling
      // berbahaya. Silakan coba kirim roles di body -- tidak akan
      // pernah tersimpan.)
      roles: "visitor",
      // BRYAN: key diterbitkan melalui endpoint khusus dengan JWT.
      api_key: null,
      api_level: "basic",
    });

    // model defaultScope sudah menyaring password -- tapi ini bentuk
    // pertahanan KEDUANYA secara eksplisit, karena yang satu ini
    // keputusan controller, bukan kebetulan scope.
    //
    // PERHATIAN: Pengguna.create() mengembalikan instance yang
    // dataValues-nya LENGKAP -- termasuk hash password! defaultScope
    // hanya menyaring hasil SELECT (findByPk/findAll), bukan hasil
    // create. Karena itu kita re-fetch: findByPk memakai scope, dan
    // hash tidak pernah keluar. (re-fetch ini mencegah hash masuk ke response.)
    const aman = await Pengguna.findByPk(hasil.id);

    return res.status(201).json(aman);
  } catch (error) {
    // pengguna_nama UNIQUE (schema.sql + unique di model) --
    // dua register nyaris bersamaan ditangkap lapis database.
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ msg: `Nama pengguna "${value.pengguna_nama}" sudah terdaftar` });
    }
    throw error;
  }
};

/* ================================================================== */
/* POST /api/v1/auth/login                                             */
/* ================================================================== */
const login = async (req, res) => {
  const { pengguna_nama, pengguna_password } = req.body || {};

  // BENTROK yang membedakan? Tidak -- satu kalimat saja di bawah, dua
  // kondisi lolos ke sana. Kenapa? Lihat PANDUAN bagian "satu pesan
  // untuk dua kegagalan".
  if (!pengguna_nama || !pengguna_password) {
    return res
      .status(400)
      .json({ msg: "Silakan masukkan username dan password" });
  }

  // unscoped() = keluar dari defaultScope, karena hash HARUS dibaca
  // untuk dibandingkan. Ini pengambilan data internal yang SADAR dan
  // eksplisit -- beda dengan membiarkan hash bocor ke response.
  const pengguna = await Pengguna.unscoped().findOne({
    where: { pengguna_nama: String(pengguna_nama).trim().toLowerCase() },
  });

  // bcrypt.compare: hash kembali tebakan dan bandingkan. Karena SALT
  // tersimpan di dalam hash, tidak perlu kolom salt terpisah.
  const passwordCocok = await bcrypt.compare(
    pengguna_password,
    pengguna?.pengguna_password || DUMMY_PASSWORD_HASH
  );

  if (!pengguna || !passwordCocok) {
    // PESANNYA SAMA PERSIS dengan "username tidak ada" di atas.
    // Beda pesan = peta bagi penyerang: mereka tahu username mana
    // yang valid, lalu tinggal menyerang password-nya.
    return res.status(401).json({ msg: "Gagal login" });
  }

  // Payload yang DITANDATANGANI -- sengaja minimal. INGAT: payload JWT
  // bisa dibaca siapa pun yang memegang token.
  const payload = {
    pengguna: {
      id: pengguna.id,
      pengguna_nama: pengguna.pengguna_nama,
      roles: pengguna.roles,
    },
  };

  // DUA token, dua masa hidup:
  //   accessToken  mengikuti ACCESS_TOKEN_TTL, default 15 menit. Kalau
  //                bocor, bocornya sebentar.
  //   refreshToken 1 hari  -- memperpanjang akses TANPA login ulang.
  //                Karena lebih berharga, tempatnya httpOnly cookie:
  //                TIDAK bisa dibaca JavaScript browser (anti XSS).
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
  });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "1d",
  });

  const refreshCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  };

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  return res.status(200).json({ accessToken });
};

/* ================================================================== */
/* POST /api/v1/auth/refresh                                           */
/* ================================================================== */
const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ msg: "Refresh token tidak ada" });
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ msg: "Refresh token tidak valid" });
    }

    // Terbitkan accessToken BARU dari identitas refresh token.
    // Perhatikan SECRET-nya BEDA -- kalau satu secret dipakai untuk
    // dua jenis token, refresh token bisa dipakai langsung sebagai
    // access token. (Coba: hapus REFRESH_TOKEN_SECRET, isi
    // ACCESS_TOKEN_SECRET dua-duanya, dan lihat celahnya.)
    const accessToken = jwt.sign(
      { pengguna: decoded.pengguna },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
    );

    return res.status(200).json({ accessToken });
  });
};

/* ================================================================== */
/* POST /api/v1/auth/logout                                            */
/* ================================================================== */
const logout = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(200).json({ msg: "Berhasil logout" });
  // Ini hanya menghapus cookie di client. Token yang sudah terbit tetap
  // valid sampai kedaluwarsa -- JWT tidak punya "ingatan" siapa yang
  // sudah logout. Pencabutan sungguhan memerlukan penyimpanan token di
  // server (mis. database atau denylist).
};

/* ================================================================== */
/* GET /api/v1/pengguna/profil  -- CONTOH route terproteksi            */
/*                                                                     */
/* Ditaruh di routes/pengguna.js dengan middleware verifyJWT.          */
/* req.pengguna diisi verifyJWT dari payload token.                   */
/* ================================================================== */
const profil = async (req, res) => {
  return res.status(200).json({
    pesan: "Ini data milikmu -- hanya terbaca dengan token yang sah",
    pengguna: req.pengguna,
  });
};

module.exports = { register, login, refresh, logout, profil };
