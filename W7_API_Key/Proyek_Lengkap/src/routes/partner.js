const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const verifyApiKey = require("../middlewares/verifyApiKey");
const checkApiLevel = require("../middlewares/checkApiLevel");
const limitApiUsage = require("../middlewares/limitApiUsage");
const { ringkasan, analitik } = require("../controllers/partner");
// Cek fitur SEBELUM reservasi. Penolakan 401/403/429 tidak menghabiskan kuota.
router.get("/ringkasan", asyncHandler(verifyApiKey), checkApiLevel("ringkasan"),
  asyncHandler(limitApiUsage), asyncHandler(ringkasan));
router.get("/analitik", asyncHandler(verifyApiKey), checkApiLevel("analitik"),
  asyncHandler(limitApiUsage), asyncHandler(analitik));
module.exports = router;
