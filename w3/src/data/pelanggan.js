const { pool } = require("../config/database");

const cariSemua = async () => {
  const [rows] = await pool.query(
    `SELECT id, nama, no_ktp, no_hp
     FROM pelanggan
     ORDER BY id`
  );

  return rows;
};

const cariId = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, nama, no_ktp, no_hp
     FROM pelanggan
     WHERE id = ?`,
    [Number(id)]
  );

  return rows[0] || null;
};

const cariByKtp = async (noKtp) => {
  const [rows] = await pool.query(
    `SELECT id, no_ktp
     FROM pelanggan
     WHERE no_ktp = ?`,
    [noKtp]
  );

  return rows[0] || null;
};

const simpan = async (value) => {
  const [hasil] = await pool.query(
    `INSERT INTO pelanggan
      (nama, no_ktp, no_hp)
     VALUES (?, ?, ?)`,
    [
      value.nama,
      value.no_ktp,
      value.no_hp,
    ]
  );

  return hasil.insertId;
};

const punyaTransaksiAktif = async (pelangganId) => {
  const [rows] = await pool.query(
    `SELECT id
     FROM transaksi
     WHERE pelanggan_id = ?
       AND status = 'berjalan'
     LIMIT 1`,
    [Number(pelangganId)]
  );

  return rows.length > 0;
};

const hapus = async (id) => {
  const [hasil] = await pool.query(
    "DELETE FROM pelanggan WHERE id = ?",
    [Number(id)]
  );

  return hasil.affectedRows > 0;
};

module.exports = {
  cariSemua,
  cariId,
  cariByKtp,
  simpan,
  punyaTransaksiAktif,
  hapus,
};