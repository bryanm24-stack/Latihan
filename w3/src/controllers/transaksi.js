const repoTransaksi = require("../data/transaksi");
const validate = require("../utils/validate");

const DENDA_PER_HARI = 50000;

const aturanTransaksi = {
  kendaraan_id: {
    type: "number",
    required: true,
    integer: true,
    min: 1,
    label: "Kendaraan",
  },

  pelanggan_id: {
    type: "number",
    required: true,
    integer: true,
    min: 1,
    label: "Pelanggan",
  },

  tanggal_sewa: {
    type: "string",
    required: true,
    label: "Tanggal sewa",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    patternMsg: "Tanggal sewa harus berformat YYYY-MM-DD",
  },

  tanggal_rencana_kembali: {
    type: "string",
    required: true,
    label: "Tanggal rencana kembali",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    patternMsg:
      "Tanggal rencana kembali harus berformat YYYY-MM-DD",
  },
};

const aturanPengembalian = {
  tanggal_kembali: {
    type: "string",
    required: true,
    label: "Tanggal kembali",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    patternMsg:
      "Tanggal kembali harus berformat YYYY-MM-DD",
  },
};

const parseTanggal = (value) => {
  const tanggal = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(tanggal.getTime())) {
    return null;
  }

  const hasil = tanggal.toISOString().slice(0, 10);

  if (hasil !== value) {
    return null;
  }

  return tanggal;
};

const formatTanggalDb = (value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const selisihHari = (awal, akhir) => {
  const msPerHari = 1000 * 60 * 60 * 24;

  return Math.round(
    (akhir.getTime() - awal.getTime()) / msPerHari
  );
};

const queryTransaksi = async (req, res) => {
  const {
    status,
    kendaraan_id,
    pelanggan_id,
  } = req.query;

  const data = await repoTransaksi.cariSemua({
    status,
    kendaraan_id,
    pelanggan_id,
  });

  return res.status(200).json({
    total: data.length,
    data,
  });
};

const statistikTransaksi = async (req, res) => {
  const hasil = await repoTransaksi.statistik();

  return res.status(200).json(hasil);
};

const getSingleTransaksi = async (req, res) => {
  const transaksi = await repoTransaksi.cariId(
    req.params.id
  );

  if (!transaksi) {
    return res.status(404).json({
      msg: `Transaksi dengan id ${req.params.id} tidak ditemukan`,
    });
  }

  return res.status(200).json(transaksi);
};

const storeTransaksi = async (req, res) => {
  const { valid, errors, value } = validate(
    req.body,
    aturanTransaksi
  );

  if (!valid) {
    return res.status(400).json({
      msg: "Validasi gagal",
      errors,
    });
  }

  const mulai = parseTanggal(value.tanggal_sewa);
  const rencana = parseTanggal(
    value.tanggal_rencana_kembali
  );

  if (!mulai || !rencana) {
    return res.status(400).json({
      msg: "Format tanggal tidak valid",
    });
  }

  if (rencana <= mulai) {
    return res.status(400).json({
      msg:
        "Tanggal rencana kembali harus setelah tanggal sewa",
    });
  }

  const hasil = await repoTransaksi.buatSewa(value);

  if (
    !hasil.berhasil &&
    hasil.alasan === "kendaraan_tidak_ada"
  ) {
    return res.status(404).json({
      msg: "Kendaraan tidak ditemukan",
    });
  }

  if (
    !hasil.berhasil &&
    hasil.alasan === "pelanggan_tidak_ada"
  ) {
    return res.status(404).json({
      msg: "Pelanggan tidak ditemukan",
    });
  }

  if (
    !hasil.berhasil &&
    hasil.alasan === "kendaraan_tidak_tersedia"
  ) {
    return res.status(409).json({
      msg: "Kendaraan sedang tidak tersedia untuk disewa",
    });
  }

  const transaksiBaru =
    await repoTransaksi.cariId(hasil.id);

  return res
    .status(201)
    .location(`/api/v1/transaksi/${hasil.id}`)
    .json(transaksiBaru);
};

const kembalikanTransaksi = async (req, res) => {
  const { id } = req.params;

  const { valid, errors, value } = validate(
    req.body,
    aturanPengembalian
  );

  if (!valid) {
    return res.status(400).json({
      msg: "Validasi gagal",
      errors,
    });
  }

  const transaksi = await repoTransaksi.cariId(id);

  if (!transaksi) {
    return res.status(404).json({
      msg: `Transaksi dengan id ${id} tidak ditemukan`,
    });
  }

  if (transaksi.status !== "berjalan") {
    return res.status(409).json({
      msg: "Transaksi sudah selesai atau dibatalkan",
    });
  }

  const tanggalSewa = parseTanggal(
    formatTanggalDb(transaksi.tanggal_sewa)
  );

  const tanggalRencana = parseTanggal(
    formatTanggalDb(
      transaksi.tanggal_rencana_kembali
    )
  );

  const tanggalKembali = parseTanggal(
    value.tanggal_kembali
  );

  if (
    !tanggalSewa ||
    !tanggalRencana ||
    !tanggalKembali
  ) {
    return res.status(400).json({
      msg: "Format tanggal tidak valid",
    });
  }

  if (tanggalKembali < tanggalSewa) {
    return res.status(400).json({
      msg:
        "Tanggal kembali tidak boleh sebelum tanggal sewa",
    });
  }

  const lamaSewa = Math.max(
    1,
    selisihHari(tanggalSewa, tanggalKembali)
  );

  const hariTerlambat = Math.max(
    0,
    selisihHari(tanggalRencana, tanggalKembali)
  );

  const biayaSewa =
    lamaSewa * Number(transaksi.tarif_per_hari);

  const denda =
    hariTerlambat * DENDA_PER_HARI;

  const totalBiaya = biayaSewa + denda;

  const hasil = await repoTransaksi.selesaikan(
    id,
    {
      tanggal_kembali: value.tanggal_kembali,
      total_biaya: totalBiaya,
      denda,
    }
  );

  if (!hasil.berhasil) {
    if (hasil.alasan === "tidak_ada") {
      return res.status(404).json({
        msg: `Transaksi dengan id ${id} tidak ditemukan`,
      });
    }

    return res.status(409).json({
      msg: "Transaksi sudah selesai atau dibatalkan",
    });
  }

  const transaksiTerbaru =
    await repoTransaksi.cariId(id);

  return res.status(200).json(transaksiTerbaru);
};

const batalkanTransaksi = async (req, res) => {
  const { id } = req.params;

  const hasil = await repoTransaksi.batalkan(id);

  if (!hasil.berhasil) {
    if (hasil.alasan === "tidak_ada") {
      return res.status(404).json({
        msg: `Transaksi dengan id ${id} tidak ditemukan`,
      });
    }

    return res.status(409).json({
      msg: "Transaksi sudah selesai atau dibatalkan",
    });
  }

  const transaksiTerbaru =
    await repoTransaksi.cariId(id);

  return res.status(200).json(transaksiTerbaru);
};

module.exports = {
  queryTransaksi,
  statistikTransaksi,
  getSingleTransaksi,
  storeTransaksi,
  kembalikanTransaksi,
  batalkanTransaksi,
};