/**
 * CONTROLLER BUKU — MINGGU 5 (JOI)
 * ==========================================
 *
 * Perbandingan tiga minggu, satu berkas yang sama:
 *
 *   Minggu 2  : controller membaca/menulis array di memori
 *   Minggu 3  : controller memanggil repository (src/data/buku.js)
 *               yang berisi SQL manual
 *   Minggu 4  : controller memanggil MODEL langsung — ORM ADALAH lapisan data
 *   Minggu 5  : validasi manual (aturanBuku + validate.js) diganti SCHEMA JOI.
 *               Bagian validasi di bawah berubah; sisanya identik Minggu 4.
 *

 * Yang TIDAK berubah sama sekali dari Minggu 2 sampai sekarang:
 *   - URL, method, dan status code
 *   - urutan logika (404 -> validasi -> aturan bisnis -> simpan)
 *   - bentuk response  <- alasan koleksi Postman masih hijau
 *   - pertahanan mass assignment (simpan dari `value`, bukan req.body)
 *
 * Query Sequelize memakai objek JavaScript, bukan string SQL:
 *   { where: {...}, order: [...], limit, offset, include: [...] }
 * Nama-nama propertinya adalah bagian dari kontrak ORM — belajar
 * membaca objek-objek inilah materi inti minggu ini.
 */

const { Op, fn, col, literal, where: rawWhere } = require("sequelize");
const { Buku, Karakter, sequelize } = require("../models");
const { kirimNotifikasi } = require("../utils/notifikasi");

/* ================================================================== */
/* ATURAN VALIDASI — SEKARANG SCHEMA JOI (MINGGU 5)                    */
/*                                                                     */
/* Bandingkan dengan aturanBuku versi Minggu 2-4 (git log -p): aturannya */
/* SAMA, tapi aturan + PESAN bahasa Indonesianya kini hidup di SATU     */
/* tempat: src/utils/validation/bukuSchema.js.                          */
/*                                                                      */
/* Controller tidak lagi mengetahui DETAIL aturan — dia hanya bertanya   */
/* "valid atau tidak" kepada schema, lewat helper validasiJoi() yang      */
/* mengembalikan bentuk { valid, errors, value } yang sama seperti        */
/* validate() lama.                                                       */
/*                                                                        */
/* Urutan lapis validasi TIDAK berubah: Joi -> model Sequelize -> MySQL.  */
/* ================================================================== */
const { bukuSchema } = require("../utils/validation");
const { validasiJoi, validasiParsial } = require("../utils/validation/validateJoi");

/* ================================================================== */
/* KONSTANTA QUERY — dipindah dari src/data/buku.js versi Minggu 3     */
/* ================================================================== */

// Kolom ringkas untuk daftar — persis KOLOM_RINGKAS Minggu 3.
const RINGKAS = ["id", "judul", "penulis", "harga", "stok"];

// Whitelist kolom sort. Alasannya TIDAK BERUBAH dan TIDAK HILANG meski
// sekarang memakai ORM: nama kolom untuk ORDER BY tidak bisa dikirim
// sebagai "nilai" terikat (bound value) — di Sequelize maupun di SQL
// mentah. Kalau `sort` dari user ditempel langsung, itu tetap celah
// SQL Injection, di framework apa pun.
const KOLOM_SORT_BOLEH = ["id", "judul", "harga", "tahun_terbit", "stok"];

/**
 * Bangun WHERE untuk pencarian. Versi Minggu 3:
 *   "(LOWER(judul) LIKE ? OR LOWER(penulis) LIKE ?)"
 *
 * Versi ORM dari baris itu — sama persis SQL yang dihasilkan, tapi
 * ditulis sebagai objek. Ini yang disebut "SQL tanpa menulis SQL".
 */
const filterPencarian = ({ keyword, kategori }) => {
  const kondisi = [];

  if (keyword) {
    const k = `%${keyword.toLowerCase()}%`;
    kondisi.push({
      [Op.or]: [
        rawWhere(fn("LOWER", col("judul")), { [Op.like]: k }),
        rawWhere(fn("LOWER", col("penulis")), { [Op.like]: k }),
      ],
    });
  }

  if (kategori) {
    kondisi.push({ kategori });
  }

  return kondisi.length ? { [Op.and]: kondisi } : undefined;
};

/**
 * Ambil satu buku LENGKAP (termasuk karakter) — pengganti repoBuku.cariId().
 *
 * `include` = EAGER LOADING: satu query dengan JOIN (lihat log [SQL] di
 * terminal), bukan satu query per karakter. Bandingkan dengan dua
 * pool.query() berurutan di versi Minggu 3.
 */
const getBukuLengkap = async (id) =>
  Buku.findByPk(Number(id), {
    include: {
      model: Karakter,
      as: "karakter",
      attributes: ["id", "nama", "peran"],
    },
  });

