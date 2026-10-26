// BRYAN: JWT mengelola key, API key mengakses layanan partner.
const { Pengguna, sequelize } = require("../models");
const { API_PLANS } = require("../config/apiPlans");
const { createApiKey, hashApiKey } = require("../utils/apiKey");
const { snapshot } = require("../services/apiUsage");
const issue = (replace) => async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const user = await Pengguna.unscoped().findByPk(req.pengguna.id, {
      transaction, lock: transaction.LOCK.UPDATE });
    if (!user) return { status: 404, body: { code: "USER_NOT_FOUND" } };
    if (!replace && user.api_key) return { status: 409, body: {
      code: "KEY_ALREADY_EXISTS", msg: "Gunakan regenerate untuk mengganti key." } };
    const rawKey = createApiKey();
    await user.update({ api_key: hashApiKey(rawKey) }, { transaction });
    return { status: replace ? 200 : 201, body: { api_key: rawKey, api_level: user.api_level,
      msg: "Simpan key ini. Server hanya menampilkan key asli pada respons penerbitan." } };
  });
  res.set("Cache-Control", "no-store");
  return res.status(result.status).json(result.body);
};
const generate = issue(false);
const regenerate = issue(true);
const me = async (req, res) => {
  const user = await Pengguna.unscoped().findByPk(req.pengguna.id,
    { attributes: ["id", "api_level", "api_key"] });
  if (!user) return res.status(404).json({ code: "USER_NOT_FOUND" });
  const usage = await snapshot(user.id);
  const plan = API_PLANS[user.api_level];
  return res.set("Cache-Control", "no-store").json({ pengguna_id: user.id,
    has_api_key: Boolean(user.api_key), api_level: user.api_level, plan,
    usage: { ...usage, timezone: "UTC", dailyRemaining: Math.max(0, plan.dailyLimit - usage.daily),
      minuteRemaining: Math.max(0, plan.minuteLimit - usage.minute) } });
};
const setLevel = async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  if (!Number.isSafeInteger(id) || id <= 0 || typeof body.api_level !== "string" ||
      !Object.hasOwn(API_PLANS, body.api_level) ||
      Object.keys(body).some((k) => k !== "api_level")) {
    return res.status(400).json({ code: "INVALID_PLAN_INPUT", msg: "Kirim api_level basic atau premium." });
  }
  const user = await Pengguna.findByPk(id);
  if (!user) return res.status(404).json({ code: "USER_NOT_FOUND" });
  await user.update({ api_level: body.api_level });
  return res.json({ pengguna_id: user.id, api_level: user.api_level,
    msg: "Paket diperbarui oleh admin (simulasi pembayaran, tanpa tagihan otomatis)." });
};
module.exports = { generate, regenerate, me, setLevel };
