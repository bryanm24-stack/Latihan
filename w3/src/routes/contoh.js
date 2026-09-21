const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");

const {
  contohQuery,
  contohParams,
  contohPost,
  contohGabungan,
  contohArrayFunction,
} = require("../controllers/contoh");

// Route spesifik dulu, sebelum yang berparameter. Lihat catatan di routes/buku.js.
router
  .route("/array-function")
  .get(contohArrayFunction)
  .all(methodNotAllowed("GET"));

// Satu URL, dua method, dua fungsi berbeda.
router.route("/").get(contohQuery).post(contohPost).all(methodNotAllowed("GET", "POST"));

router
  .route("/gabungan/:id")
  .put(contohGabungan)
  .post(contohGabungan)
  .all(methodNotAllowed("PUT", "POST"));

// :jk? opsional -> boleh /jojo/umur/40/jk/L atau /jojo/umur/40/jk
router
  .route("/:nama/umur/:umur/jk/:jk?")
  .get(contohParams)
  .all(methodNotAllowed("GET"));

module.exports = router;
