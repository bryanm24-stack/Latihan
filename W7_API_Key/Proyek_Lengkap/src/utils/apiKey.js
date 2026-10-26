const crypto = require("node:crypto");
// Key baru memiliki 256 bit acak. Database hanya menyimpan SHA-256.
const createApiKey = () =>
  `bd_live_${crypto.randomBytes(32).toString("hex")}`;
const hashApiKey = (rawKey) =>
  crypto.createHash("sha256").update(rawKey).digest("hex");
// UUID lama W7 tetap bisa dipakai setelah db:upgrade meng-hash nilainya.
const isApiKey = (value) => typeof value === "string" &&
  /^(bd_live_[a-f0-9]{64}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(value);
module.exports = { createApiKey, hashApiKey, isApiKey };
