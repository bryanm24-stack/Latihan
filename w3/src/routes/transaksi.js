const express = require("express");
const router = express.Router();

const asyncHandler = require("../utils/asyncHandler");
const methodNotAllowed = require("../middlewares/methodNotAllowed");

const {
  queryTransaksi,
  statistikTransaksi,
  getSingleTransaksi,
  storeTransaksi,
  kembalikanTransaksi,
  batalkanTransaksi,
} = require("../controllers/transaksi");

router
  .route("/")
  .get(asyncHandler(queryTransaksi))
  .post(asyncHandler(storeTransaksi))
  .all(methodNotAllowed("GET", "POST"));

router
  .route("/statistik")
  .get(asyncHandler(statistikTransaksi))
  .all(methodNotAllowed("GET"));

router
  .route("/:id/pengembalian")
  .post(asyncHandler(kembalikanTransaksi))
  .all(methodNotAllowed("POST"));

router
  .route("/:id/pembatalan")
  .post(asyncHandler(batalkanTransaksi))
  .all(methodNotAllowed("POST"));

router
  .route("/:id")
  .get(asyncHandler(getSingleTransaksi))
  .all(methodNotAllowed("GET"));

module.exports = router;