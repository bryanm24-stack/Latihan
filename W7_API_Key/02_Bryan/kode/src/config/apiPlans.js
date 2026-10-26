// BRYAN: satu sumber aturan paket. Harga merupakan simulasi praktikum.
const API_PLANS = Object.freeze({
  basic: Object.freeze({ name: "Basic", priceMonthly: 0, dailyLimit: 100,
    minuteLimit: 10, features: ["ringkasan"] }),
  premium: Object.freeze({ name: "Premium", priceMonthly: 99000, dailyLimit: 10000,
    minuteLimit: 100, features: ["ringkasan", "analitik"] }),
});
module.exports = { API_PLANS };
