/**
 * CONTROLLER BUKU — MINGGU 3
 * ==========================
 *
 * Bandingkan file ini dengan versi Minggu 2 (git log -p src/controllers/buku.js).
 * Struktur dan URUTAN LOGIKA-nya SAMA PERSIS. Yang berubah cuma dua hal:
 *
 *   1. Setiap fungsi sekarang `async`, dan setiap panggilan ke data
 *      sekarang pakai `await` — karena bicara ke MySQL butuh waktu
 *      (network round-trip), tidak seperti membaca array di memori.
 *
 *   2. `store.buku.find(...)`, `.filter(...)`, dst diganti panggilan
 *      ke src/data/buku.js: `repoBuku.cariId(...)`, `repoBuku.hapus(...)`,
 *      dst. Controller TIDAK PERNAH menulis SQL sendiri.
 *
 * Kenapa tidak ada try/catch di sini padahal `await` bisa gagal?
 * Lihat src/utils/asyncHandler.js — pembungkus itu yang menangkapnya,
 * dipasang di routes/buku.js.
 */

const repoBuku = require("../data/buku");
const validate = require("../utils/validate");

/* ================================================================== */
/* ATURAN VALIDASI — TIDAK BERUBAH SAMA SEKALI DARI MINGGU 2.          */
/* Validasi bicara soal BENTUK data (tipe, panjang, rentang), dan itu  */
/* tidak berhubungan dengan di mana data disimpan. Minggu 5 bagian ini */
/* diganti Joi.                                                        */
/* ================================================================== */
const aturanBuku = {
  judul: {
    type: "string",
    required: true,
    label: "Judul",
    minLength: 3,
    maxLength: 150,
  },
  penulis: {
    type: "string",
    required: true,
    label: "Penulis",
    minLength: 3,
    maxLength: 100,
  },
  tahun_terbit: {
    type: "number",
    required: true,
    integer: true,
    label: "Tahun terbit",
    min: 1900,
    max: new Date().getFullYear(),
  },
  harga: {
    type: "number",
    required: true,
    label: "Harga",
    min: 0,
  },
  stok: {
    type: "number",
    required: false,
    integer: true,
    label: "Stok",
    min: 0,
    default: 0, // kalau tidak dikirim, dianggap 0
  },
  kategori: {
    type: "enum",
    required: true,
    label: "Kategori",
    values: ["novel", "komik", "non-fiksi", "referensi"],
  },
};

/* ================================================================== */
/* GET /api/v1/buku                                                    */
/* Query: ?keyword= &kategori= &limit= &offset= &sort= &order=         */
/* ================================================================== */
const queryBuku = async (req, res) => {
  const { keyword, kategori, limit, offset, sort, order } = req.query;

  const { total, data } = await repoBuku.cariSemua({
    keyword,
    kategori,
    sort,
    order,
    limit,
    offset,
  });

  const off = Number(offset) || 0;
  const lim = Number(limit) || 0;

  // Daftar kosong itu BUKAN error. Pencarian yang tidak menemukan apa pun
  // adalah pencarian yang berhasil dengan hasil nol.
  // Jadi: 200 dengan array kosong, BUKAN 404. Sama seperti Minggu 2.
  return res.status(200).json({ total, limit: lim, offset: off, data });
};

/* ================================================================== */
/* GET /api/v1/buku/statistik                                          */
/*                                                                     */
/* !! PERHATIKAN URUTANNYA DI FILE ROUTES !!                           */
/* Route ini HARUS didaftarkan SEBELUM /:bukuId. Alasannya tidak        */
/* berubah dari Minggu 2 — baca catatan di routes/buku.js.             */
/* ================================================================== */
const statistikBuku = async (req, res) => {
  const hasil = await repoBuku.statistik();
  return res.status(200).json(hasil);
};

/* ================================================================== */
/* GET /api/v1/buku/:bukuId                                            */
/* ================================================================== */
const getSingleBuku = async (req, res) => {
  const buku = await repoBuku.cariId(req.params.bukuId);

  // Satu resource yang diminta secara spesifik TIDAK ADA -> 404.
  // Bedakan dengan daftar kosong di atas yang tetap 200.
  if (!buku) {
    return res
      .status(404)
      .json({ msg: `Buku dengan id ${req.params.bukuId} tidak ditemukan` });
  }

  return res.status(200).json(buku); // lengkap, termasuk karakter
};

/* ================================================================== */
/* GET /api/v1/buku/:bukuId/karakter                                   */
/* GET /api/v1/buku/:bukuId/karakter/:karakterId                       */
/*                                                                     */
/* Nested resource: karakter tidak punya arti tanpa bukunya.           */
/* Karena itu URL-nya bersarang, bukan /api/v1/karakter/1.             */
/* ================================================================== */
const getKarakter = async (req, res) => {
  const { bukuId, karakterId } = req.params;

  const buku = await repoBuku.cariId(bukuId);
  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  // Ada DUA kondisi 404 yang berbeda di sini, dan pesannya harus berbeda.
  // "Buku tidak ditemukan" dan "Karakter tidak ditemukan" adalah dua
  // masalah berbeda bagi consumer kita.
  if (karakterId) {
    const karakter = buku.karakter.find((c) => c.id === Number(karakterId));
    if (!karakter) {
      return res
        .status(404)
        .json({ msg: `Karakter dengan id ${karakterId} tidak ada pada buku ini` });
    }
    return res.status(200).json(karakter);
  }

  return res.status(200).json({
    buku_id: buku.id,
    judul: buku.judul,
    total: buku.karakter.length,
    data: buku.karakter,
  });
};

