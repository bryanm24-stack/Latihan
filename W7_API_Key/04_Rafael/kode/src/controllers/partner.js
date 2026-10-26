// RAFAEL: hasil dihitung dari data buku W7 yang sesungguhnya.
const { Op } = require("sequelize");
const { Buku, sequelize } = require("../models");
const ringkasan = async (req, res) => {
  const [row] = await Buku.findAll({ attributes: [
    [sequelize.fn("COUNT", sequelize.col("id")), "total_judul"],
    [sequelize.fn("SUM", sequelize.col("stok")), "total_stok"],
    [sequelize.fn("AVG", sequelize.col("harga")), "rata_rata_harga"],
  ], raw: true });
  return res.json({ data: { total_judul: Number(row.total_judul), total_stok: Number(row.total_stok || 0),
    rata_rata_harga: Math.round(Number(row.rata_rata_harga || 0)) } });
};
const analitik = async (req, res) => {
  const kategori = await Buku.findAll({ attributes: ["kategori",
    [sequelize.fn("COUNT", sequelize.col("id")), "total_judul"],
    [sequelize.fn("SUM", sequelize.col("stok")), "total_stok"],
  ], group: ["kategori"], order: [["kategori", "ASC"]], raw: true });
  const stokRendah = await Buku.findAll({ where: { stok: { [Op.lte]: 5 } },
    attributes: ["id", "judul", "stok"], order: [["stok", "ASC"], ["id", "ASC"]] });
  return res.json({ data: { kategori: kategori.map((r) => ({ ...r,
    total_judul: Number(r.total_judul), total_stok: Number(r.total_stok) })),
    stok_rendah: stokRendah, ambang_stok_rendah: 5 } });
};
module.exports = { ringkasan, analitik };
