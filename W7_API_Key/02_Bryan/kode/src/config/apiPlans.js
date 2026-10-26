// BRYAN: harga server, masa aktif 30 hari, dan batas paket.
const API_PLANS = Object.freeze({
  basic: Object.freeze({ name: "Basic", price: 0, currency: "IDR", billingDays: null, dailyLimit: 100,
    minuteLimit: 10, features: Object.freeze(["ringkasan"]) }),
  premium: Object.freeze({ name: "Premium", price: 99000, currency: "IDR", billingDays: 30, dailyLimit: 10000,
    minuteLimit: 100, features: Object.freeze(["ringkasan", "analitik"]) }),
});
module.exports = { API_PLANS };
