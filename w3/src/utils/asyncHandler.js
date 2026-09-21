/**
 * ASYNC HANDLER — kenapa ini perlu di Minggu 3 dan tidak perlu di Minggu 2
 * =========================================================================
 *
 * Minggu 2, controller tidak pernah `throw`. Semua kegagalan (404, 400, 409)
 * dikembalikan lewat `return res.status(...).json(...)`, bukan lewat error.
 *
 * Minggu 3, controller memanggil MySQL lewat `await`. Kalau MySQL mati,
 * query salah, atau koneksi putus di tengah jalan, `mysql2` melempar
 * EXCEPTION. Masalahnya: Express 4 TIDAK TAHU cara menangkap exception
 * yang terjadi di dalam fungsi `async`. Tanpa penanganan tambahan,
 * error itu menjadi "UnhandledPromiseRejection" dan request menggantung
 * tanpa response sampai client timeout sendiri.
 *
 * Solusi manualnya, di SETIAP controller:
 *
 *     const getSingleBuku = async (req, res, next) => {
 *       try {
 *         const buku = await repoBuku.cariId(req.params.bukuId);
 *         ...
 *       } catch (err) {
 *         next(err); // lempar ke errorHandler.js
 *       }
 *     };
 *
 * Delapan controller di buku.js, delapan try/catch yang isinya SAMA PERSIS.
 * Itu pengulangan murni — dan pengulangan murni cocoknya dibungkus fungsi.
 *
 * `asyncHandler` melakukan try/catch itu SEKALI, di sini, lalu dipakai
 * ulang dengan membungkus setiap controller di file routes:
 *
 *     router.route("/:bukuId").get(asyncHandler(getSingleBuku));
 *
 * Cara kerjanya: controller async SELALU mengembalikan sebuah Promise
 * (itu aturan JavaScript, bukan pilihan). Kalau Promise itu gagal
 * (rejected), `.catch(next)` menangkapnya dan meneruskannya ke
 * errorHandler.js — persis seperti try/catch manual, tanpa menuliskannya
 * berkali-kali.
 *
 * Express 5 mengerjakan ini otomatis untuk semua route. Project ini
 * sengaja memakai Express 4 (lihat catatan di routes/buku.js), jadi
 * pembungkus ini yang menggantikannya secara eksplisit.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
