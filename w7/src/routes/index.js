/**
 * Satu pintu ekspor untuk semua router.
 * Tanpa file ini, index.js penuh require satu per satu.
 */
const contohRouter = require("./contoh");
const bukuRouter = require("./buku");
const axiosRouter = require("./contohAxios");
const authRouter = require("./auth");
const penggunaRouter = require("./pengguna");

module.exports = {
  contohRouter,
  bukuRouter,
  axiosRouter,
  authRouter,
  penggunaRouter,
};
