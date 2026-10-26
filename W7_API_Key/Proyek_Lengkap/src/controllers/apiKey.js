// BRYAN: JWT mengelola key, API key mengakses layanan partner.
const { Pengguna, sequelize } = require("../models");
const { createApiKey, hashApiKey } = require("../utils/apiKey");
const { subscriptionMe, effectiveSubscription } = require("../services/billing");
const { databaseNow } = require("../services/clock");
const { snapshot } = require("../services/apiUsage");
const issue = (replace) => async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const user = await Pengguna.unscoped().findByPk(req.pengguna.id, {
      transaction, lock: transaction.LOCK.UPDATE });
    if (!user) return { status: 404, body: { code: "USER_NOT_FOUND" } };
    if (!replace && user.api_key) return { status: 409, body: {
      code: "KEY_ALREADY_EXISTS", msg: "Gunakan regenerate untuk mengganti key." } };
    await effectiveSubscription(user, await databaseNow(transaction), transaction);
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
  const state = await subscriptionMe(user.id);
  if (!state) return res.status(404).json({ code: "USER_NOT_FOUND" });
  const usage = await snapshot(user.id);
  const plan = state.plan;
  return res.set("Cache-Control", "no-store").json({ pengguna_id: user.id,
    has_api_key: Boolean(user.api_key), api_level: state.api_level, plan, subscription: state.subscription,
    usage: { ...usage, timezone: "UTC", dailyRemaining: Math.max(0, plan.dailyLimit - usage.daily),
      minuteRemaining: Math.max(0, plan.minuteLimit - usage.minute) } });
};
// Jalur lama dinonaktifkan agar pembelian tidak dapat dilewati.
const setLevel = (req, res) => res.status(410).json({ code: "DIRECT_UPGRADE_DISABLED",
  msg: "Gunakan checkout dan konfirmasi pembayaran simulasi. Paket tidak lagi diubah langsung." });
module.exports = { generate, regenerate, me, setLevel };
