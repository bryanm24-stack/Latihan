/**
 * Data untuk LATIHAN 6 — sudah dipindah ke MySQL, mengikuti pola
 * yang SAMA PERSIS dengan src/data/buku.js: setiap fungsi bicara ke
 * database lewat placeholder `?`, tidak pernah menempel nilai user
 * langsung ke string SQL.
 *
 * Yang BELUM dibuat sengaja: controllers/penulis.js dan routes/penulis.js.
 * Itu tugas kalian di Latihan 6. Tabelnya sudah ada (lihat sql/schema.sql),
 * datanya sudah terisi (lihat sql/seed.sql) — tinggal bangun lapisan HTTP-nya,
 * dengan meniru controllers/buku.js dan routes/buku.js.
 */
const { pool } = require("../config/database");

const cariSemua = async () => {
  const [rows] = await pool.query(
    "SELECT id, nama, negara, tahun_lahir FROM penulis ORDER BY id"
  );
  return rows;
};

const cariId = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, nama, negara, tahun_lahir FROM penulis WHERE id = ?",
    [Number(id)]
  );
  return rows[0] || null;
};

const simpan = async (value) => {
  const [hasil] = await pool.query(
    "INSERT INTO penulis (nama, negara, tahun_lahir) VALUES (?, ?, ?)",
    [value.nama, value.negara, value.tahun_lahir]
  );
  return hasil.insertId;
};

const ganti = async (id, value) => {
  await pool.query(
    "UPDATE penulis SET nama = ?, negara = ?, tahun_lahir = ? WHERE id = ?",
    [value.nama, value.negara, value.tahun_lahir, Number(id)]
  );
};

const hapus = async (id) => {
  const [hasil] = await pool.query("DELETE FROM penulis WHERE id = ?", [Number(id)]);
  return hasil.affectedRows > 0;
};

module.exports = { cariSemua, cariId, simpan, ganti, hapus };
