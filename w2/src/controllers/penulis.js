const storePenulis = require("../data/penulis");
const storeBuku = require("../data/buku");
const validate = require("../utils/validate");

const aturanPenulis = {
  nama: { type: "string", required: true, label: "Nama penulis", minLength: 3, maxLength: 100 },
  negara: { type: "string", required: true, label: "Negara" },
  tahun_lahir: { type: "number", required: true, integer: true, label: "Tahun lahir", min: 1800, max: 2026 }
};

const cariPenulis = (id) => storePenulis.penulis.find((p) => p.id === Number(id));

const getPenulis = (req, res) => {
  const { keyword, negara, limit, offset } = req.query;
  let hasil = [...storePenulis.penulis];

  if (keyword) {
    const k = keyword.toLowerCase();
    hasil = hasil.filter((p) => p.nama.toLowerCase().includes(k));
  }
  if (negara) {
    const n = negara.toLowerCase();
    hasil = hasil.filter((p) => p.negara.toLowerCase() === n);
  }

  const total = hasil.length;
  const off = Number(offset) || 0;
  const lim = Number(limit) || 0;
  hasil = lim === 0 ? hasil.slice(off) : hasil.slice(off, off + lim);

  return res.status(200).json({ total, limit: lim, offset: off, data: hasil });
};

const getSinglePenulis = (req, res) => {
  const penulis = cariPenulis(req.params.id);
  if (!penulis) return res.status(404).json({ msg: `Penulis dengan id ${req.params.id} tidak ditemukan` });
  return res.status(200).json(penulis);
};

const getBukuPenulis = (req, res) => {
  const penulis = cariPenulis(req.params.id);
  if (!penulis) return res.status(404).json({ msg: `Penulis dengan id ${req.params.id} tidak ditemukan` });

  const bukuKarya = storeBuku.buku.filter((b) => b.penulis === penulis.nama);
  return res.status(200).json({ total: bukuKarya.length, data: bukuKarya });
};

const storeDataPenulis = (req, res) => {
  const { valid, errors, value } = validate(req.body, aturanPenulis);
  if (!valid) return res.status(400).json({ msg: "Validasi gagal", errors });

  const kembar = storePenulis.penulis.find((p) => p.nama.toLowerCase() === value.nama.toLowerCase());
  if (kembar) return res.status(409).json({ msg: `Penulis "${value.nama}" sudah terdaftar` });

  const idBaru = storePenulis.penulis.length === 0 ? 1 : Math.max(...storePenulis.penulis.map((p) => p.id)) + 1;
  const penulisBaru = { id: idBaru, ...value };

  storePenulis.penulis.push(penulisBaru);
  return res.status(201).location(`/api/v1/penulis/${idBaru}`).json(penulisBaru);
};

const updatePenulis = (req, res) => {
  const { id } = req.params;
  const penulis = cariPenulis(id);
  if (!penulis) return res.status(404).json({ msg: `Penulis dengan id ${id} tidak ditemukan` });

  const { valid, errors, value } = validate(req.body, aturanPenulis);
  if (!valid) return res.status(400).json({ msg: "Validasi gagal", errors });

  const index = storePenulis.penulis.findIndex((p) => p.id === Number(id));
  storePenulis.penulis[index] = { id: penulis.id, ...value };
  return res.status(200).json(storePenulis.penulis[index]);
};

const patchPenulis = (req, res) => {
  const { id } = req.params;
  const penulis = cariPenulis(id);
  if (!penulis) return res.status(404).json({ msg: `Penulis dengan id ${id} tidak ditemukan` });

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ msg: "Tidak ada field yang dikirim untuk diubah" });
  }

  const aturanParsial = {};
  for (const [field, rule] of Object.entries(aturanPenulis)) {
    if (field in req.body) {
      aturanParsial[field] = { ...rule, required: false };
    }
  }

  if (Object.keys(aturanParsial).length === 0) {
    return res.status(400).json({ msg: "Tidak ada field yang bisa diubah pada request ini" });
  }

  const { valid, errors, value } = validate(req.body, aturanParsial);
  if (!valid) return res.status(400).json({ msg: "Validasi gagal", errors });

  const index = storePenulis.penulis.findIndex((p) => p.id === Number(id));
  storePenulis.penulis[index] = { ...penulis, ...value };
  return res.status(200).json(storePenulis.penulis[index]);
};

const deletePenulis = (req, res) => {
  const { id } = req.params;
  const penulis = cariPenulis(id);
  if (!penulis) return res.status(404).json({ msg: `Penulis dengan id ${id} tidak ditemukan` });

  const punyaBuku = storeBuku.buku.some((b) => b.penulis === penulis.nama);
  if (punyaBuku) return res.status(409).json({ msg: "Penulis yang masih memiliki buku tidak boleh dihapus" });

  storePenulis.penulis = storePenulis.penulis.filter((p) => p.id !== Number(id));
  return res.status(200).json({ msg: `Penulis "${penulis.nama}" telah dihapus` });
};

module.exports = {
  getPenulis,
  getSinglePenulis,
  getBukuPenulis,
  storeDataPenulis,
  updatePenulis,
  patchPenulis,
  deletePenulis
};