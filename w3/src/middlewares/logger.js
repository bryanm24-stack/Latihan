/**
 * Middleware paling sederhana yang bisa dibuat.
 * Tiga parameter: (req, res, next).
 *
 * Aturan mutlak middleware:
 *   - panggil next()          -> lanjut ke middleware/controller berikutnya
 *   - atau kirim response     -> rantai berhenti di sini
 *   - kalau tidak dua-duanya  -> request menggantung selamanya
 */
const logger = (req, res, next) => {
  const mulai = Date.now();

  // res.on("finish") berjalan SETELAH response terkirim,
  // jadi di sini kita sudah tahu status code-nya.
  res.on("finish", () => {
    const durasi = Date.now() - mulai;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durasi}ms)`);
  });

  next();
};

module.exports = logger;
