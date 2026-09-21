const { pool } = require("../config/database");

const cariSemua = async ({
  status,
  kendaraan_id,
  pelanggan_id,
}) => {
  const kondisi = [];
  const nilai = [];

  if (status) {
    kondisi.push("t.status = ?");
    nilai.push(status);
  }

  if (kendaraan_id) {
    kondisi.push("t.kendaraan_id = ?");
    nilai.push(Number(kendaraan_id));
  }

  if (pelanggan_id) {
    kondisi.push("t.pelanggan_id = ?");
    nilai.push(Number(pelanggan_id));
  }

  const whereSql = kondisi.length
    ? `WHERE ${kondisi.join(" AND ")}`
    : "";

  const [rows] = await pool.query(
    `SELECT
       t.id,
       t.kendaraan_id,
       k.nama AS kendaraan,
       k.plat_nomor,
       t.pelanggan_id,
       p.nama AS pelanggan,
       t.tanggal_sewa,
       t.tanggal_rencana_kembali,
       t.tanggal_kembali,
       t.total_biaya,
       t.denda,
       t.status
     FROM transaksi t
     LEFT JOIN kendaraan k
       ON k.id = t.kendaraan_id
     LEFT JOIN pelanggan p
       ON p.id = t.pelanggan_id
     ${whereSql}
     ORDER BY t.id`,
    nilai
  );

  return rows;
};

const cariId = async (id) => {
  const [rows] = await pool.query(
    `SELECT
       t.id,
       t.kendaraan_id,
       k.nama AS kendaraan,
       k.plat_nomor,
       k.tarif_per_hari,
       t.pelanggan_id,
       p.nama AS pelanggan,
       t.tanggal_sewa,
       t.tanggal_rencana_kembali,
       t.tanggal_kembali,
       t.total_biaya,
       t.denda,
       t.status
     FROM transaksi t
     LEFT JOIN kendaraan k
       ON k.id = t.kendaraan_id
     LEFT JOIN pelanggan p
       ON p.id = t.pelanggan_id
     WHERE t.id = ?`,
    [Number(id)]
  );

  return rows[0] || null;
};

const buatSewa = async (value) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [kendaraanRows] = await connection.query(
      `SELECT id, status
       FROM kendaraan
       WHERE id = ?
       FOR UPDATE`,
      [Number(value.kendaraan_id)]
    );

    const kendaraan = kendaraanRows[0];

    if (!kendaraan) {
      await connection.rollback();

      return {
        berhasil: false,
        alasan: "kendaraan_tidak_ada",
      };
    }

    if (kendaraan.status !== "tersedia") {
      await connection.rollback();

      return {
        berhasil: false,
        alasan: "kendaraan_tidak_tersedia",
      };
    }

    const [pelangganRows] = await connection.query(
      `SELECT id
       FROM pelanggan
       WHERE id = ?`,
      [Number(value.pelanggan_id)]
    );

    if (!pelangganRows[0]) {
      await connection.rollback();

      return {
        berhasil: false,
        alasan: "pelanggan_tidak_ada",
      };
    }

    const [hasil] = await connection.query(
      `INSERT INTO transaksi (
         kendaraan_id,
         pelanggan_id,
         tanggal_sewa,
         tanggal_rencana_kembali,
         tanggal_kembali,
         total_biaya,
         denda,
         status
       )
       VALUES (?, ?, ?, ?, NULL, NULL, 0, 'berjalan')`,
      [
        Number(value.kendaraan_id),
        Number(value.pelanggan_id),
        value.tanggal_sewa,
        value.tanggal_rencana_kembali,
      ]
    );

    await connection.query(
      `UPDATE kendaraan
       SET status = 'disewa'
       WHERE id = ?`,
      [Number(value.kendaraan_id)]
    );

    await connection.commit();

    return {
      berhasil: true,
      id: hasil.insertId,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const selesaikan = async (
  id,
  {
    tanggal_kembali,
    total_biaya,
    denda,
  }
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, kendaraan_id, status
       FROM transaksi
       WHERE id = ?
       FOR UPDATE`,
      [Number(id)]
    );

    const transaksi = rows[0];

    if (!transaksi) {
      await connection.rollback();

      return {
        berhasil: false,
        alasan: "tidak_ada",
      };
    }

    if (transaksi.status !== "berjalan") {
      await connection.rollback();

      return {
        berhasil: false,
        alasan: "sudah_diproses",
      };
    }

    await connection.query(
      `UPDATE transaksi
       SET
         tanggal_kembali = ?,
         total_biaya = ?,
         denda = ?,
         status = 'selesai'
       WHERE id = ?`,
      [
        tanggal_kembali,
        total_biaya,
        denda,
        Number(id),
      ]
    );

    await connection.query(
      `UPDATE kendaraan
       SET status = 'tersedia'
       WHERE id = ?`,
      [transaksi.kendaraan_id]
    );

    await connection.commit();

    return {
      berhasil: true,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const batalkan = async (id) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, kendaraan_id, status
       FROM transaksi
       WHERE id = ?
       FOR UPDATE`,
      [Number(id)]
    );

    const transaksi = rows[0];

    if (!transaksi) {
      await connection.rollback();

      return {
        berhasil: false,
        alasan: "tidak_ada",
      };
    }

    if (transaksi.status !== "berjalan") {
      await connection.rollback();

      return {
        berhasil: false,
        alasan: "sudah_diproses",
      };
    }

    await connection.query(
      `UPDATE transaksi
       SET status = 'dibatalkan'
       WHERE id = ?`,
      [Number(id)]
    );

    await connection.query(
      `UPDATE kendaraan
       SET status = 'tersedia'
       WHERE id = ?`,
      [transaksi.kendaraan_id]
    );

    await connection.commit();

    return {
      berhasil: true,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const statistik = async () => {
  const [statusRows] = await pool.query(
    `SELECT status, COUNT(*) AS jumlah
     FROM transaksi
     GROUP BY status`
  );

  const per_status = {
    berjalan: 0,
    selesai: 0,
    dibatalkan: 0,
  };

  for (const row of statusRows) {
    per_status[row.status] = Number(row.jumlah);
  }

  const [[pendapatan]] = await pool.query(
    `SELECT
       COALESCE(SUM(total_biaya), 0) AS total_pendapatan
     FROM transaksi
     WHERE status = 'selesai'`
  );

  return {
    per_status,
    total_pendapatan: Number(
      pendapatan.total_pendapatan
    ),
  };
};

module.exports = {
  cariSemua,
  cariId,
  buatSewa,
  selesaikan,
  batalkan,
  statistik,
};