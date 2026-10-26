const { Pengguna } = require("../models");
const { subscriptionMe } = require("../services/billing");
const { hashApiKey, isApiKey } = require("../utils/apiKey");
module.exports = async (req, res, next) => {
  const rawKey = req.get("X-API-Key");
  if (!isApiKey(rawKey)) return res.status(401).json({ code: "INVALID_API_KEY" });
  const keyHash = hashApiKey(rawKey);
  const user = await Pengguna.unscoped().findOne({ where: { api_key: keyHash },
    attributes: ["id", "api_level"] });
  if (!user) return res.status(401).json({ code: "INVALID_API_KEY" });
  const state = await subscriptionMe(user.id);
  if (!state) return res.status(401).json({ code: "INVALID_API_KEY" });
  req.apiClient = { id: user.id, level: state.api_level, keyHash };
  next();
};