/* ================================================================== */
/* GET /api/v1/buku                                                    */
/* Query: ?keyword= &kategori= &limit= &offset= &sort= &order=         */
/* ================================================================== */
const queryBuku = async (req, res) => {
  const { keyword, kategori, limit, offset, sort, order } = req.query;

  // findAndCountAll = dua pekerjaan sekaligus: COUNT(*) untuk total,
  // dan SELECT halaman untuk data. Versi Minggu 3 butuh DUA pool.query().
  const { count: total, rows } = await Buku.findAndCountAll({
    where: filterPencarian({ keyword, kategori }),
    attributes: RINGKAS,
    order: [
      [KOLOM_SORT_BOLEH.includes(sort) ? sort : "id", order === "desc" ? "DESC" : "ASC"],
    ],
    limit: Number(limit) || undefined, // undefined = tanpa LIMIT
    offset: Number(offset) || 0,
  });

  return res.status(200).json({
    total,
    limit: Number(limit) || 0,
    offset: Number(offset) || 0,
    data: rows, // instance Sequelize otomatis serialisasi ke JSON
  });
};

/* ================================================================== */
/* GET /api/v1/buku/statistik                                          */
/*                                                                     */
/* Ini contoh HONEST ketika ORM kalah praktis: agregasi GROUP BY.      */
/* Masih bisa ditulis (di bawah), tapi lihat log [SQL]-nya lalu        */
/* bandingkan dengan tiga pool.query() versi Minggu 3 — versi SQL      */
/* jauh lebih jelas. Keduanya sah; kuncinya tahu kapan memilih yang    */
/* mana. Baca PANDUAN.md bagian "Kapan raw query masih diperlukan".    */
/* ================================================================== */
const statistikBuku = async (req, res) => {
  const ringkasan = await Buku.findOne({
    attributes: [
      [fn("COUNT", col("id")), "total_judul"],
      [fn("COALESCE", fn("SUM", col("stok")), 0), "total_stok"],
      [fn("COALESCE", fn("SUM", literal("stok = 0")), 0), "judul_stok_habis"],
    ],
    raw: true, // hasil mentah, tanpa instance model
  });

  const baris = await Buku.findAll({
    attributes: ["kategori", [fn("COUNT", col("id")), "jumlah"]],
    group: ["kategori"],
    raw: true,
  });

  const per_kategori = {};
  baris.forEach((b) => {
    per_kategori[b.kategori] = Number(b.jumlah);
  });

  const termahal = await Buku.findOne({
    order: [["harga", "DESC"]],
    attributes: RINGKAS,
  });

  return res.status(200).json({
    total_judul: Number(ringkasan.total_judul),
    total_stok: Number(ringkasan.total_stok),
    judul_stok_habis: Number(ringkasan.judul_stok_habis),
    per_kategori,
    termahal: termahal || null,
  });
};

/* ================================================================== */
/* GET /api/v1/buku/:bukuId                                            */
/* ================================================================== */
const getSingleBuku = async (req, res) => {
  const buku = await getBukuLengkap(req.params.bukuId);

  // findByPk + paranoid otomatis menyembunyikan baris yang sudah
  // soft-deleted — 404 tetap bekerja.
  if (!buku) {
    return res
      .status(404)
      .json({ msg: `Buku dengan id ${req.params.bukuId} tidak ditemukan` });
  }

  return res.status(200).json(buku);
};

/* ================================================================== */
/* GET /api/v1/buku/:bukuId/karakter                                   */
/* GET /api/v1/buku/:bukuId/karakter/:karakterId                       */
/* ================================================================== */
const getKarakter = async (req, res) => {
  const { bukuId, karakterId } = req.params;

  const buku = await getBukuLengkap(bukuId);
  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  // Dua kondisi 404 berbeda dengan pesan berbeda — tidak berubah
  // dari Minggu 2 dan 3.
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
  const { valid, errors, value } = validasiJoi(bukuSchema, req.body);
  if (!valid) {
    return res.status(400).json({ msg: "Validasi gagal", errors });
  }

  // Aturan bisnis "judul tidak boleh kembar" — lapis pertama.
  try {
    const kembar = await Buku.findOne({
      where: rawWhere(fn("LOWER", col("judul")), value.judul.toLowerCase()),
    });
    if (kembar) {
      return res.status(409).json({ msg: `Buku "${value.judul}" sudah terdaftar` });
    }

    // Buku.create() menjalankan: setter (trim spasi) -> validasi model ->
    // INSERT. Tiga hal yang di Minggu 3 dipecah di tiga lapisan berbeda.
    const bukuBaru = await Buku.create(value);
    const hasil = await getBukuLengkap(bukuBaru.id);

    // Notifikasi webhook (Minggu 6) -- sengaja TIDAK di-await:
    // response 201 tidak perlu menunggu Discord. Kegagalannya ditangani
    // DI DALAM kirimNotifikasi -- buku tetap terbuat walau Discord down.
    // Kegagalan webhook hanya dicatat di log; response create tetap 201.
    kirimNotifikasi(`Buku baru ditambahkan: ${bukuBaru.judul}`);

    return res
      .status(201)
      .location(`/api/v1/buku/${bukuBaru.id}`)
      .json(hasil);
  } catch (error) {
    // Lapis KEDUA dan KETIGA melapor di sini kalau dilanggar:
    //   SequelizeValidationError          -> validasi model gagal  -> 400
    //   SequelizeUniqueConstraintError    -> UNIQUE KEY MySQL        -> 409
    // (dua request dengan judul sama nyaris bersamaan bisa lolos dari
    // pengecekan findOne di atas — constraint database yang menyelamatkan.)
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ msg: `Buku "${value.judul}" sudah terdaftar` });
    }
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        msg: "Validasi gagal",
        errors: { _model: error.errors.map((e) => e.message) },
      });
    }
    throw error; // sisanya -> asyncHandler -> errorHandler -> 500
  }
};