/* ================================================================== */
/* POST /api/v1/buku                                                   */
/* ================================================================== */
const storeBuku = async (req, res) => {
  const { valid, errors, value } = validate(req.body, aturanBuku);

  if (!valid) {
    return res.status(400).json({ msg: "Validasi gagal", errors });
  }

  // Aturan bisnis: judul tidak boleh kembar.
  // Ini BUKAN validasi format, jadi tempatnya di sini, bukan di validate().
  // Lapis kedua aturan yang sama ada di database (UNIQUE KEY di
  // sql/schema.sql) — baca PANDUAN.md §15 "Dua lapis validasi".
  const kembar = await repoBuku.cariByJudul(value.judul);
  if (kembar) {
    // 409 Conflict, bukan 400. Datanya benar; keadaan server yang bentrok.
    return res.status(409).json({ msg: `Buku "${value.judul}" sudah terdaftar` });
  }

  // Perhatikan: kita menyimpan dari `value`, BUKAN dari req.body.
  // Inilah pertahanan terhadap mass assignment. Tidak berubah dari Minggu 2.
  const idBaru = await repoBuku.simpan(value);
  const bukuBaru = await repoBuku.cariId(idBaru);

  // 201 Created + header Location menunjuk ke resource yang baru dibuat.
  return res
    .status(201)
    .location(`/api/v1/buku/${idBaru}`)
    .json(bukuBaru);
};

/* ================================================================== */
/* PUT /api/v1/buku/:bukuId — GANTI SELURUHNYA                         */
/* ================================================================== */
const updateBuku = async (req, res) => {
  const { bukuId } = req.params;
  const buku = await repoBuku.cariId(bukuId);

  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  // PUT = ganti seluruhnya, jadi SEMUA field wajib dikirim.
  // Aturan validasinya sama persis dengan POST.
  const { valid, errors, value } = validate(req.body, aturanBuku);
  if (!valid) {
    return res.status(400).json({ msg: "Validasi gagal", errors });
  }

  // id tidak boleh diganti lewat body, dan baris karakter TIDAK disentuh
  // sama sekali oleh UPDATE ini — mereka baris terpisah di tabel lain,
  // terhubung lewat buku_id. Tidak perlu "dipertahankan" secara manual
  // seperti versi array Minggu 2.
  await repoBuku.ganti(bukuId, value);
  const bukuTerbaru = await repoBuku.cariId(bukuId);

  return res.status(200).json(bukuTerbaru);
};

/* ================================================================== */
/* PATCH /api/v1/buku/:bukuId — UBAH SEBAGIAN                          */
/* ================================================================== */
const patchBuku = async (req, res) => {
  const { bukuId } = req.params;
  const buku = await repoBuku.cariId(bukuId);

  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  // Body kosong pada PATCH artinya "ubah tidak ada apa-apa" -> tidak masuk akal.
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ msg: "Tidak ada field yang dikirim untuk diubah" });
  }

  // Inilah bedanya dengan PUT: aturan disalin, lalu SEMUA required dimatikan,
  // dan hanya field yang benar-benar dikirim yang divalidasi.
  const aturanParsial = {};
  for (const [field, rule] of Object.entries(aturanBuku)) {
    if (field in req.body) {
      aturanParsial[field] = { ...rule, required: false };
      delete aturanParsial[field].default; // jangan isi default saat PATCH
    }
  }

  if (Object.keys(aturanParsial).length === 0) {
    return res
      .status(400)
      .json({ msg: "Tidak ada field yang bisa diubah pada request ini" });
  }

  const { valid, errors, value } = validate(req.body, aturanParsial);
  if (!valid) {
    return res.status(400).json({ msg: "Validasi gagal", errors });
  }

  await repoBuku.ubahSebagian(bukuId, value);
  const bukuTerbaru = await repoBuku.cariId(bukuId);

  return res.status(200).json(bukuTerbaru);
};

/* ================================================================== */
/* DELETE /api/v1/buku/:bukuId                                         */
/* ================================================================== */
const deleteBuku = async (req, res) => {
  const { bukuId } = req.params;
  const buku = await repoBuku.cariId(bukuId);

  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  // Karakter milik buku ini ikut terhapus lewat ON DELETE CASCADE
  // (sql/schema.sql), bukan lewat kode di sini. Bandingkan dengan
  // .filter() manual di versi Minggu 2.
  await repoBuku.hapus(bukuId);

  return res.status(200).json({ msg: `Buku "${buku.judul}" telah dihapus` });

  // Alternatif yang juga benar: 204 No Content, tanpa body sama sekali.
  //   return res.status(204).send();
  // Dua-duanya sah. Yang penting kalian KONSISTEN di seluruh API,
  // dan mendokumentasikan pilihan kalian.
};

module.exports = {
  queryBuku,
  statistikBuku,
  getSingleBuku,
  getKarakter,
  storeBuku,
  updateBuku,
  patchBuku,
  deleteBuku,
};
