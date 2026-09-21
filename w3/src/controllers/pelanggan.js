const repoPelanggan = require("../data/pelanggan");
const validate = require("../utils/validate");

const aturanPelanggan = {
  nama: {
    type: "string",
    required: true,
    label: "Nama",
    minLength: 2,
    maxLength: 100,
  },

  no_ktp: {
    type: "string",
    required: true,
    label: "Nomor KTP",
    minLength: 16,
    maxLength: 30,
  },

  no_hp: {
    type: "string",
    required: true,
    label: "Nomor HP",
    minLength: 8,
    maxLength: 20,
  },
};

const queryPelanggan = async (req, res) => {
  const data = await repoPelanggan.cariSemua();

  return res.status(200).json({
    total: data.length,
    data,
  });
};

const getSinglePelanggan = async (req, res) => {
  const pelanggan = await repoPelanggan.cariId(
    req.params.id
  );

  if (!pelanggan) {
    return res.status(404).json({
      msg: `Pelanggan dengan id ${req.params.id} tidak ditemukan`,
    });
  }

  return res.status(200).json(pelanggan);
};

const storePelanggan = async (req, res) => {
  const { valid, errors, value } = validate(
    req.body,
    aturanPelanggan
  );

  if (!valid) {
    return res.status(400).json({
      msg: "Validasi gagal",
      errors,
    });
  }

  const kembar = await repoPelanggan.cariByKtp(
    value.no_ktp
  );

  if (kembar) {
    return res.status(409).json({
      msg: `Nomor KTP "${value.no_ktp}" sudah terdaftar`,
    });
  }

  const idBaru = await repoPelanggan.simpan(value);
  const pelangganBaru =
    await repoPelanggan.cariId(idBaru);

  return res
    .status(201)
    .location(`/api/v1/pelanggan/${idBaru}`)
    .json(pelangganBaru);
};

const deletePelanggan = async (req, res) => {
  const { id } = req.params;

  const pelanggan = await repoPelanggan.cariId(id);

  if (!pelanggan) {
    return res.status(404).json({
      msg: `Pelanggan dengan id ${id} tidak ditemukan`,
    });
  }

  const masihAktif =
    await repoPelanggan.punyaTransaksiAktif(id);

  if (masihAktif) {
    return res.status(409).json({
      msg: "Pelanggan masih memiliki transaksi berjalan",
    });
  }

  await repoPelanggan.hapus(id);

  return res.status(200).json({
    msg: `Pelanggan "${pelanggan.nama}" telah dihapus`,
  });
};

module.exports = {
  queryPelanggan,
  getSinglePelanggan,
  storePelanggan,
  deletePelanggan,
};