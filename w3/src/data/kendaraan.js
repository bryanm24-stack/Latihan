const { pool } = require("../config/database");

const cariSemua = async ({ status, jenis }) => {
  const kondisi = [];
  const nilai = [];

  if (status) {
    kondisi.push("status = ?");
    nilai.push(status);
  }

  if (jenis) {
    kondisi.push("jenis = ?");
    nilai.push(jenis);
  }

  const whereSql = kondisi.length
    ? `WHERE ${kondisi.join(" AND ")}`
    : "";

  const [rows] = await pool.query(
    `SELECT id, nama, jenis, plat_nomor, tarif_per_hari, status
     FROM kendaraan
     ${whereSql}
     ORDER BY id`,
    nilai
  );

  return rows;
};

const cariId = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, nama, jenis, plat_nomor, tarif_per_hari, status
     FROM kendaraan
     WHERE id = ?`,
    [Number(id)]
  );

  return rows[0] || null;
};

const cariByPlat = async (platNomor) => {
  const [rows] = await pool.query(
    `SELECT id, plat_nomor
     FROM kendaraan
     WHERE LOWER(plat_nomor) = LOWER(?)`,
    [platNomor]
  );

  return rows[0] || null;
};

const simpan = async (value) => {
  const [hasil] = await pool.query(
    `INSERT INTO kendaraan
      (nama, jenis, plat_nomor, tarif_per_hari, status)
     VALUES (?, ?, ?, ?, 'tersedia')`,
    [
      value.nama,
      value.jenis,
      value.plat_nomor,
      value.tarif_per_hari,
    ]
  );

  return hasil.insertId;
};

const ubahSebagian = async (id, value) => {
  const kolomBoleh = [
    "nama",
    "jenis",
    "plat_nomor",
    "tarif_per_hari",
  ];

  const kolom = Object.keys(value).filter((k) =>
    kolomBoleh.includes(k)
  );

  if (kolom.length === 0) return;

  const setSql = kolom
    .map((kolom) => `${kolom} = ?`)
    .join(", ");

  const params = kolom.map((kolom) => value[kolom]);
  params.push(Number(id));

  await pool.query(
    `UPDATE kendaraan
     SET ${setSql}
     WHERE id = ?`,
    params
  );
};

const hapus = async (id) => {
  const [hasil] = await pool.query(
    "DELETE FROM kendaraan WHERE id = ?",
    [Number(id)]
  );

  return hasil.affectedRows > 0;
};

module.exports = {
  cariSemua,
  cariId,
  cariByPlat,
  simpan,
  ubahSebagian,
  hapus,
};