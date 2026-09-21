const express = require("express");
const router = express.Router();

const asyncHandler = require("../utils/asyncHandler");
const methodNotAllowed = require("../middlewares/methodNotAllowed");

const {
  queryKendaraan,
  getSingleKendaraan,
  storeKendaraan,
  patchKendaraan,
  deleteKendaraan,
} = require("../controllers/kendaraan");

router
  .route("/")
  .get(asyncHandler(queryKendaraan))
  .post(asyncHandler(storeKendaraan))
  .all(methodNotAllowed("GET", "POST"));

router
  .route("/:id")
  .get(asyncHandler(getSingleKendaraan))
  .patch(asyncHandler(patchKendaraan))
  .delete(asyncHandler(deleteKendaraan))
  .all(methodNotAllowed("GET", "PATCH", "DELETE"));

module.exports = router;