/* ================================================================== */
/* PUT /api/v1/buku/:bukuId — GANTI SELURUHNYA                         */
/* ================================================================== */
const updateBuku = async (req, res) => {
  const { bukuId } = req.params;

  const buku = await Buku.findByPk(Number(bukuId));
  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  // PUT = ganti seluruhnya -> semua field wajib, schema yang sama dengan POST.
  const { valid, errors, value } = validasiJoi(bukuSchema, req.body);
  if (!valid) {
    return res.status(400).json({ msg: "Validasi gagal", errors });
  }

  try {
    // instance.update(value) mengubah HANYA field di `value`, lalu
    // menjalankan validasi model dan UPDATE ... WHERE id = ?.
    // Baris karakter TIDAK disentuh — mereka tabel lain, dihubungkan
    // foreign key, sama seperti Minggu 3.
    await buku.update(value);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ msg: `Buku "${value.judul}" sudah terdaftar` });
    }
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        msg: "Validasi gagal",
        errors: { _model: error.errors.map((e) => e.message) },
      });
    }
    throw error;
  }

  const bukuTerbaru = await getBukuLengkap(bukuId);
  return res.status(200).json(bukuTerbaru);
};

/* ================================================================== */
/* PATCH /api/v1/buku/:bukuId — UBAH SEBAGIAN                          */
/* ================================================================== */
const patchBuku = async (req, res) => {
  const { bukuId } = req.params;

  const buku = await Buku.findByPk(Number(bukuId));
  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ msg: "Tidak ada field yang dikirim untuk diubah" });
  }

  // Versi Minggu 2-4 menyalin aturan manual lalu mematikan required.
  // Versi Joi: validasiParsial() membangun schema BARU dari field yang
  // dikirim — setiap field diambil dengan schema.extract() sehingga
  // label dan pesan errornya ikut. Logikanya satu tempat, dipakai semua
  // resource (lihat src/utils/validation/validateJoi.js).
  const { valid, errors, value, tanpaFieldDikenal } = validasiParsial(
    bukuSchema,
    req.body
  );

  if (tanpaFieldDikenal) {
    return res
      .status(400)
      .json({ msg: "Tidak ada field yang bisa diubah pada request ini" });
  }

  if (!valid) {
    return res.status(400).json({ msg: "Validasi gagal", errors });
  }

  try {
    await buku.update(value); // HANYA field yang tervalidasi yang berubah
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ msg: `Buku "${value.judul}" sudah terdaftar` });
    }
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        msg: "Validasi gagal",
        errors: { _model: error.errors.map((e) => e.message) },
      });
    }
    throw error;
  }

  const bukuTerbaru = await getBukuLengkap(bukuId);
  return res.status(200).json(bukuTerbaru);
};

/* ================================================================== */
/* DELETE /api/v1/buku/:bukuId                                         */
/* ================================================================== */
const deleteBuku = async (req, res) => {
  const { bukuId } = req.params;

  const buku = await Buku.findByPk(Number(bukuId));
  if (!buku) {
    return res.status(404).json({ msg: `Buku dengan id ${bukuId} tidak ditemukan` });
  }

  // destroy() = DELETE FROM buku WHERE id = ?. Baris karakter ikut
  // terhapus lewat ON DELETE CASCADE (MySQL), BUKAN lewat kode di sini.
  //
  // Dengan paranoid: true, destroy() menjadi soft delete:
  // satu baris di model, dan baris ini tidak lagi hilang — hanya
  // ditandai deletedAt. Konsekuensinya menarik, coba sendiri.
  await buku.destroy();

  return res.status(200).json({ msg: `Buku "${buku.judul}" telah dihapus` });
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
