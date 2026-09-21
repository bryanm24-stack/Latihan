/**
 * "DATABASE" MINGGU 3 — MySQL, lewat pool koneksi (lihat src/config/database.js).
 *
 * Bandingkan file ini dengan versi Minggu 2 (git log -p src/data/buku.js).
 * Isinya BUKAN lagi array `let buku = [...]`. Sekarang setiap fungsi di sini
 * berbicara ke MySQL lewat SQL, dan MENGEMBALIKAN bentuk data yang SAMA
 * PERSIS seperti sebelumnya — itu sebabnya controllers/buku.js nyaris
 * tidak berubah selain menambahkan `await`.
 *
 * Ini disebut REPOSITORY PATTERN: controller tidak pernah menulis SQL
 * sendiri, dia hanya memanggil fungsi di sini ("cariId", "simpan", dst).
 * Kalau suatu saat MySQL diganti Postgres, atau ditambah caching, yang
 * berubah HANYA file ini. Controller, routes, dan validate.js tidak tahu
 * dan tidak perlu tahu.
 *
 * ATURAN PALING PENTING DI FILE INI:
 * Setiap nilai dari luar (req.body, req.params, req.query) masuk lewat
 * placeholder `?`, TIDAK PERNAH ditempel langsung ke string SQL dengan
 * template literal. Itulah pertahanan terhadap SQL INJECTION — lihat
 * PANDUAN.md §13 untuk contoh konkret kenapa ini penting.
 */
const { pool } = require("../config/database");

const KOLOM_RINGKAS = "id, judul, penulis, harga, stok";
const KOLOM_LENGKAP = "id, judul, penulis, tahun_terbit, harga, stok, kategori";

// Whitelist kolom sort — SAMA seperti Minggu 2, dan alasannya SAMA:
// nama kolom untuk ORDER BY tidak bisa dikirim lewat placeholder `?`
// (itu hanya untuk NILAI, bukan nama kolom). Kalau `sort` dari user
// ditempel langsung ke SQL tanpa whitelist ini, itu celah SQL Injection.
const KOLOM_SORT_BOLEH = ["id", "judul", "harga", "tahun_terbit", "stok"];

/* ================================================================== */
/* GET /api/v1/buku — filter, urutkan, paging                          */
/* ================================================================== */
const cariSemua = async ({ keyword, kategori, sort, order, limit, offset }) => {
  const kondisi = [];
  const nilai = [];

  if (keyword) {
    const k = `%${keyword.toLowerCase()}%`;
    kondisi.push("(LOWER(judul) LIKE ? OR LOWER(penulis) LIKE ?)");
    nilai.push(k, k);
  }

  if (kategori) {
    kondisi.push("kategori = ?");
    nilai.push(kategori);
  }

  const whereSql = kondisi.length ? `WHERE ${kondisi.join(" AND ")}` : "";

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM buku ${whereSql}`,
    nilai
  );

  const kolomSort = KOLOM_SORT_BOLEH.includes(sort) ? sort : "id";
  const arahSort = order === "desc" ? "DESC" : "ASC";

  const off = Number(offset) || 0;
  const lim = Number(limit) || 0;

  let sql = `SELECT ${KOLOM_RINGKAS} FROM buku ${whereSql} ORDER BY ${kolomSort} ${arahSort}`;
  const params = [...nilai];

  if (lim > 0) {
    sql += " LIMIT ? OFFSET ?";
    params.push(lim, off);
  } else if (off > 0) {
    // MySQL tidak mengenal "OFFSET tanpa LIMIT". Trik resminya (ada di
    // dokumentasi MySQL): pakai angka LIMIT sebesar mungkin. Ini yang
    // membuat perilakunya sama dengan `.slice(off)` versi Minggu 2.
    sql += " LIMIT 18446744073709551615 OFFSET ?";
    params.push(off);
  }

  const [data] = await pool.query(sql, params);
  return { total, data };
};

/* ================================================================== */
/* GET /api/v1/buku/statistik                                          */
/* ================================================================== */
const statistik = async () => {
  const [[ringkasan]] = await pool.query(
    `SELECT
       COUNT(*)                    AS total_judul,
       COALESCE(SUM(stok), 0)      AS total_stok,
       COALESCE(SUM(stok = 0), 0)  AS judul_stok_habis
     FROM buku`
  );

  const [baris] = await pool.query(
    "SELECT kategori, COUNT(*) AS jumlah FROM buku GROUP BY kategori"
  );
  const per_kategori = {};
  baris.forEach((b) => {
    per_kategori[b.kategori] = b.jumlah;
  });

  const [[termahal]] = await pool.query(
    `SELECT ${KOLOM_RINGKAS} FROM buku ORDER BY harga DESC LIMIT 1`
  );

  return {
    total_judul: ringkasan.total_judul,
    total_stok: Number(ringkasan.total_stok),
    judul_stok_habis: Number(ringkasan.judul_stok_habis),
    per_kategori,
    termahal: termahal || null,
  };
};

/* ================================================================== */
/* GET /api/v1/buku/:bukuId  DAN  GET /api/v1/buku/:bukuId/karakter*    */
/*                                                                     */
/* Satu fungsi, dipakai untuk KEDUANYA — persis seperti Minggu 2, di   */
/* mana controller getKarakter juga memanggil cariBuku() lalu membaca  */
/* buku.karakter. Bedanya cuma "buku.karakter" sekarang hasil JOIN,    */
/* bukan properti array yang sudah menempel dari awal.                 */
/* ================================================================== */
const cariId = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${KOLOM_LENGKAP} FROM buku WHERE id = ?`,
    [Number(id)]
  );
  const buku = rows[0];
  if (!buku) return null;

  const [karakter] = await pool.query(
    "SELECT id, nama, peran FROM karakter WHERE buku_id = ? ORDER BY id",
    [Number(id)]
  );

  return { ...buku, karakter };
};

