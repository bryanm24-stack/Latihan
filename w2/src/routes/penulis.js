const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");
const {
  getPenulis,
  getSinglePenulis,
  getBukuPenulis,
  storeDataPenulis,
  updatePenulis,
  patchPenulis,
  deletePenulis
} = require("../controllers/penulis");

router
  .route("/")
  .get(getPenulis)
  .post(storeDataPenulis)
  .all(methodNotAllowed("GET", "POST"));

router
  .route("/:id")
  .get(getSinglePenulis)
  .put(updatePenulis)
  .patch(patchPenulis)
  .delete(deletePenulis)
  .all(methodNotAllowed("GET", "PUT", "PATCH", "DELETE"));

router
  .route("/:id/buku")
  .get(getBukuPenulis)
  .all(methodNotAllowed("GET"));

module.exports = router;