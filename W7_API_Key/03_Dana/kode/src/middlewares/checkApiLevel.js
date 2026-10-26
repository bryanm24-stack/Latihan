const { API_PLANS } = require("../config/apiPlans");
module.exports = (feature) => (req, res, next) => {
  const plan = API_PLANS[req.apiClient.level];
  if (!plan || !plan.features.includes(feature)) {
    return res.status(403).json({ code: "PLAN_FORBIDDEN", msg: "Fitur memerlukan paket Premium." });
  }
  req.apiFeature = feature;
  next();
};
