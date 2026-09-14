/**
 * ERROR HANDLER
 *
 * Express mengenali sebuah middleware sebagai error handler
 * HANYA kalau parameternya ada EMPAT: (err, req, res, next).
 * Hilangkan satu saja, Express memperlakukannya sebagai middleware biasa
 * dan error kalian tidak akan pernah sampai ke sini.
 *
 * Dipasang paling bawah, setelah notFound.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Detail lengkap masuk ke LOG KITA
  console.error("[ERROR]", err.stack || err.message);

  // Body JSON yang rusak ditangkap express.json() dan dilempar ke sini
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ msg: "Body bukan JSON yang valid" });
  }

  // Pesan ke CLIENT sengaja generik.
  // Jangan pernah mengirim err.stack ke client: itu membocorkan
  // struktur folder, versi library, dan kadang isi variabel.
  return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
};

module.exports = errorHandler;
