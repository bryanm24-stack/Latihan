const repoKendaraan = require("../data/kendaraan");
const validate = require("../utils/validate");

const aturanKendaraan = {
  nama: {
    type: "string",
    required: true,
    label: "Nama kendaraan",
    minLength: 2,
    maxLength: 100,
  },

  jenis: {
    type: "enum",
    required: true,
    label: "Jenis kendaraan",
    values: ["motor", "mobil"],
  },

  plat_nomor: {
    type: "string",
    required: true,
    label: "Plat nomor",
    minLength: 3,
    maxLength: 20,
  },

  tarif_per_hari: {
    type: "number",
    required: true,
    label: "Tarif per hari",
    integer: true,
    min: 1,
  },
};

const queryKendaraan = async (req, res) => {
  const { status, jenis } = req.query;

  const data = await repoKendaraan.cariSemua({
    status,
    jenis,
  });

  return res.status(200).json({
    total: data.length,
    data,
  });
};

const getSingleKendaraan = async (req, res) => {
  const kendaraan = await repoKendaraan.cariId(req.params.id);

  if (!kendaraan) {
    return res.status(404).json({
      msg: `Kendaraan dengan id ${req.params.id} tidak ditemukan`,
    });
  }

  return res.status(200).json(kendaraan);
};

const storeKendaraan = async (req, res) => {
  const { valid, errors, value } = validate(
    req.body,
    aturanKendaraan
  );

  if (!valid) {
    return res.status(400).json({
      msg: "Validasi gagal",
      errors,
    });
  }

  const kembar = await repoKendaraan.cariByPlat(
    value.plat_nomor
  );

  if (kembar) {
    return res.status(409).json({
      msg: `Plat nomor "${value.plat_nomor}" sudah terdaftar`,
    });
  }

  const idBaru = await repoKendaraan.simpan(value);
  const kendaraanBaru = await repoKendaraan.cariId(idBaru);

  return res
    .status(201)
    .location(`/api/v1/kendaraan/${idBaru}`)
    .json(kendaraanBaru);
};

const patchKendaraan = async (req, res) => {
  const { id } = req.params;

  const kendaraan = await repoKendaraan.cariId(id);

  if (!kendaraan) {
    return res.status(404).json({
      msg: `Kendaraan dengan id ${id} tidak ditemukan`,
    });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      msg: "Tidak ada field yang dikirim untuk diubah",
    });
  }

  const aturanParsial = {};

  for (const [field, rule] of Object.entries(
    aturanKendaraan
  )) {
    if (field in req.body) {
      aturanParsial[field] = {
        ...rule,
        required: false,
      };
    }
  }

  if (Object.keys(aturanParsial).length === 0) {
    return res.status(400).json({
      msg: "Tidak ada field yang bisa diubah",
    });
  }

  const { valid, errors, value } = validate(
    req.body,
    aturanParsial
  );

  if (!valid) {
    return res.status(400).json({
      msg: "Validasi gagal",
      errors,
    });
  }

  if (value.plat_nomor) {
    const kembar = await repoKendaraan.cariByPlat(
      value.plat_nomor
    );

    if (kembar && Number(kembar.id) !== Number(id)) {
      return res.status(409).json({
        msg: `Plat nomor "${value.plat_nomor}" sudah terdaftar`,
      });
    }
  }

  await repoKendaraan.ubahSebagian(id, value);

  const terbaru = await repoKendaraan.cariId(id);

  return res.status(200).json(terbaru);
};

const deleteKendaraan = async (req, res) => {
  const { id } = req.params;

  const kendaraan = await repoKendaraan.cariId(id);

  if (!kendaraan) {
    return res.status(404).json({
      msg: `Kendaraan dengan id ${id} tidak ditemukan`,
    });
  }

  if (kendaraan.status === "disewa") {
    return res.status(409).json({
      msg: "Kendaraan yang sedang disewa tidak dapat dihapus",
    });
  }

  await repoKendaraan.hapus(id);

  return res.status(200).json({
    msg: `Kendaraan "${kendaraan.nama}" telah dihapus`,
  });
};

module.exports = {
  queryKendaraan,
  getSingleKendaraan,
  storeKendaraan,
  patchKendaraan,
  deleteKendaraan,
};