/* ================================================================== */
/* Dipakai storeBuku() untuk aturan bisnis "judul tidak boleh kembar". */
/* ================================================================== */
const cariByJudul = async (judul) => {
  const [rows] = await pool.query(
    "SELECT id, judul FROM buku WHERE LOWER(judul) = LOWER(?)",
    [judul]
  );
  return rows[0] || null;
};

/* ================================================================== */
/* POST /api/v1/buku                                                   */
/* ================================================================== */
const simpan = async (value) => {
  const [hasil] = await pool.query(
    `INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [value.judul, value.penulis, value.tahun_terbit, value.harga, value.stok, value.kategori]
  );
  return hasil.insertId; // AUTO_INCREMENT — MySQL yang menentukan id, bukan Math.max() manual
};

/* ================================================================== */
/* PUT /api/v1/buku/:bukuId — ganti seluruh kolom                      */
/* ================================================================== */
const ganti = async (id, value) => {
  await pool.query(
    `UPDATE buku
        SET judul = ?, penulis = ?, tahun_terbit = ?, harga = ?, stok = ?, kategori = ?
      WHERE id = ?`,
    [value.judul, value.penulis, value.tahun_terbit, value.harga, value.stok, value.kategori, Number(id)]
  );
};

/* ================================================================== */
/* PATCH /api/v1/buku/:bukuId — ganti sebagian kolom                   */
/*                                                                     */
/* `value` di sini sudah difilter oleh validate.js dan HANYA berisi    */
/* field yang memang ada aturannya di aturanBuku (lihat controller).   */
/* Karena itu nama kolom di `Object.keys(value)` aman ditempel langsung */
/* ke SQL: sumbernya whitelist kita sendiri, bukan req.body mentah.    */
/* ================================================================== */
const ubahSebagian = async (id, value) => {
  const kolom = Object.keys(value);
  if (kolom.length === 0) return;

  const setSql = kolom.map((k) => `${k} = ?`).join(", ");
  const params = kolom.map((k) => value[k]);
  params.push(Number(id));

  await pool.query(`UPDATE buku SET ${setSql} WHERE id = ?`, params);
};

/* ================================================================== */
/* DELETE /api/v1/buku/:bukuId                                         */
/*                                                                     */
/* Baris di tabel `karakter` milik buku ini TIDAK dihapus manual di    */
/* sini. Lihat ON DELETE CASCADE di sql/schema.sql — itu tugas MySQL.  */
/* ================================================================== */
const hapus = async (id) => {
  const [hasil] = await pool.query("DELETE FROM buku WHERE id = ?", [Number(id)]);
  return hasil.affectedRows > 0;
};

module.exports = {
  cariSemua,
  statistik,
  cariId,
  cariByJudul,
  simpan,
  ganti,
  ubahSebagian,
  hapus,
};
