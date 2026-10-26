/**
 * Satu pintu ekspor untuk semua router.
 * Tanpa file ini, index.js penuh require satu per satu.
 */
const contohRouter = require("./contoh");
const bukuRouter = require("./buku");
const axiosRouter = require("./contohAxios");
const authRouter = require("./auth");
const penggunaRouter = require("./pengguna");
const apiKeyRouter = require("./apiKey");
const partnerRouter = require("./partner");
const { plansRouter, subscriptionRouter, paymentRouter } = require("./billing");

module.exports = {
  contohRouter,
  bukuRouter,
  axiosRouter,
  authRouter,
  penggunaRouter,
  apiKeyRouter,
  partnerRouter,
  plansRouter,
  subscriptionRouter,
  paymentRouter,
};
