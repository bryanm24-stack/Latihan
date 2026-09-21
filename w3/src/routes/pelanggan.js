const express = require("express");
const router = express.Router();

const asyncHandler = require("../utils/asyncHandler");
const methodNotAllowed = require("../middlewares/methodNotAllowed");

const {
  queryPelanggan,
  getSinglePelanggan,
  storePelanggan,
  deletePelanggan,
} = require("../controllers/pelanggan");

router
  .route("/")
  .get(asyncHandler(queryPelanggan))
  .post(asyncHandler(storePelanggan))
  .all(methodNotAllowed("GET", "POST"));

router
  .route("/:id")
  .get(asyncHandler(getSinglePelanggan))
  .delete(asyncHandler(deletePelanggan))
  .all(methodNotAllowed("GET", "DELETE"));

module.exports = router;    