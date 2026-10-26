/**
 * HELPER VALIDASI JOI — MINGGU 5
 * ==============================
 *
 * Pengganti src/utils/validate.js versi Minggu 2-4. Fungsi-fungsi di sini
 * sengaja mengembalikan BENTUK YANG SAMA dengan validate() lama:
 *
 *   const { valid, errors, value } = validasiJoi(bukuSchema, req.body);
 *
 * ...supaya controller tidak perlu mengubah cara bicaranya — hanya sumber
 * aturannya yang berpindah dari aturan manual ke schema Joi.
 *
 * Kenapa helper ini ada, bukan dipanggil langsung di controller?
 *   1. reshape error: Joi melaporkan error sebagai ARRAY datar; response
 *      kita sejak Minggu 2 adalah OBJEK per field — bentuk itu yang
 *      konsumen (dan koleksi Postman) sudah kenal.
 *   2. opsi abortEarly: false cukup ditulis sekali di sini.
 *   3. PATCH butuh schema parsial — logikanya satu tempat, dipakai semua
 *      resource project yang sudah ada.
 */
const Joi = require("joi");

/**
 * Joi melaporkan error begini (datar, satu field bisa muncul berkali-kali):
 *
 *   [ { message: "Judul minimal 3 karakter", path: ["judul"] },
 *     { message: "Judul maksimal ...",       path: ["judul"] },
 *     { message: "Harga harus angka",        path: ["harga"] } ]
 *
 * Reshape menjadi (objek per field, isinya array — bentuk sejak Minggu 2):
 *
 *   { judul: ["Judul minimal 3 karakter", "Judul maksimal ..."],
 *     harga: ["Harga harus angka"] }
 *
 * Kenapa `item.context.key || item.context.main`? Error per-field membawa
 * context.key; error LINTAS field (dari .with()) membawa context.main,
 * karena dia tidak milik satu field. Tanpa fallback itu, error .with()
 * jatuh ke key `undefined` — bug klasik Joi yang pernah disebut di materi.
 */
const reshape = (details) =>
  details.reduce((hasil, item) => {
    const key = item.context?.key || item.context?.main || "_schema";
    if (key in hasil) {
      hasil[key].push(item.message);
    } else {
      hasil[key] = [item.message];
    }
    return hasil;
  }, {});

/**
 * Validasi SATU schema, laporkan SEMUA error sekaligus.
 *
 * Opsi penting:
 *   abortEarly: false  -> jangan berhenti di error pertama (inti Minggu 5)
 *   stripUnknown: true -> field asing (isAdmin, diskon, ...) DIBUANG dari
 *                         value. Ini pertahanan mass assignment yang dulu
 *                         dikerjakan validate() manual — kini satu opsi Joi.
 *   convert: true      -> default Joi: "40" (string) diubah jadi 40 (angka)
 *                         sebelum divalidasi. Sama seperti perilaku lama.
 */
const validasiJoi = (schema, body) => {
  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return { valid: false, errors: reshape(error.details), value: null };
  }
  return { valid: true, errors: null, value };
};

/**
 * Validasi PARSIAL untuk PATCH — hanya field yang benar-benar dikirim.
 *
 * PATCH berarti "ubah sebagian", jadi field yang tidak dikirim tidak boleh
 * dianggap error. Cara Joi-nya: ambil field milik schema yang ada di body,
 * bangun schema BARU dari bagian-bagian itu:
 *
 *   schema.extract("harga")  -> schema satu field, Lengkap dengan
 *                               label dan pesan errornya.
 *
 * Aturan yang tidak relevan untuk PATCH (mis. default stok) dihapus
 * secara eksplisit, sama seperti versi Minggu 2-4.
 */
const validasiParsial = (schema, body) => {
  const keys = schema.describe().keys;
  const dipakai = Object.keys(body).filter((f) => f in keys);

  if (dipakai.length === 0) {
    // Tidak ada satu pun field yang dikenal schema — biarkan controller
    // yang memutuskan responsenya (di controller buku: 400).
    return { valid: false, errors: null, value: null, tanpaFieldDikenal: true };
  }

  // Object.fromEntries, bukan array pasangan: Joi.object({...}) menerima
  // objek literal — bentuk array membuat Joi salah mengerti key-nya.
  const partial = Joi.object(
    Object.fromEntries(dipakai.map((f) => [f, schema.extract(f)]))
  );

  const { error, value } = partial.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return { valid: false, errors: reshape(error.details), value: null };
  }

  // default() milik stok TIDAK boleh ikut bekerja di PATCH: field yang
  // tidak dikirim tidak boleh diam-diam terisi 0. Karena itu value
  // disaring sekali lagi — hanya field yang memang ada di body yang
  // lolos, default yang menyelinap dibuang di sini.
  const valueBersih = Object.fromEntries(
    Object.entries(value).filter(([k]) => k in body)
  );

  return { valid: true, errors: null, value: valueBersih };
};

module.exports = { validasiJoi, validasiParsial, reshape };
