const { reserveUsage } = require("../services/apiUsage");
const { ApiLog } = require("../models");
module.exports = async (req, res, next) => {
  // Jangan menyimpan query string, header, atau raw key pada log.
  const result = await reserveUsage(req.apiClient.id, req.apiClient.keyHash, req.apiFeature,
    `${req.baseUrl}${req.path}`.slice(0, 255), req.method);
  if (result.error) {
    if (result.retryAfter) res.set("Retry-After", String(result.retryAfter));
    return res.status(result.error).json({ code: result.code });
  }
  res.set({ "X-API-Level": result.level, "X-Daily-Remaining": String(result.dailyRemaining),
    "X-RateLimit-Remaining": String(result.minuteRemaining) });
  // finish: respons selesai. close: koneksi terputus sebelum respons selesai.
  let recorded = false;
  const record = (status) => {
    if (recorded) return;
    recorded = true;
    ApiLog.update({ status_code: status }, { where: { id: result.logId } })
      .catch(() => console.error("[API_LOG] Status respons gagal diperbarui"));
  };
  res.once("finish", () => record(res.statusCode));
  res.once("close", () => record(res.writableFinished ? res.statusCode : 499));
  next();
};
