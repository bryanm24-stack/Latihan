/**
 * Dipasang PALING BAWAH di index.js.
 * Kalau request sampai ke sini, artinya tidak ada satu pun route yang cocok.
 *
 * Tanpa ini Express mengirim halaman HTML "Cannot GET /xxx".
 * Untuk sebuah API itu salah: consumer kita adalah program, bukan browser.
 * Program mengharapkan JSON, bukan HTML.
 */
const notFound = (req, res) => {
  return res.status(404).json({
    msg: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
};

module.exports = notFound;
