// DANA: kuota per PENGGUNA, sehingga regenerasi key tidak mereset penggunaan.
const { Op, Transaction } = require("sequelize");
const { sequelize, Pengguna, ApiLog } = require("../models");
const { databaseNow } = require("./clock");
const { effectiveSubscription } = require("./billing");
const { API_PLANS } = require("../config/apiPlans");
function windows(now) {
  const day = new Date(now); day.setUTCHours(0, 0, 0, 0);
  const minute = new Date(now); minute.setUTCSeconds(0, 0);
  return { day, minute, dayReset: new Date(+day + 86400000),
    minuteReset: new Date(+minute + 60000) };
}
async function counts(penggunaId, range, transaction) {
  const daily = await ApiLog.count({ where: { pengguna_id: penggunaId,
    createdAt: { [Op.gte]: range.day } }, transaction });
  const minute = await ApiLog.count({ where: { pengguna_id: penggunaId,
    createdAt: { [Op.gte]: range.minute } }, transaction });
  return { daily, minute };
}
async function snapshot(penggunaId, transaction) {
  const now = await databaseNow(transaction);
  const range = windows(now);
  return { ...(await counts(penggunaId, range, transaction)),
    dailyResetAt: range.dayReset.toISOString(), minuteResetAt: range.minuteReset.toISOString() };
}
async function reserveUsage(penggunaId, keyHash, feature, endpoint, method) {
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    async (transaction) => {
      // Lock satu akun: dua request bersamaan tidak bisa mengambil slot terakhir.
      const user = await Pengguna.unscoped().findByPk(penggunaId, {
        transaction, lock: transaction.LOCK.UPDATE });
      // Cek ulang setelah lock untuk menangani rotasi key / perubahan paket.
      if (!user || user.api_key !== keyHash) return { error: 401, code: "INVALID_API_KEY" };
      const now = await databaseNow(transaction);
      const state = await effectiveSubscription(user, now, transaction);
      const plan = API_PLANS[state.api_level];
      if (!plan || !plan.features.includes(feature)) return { error: 403, code: "PLAN_FORBIDDEN" };
      const range = windows(now);
      const used = await counts(user.id, range, transaction);
      if (used.daily >= plan.dailyLimit) return { error: 429, code: "DAILY_QUOTA_EXCEEDED",
        retryAfter: Math.max(1, Math.ceil((range.dayReset - now) / 1000)) };
      if (used.minute >= plan.minuteLimit) return { error: 429, code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.max(1, Math.ceil((range.minuteReset - now) / 1000)) };
      // Reservasi tercatat SEBELUM controller berjalan, dalam transaksi yang sama.
      const log = await ApiLog.create({ pengguna_id: user.id, endpoint, http_method: method,
        createdAt: now }, { transaction });
      return { logId: log.id, level: user.api_level, dailyRemaining: plan.dailyLimit - used.daily - 1,
        minuteRemaining: plan.minuteLimit - used.minute - 1 };
    });
}
module.exports = { windows, snapshot, reserveUsage };
