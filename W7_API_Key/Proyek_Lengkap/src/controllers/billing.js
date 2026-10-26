const { API_PLANS } = require('../config/apiPlans');
const billing = require('../services/billing');
const allowedObject = (body, keys) => body && typeof body === 'object' && !Array.isArray(body) &&
  Object.keys(body).every(key => keys.includes(key));
const invalid = (res, code, msg) => res.status(400).json({ code, msg });
const send = (res, result) => res.set('Cache-Control','no-store').status(result.status).json(result.body);
const parseId = value => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const isAdmin = req => String(req.pengguna.roles || '').split(',').includes('admin');

const plans = (req, res) => res.json({
  currency: 'IDR', payment_mode: 'simulation', auto_renew: false,
  data: Object.entries(API_PLANS).map(([id, plan]) => ({ id, name: plan.name, price: plan.price,
    currency: plan.currency, duration_days: plan.billingDays, daily_limit: plan.dailyLimit,
    minute_limit: plan.minuteLimit, features: plan.features, requires_checkout: id !== 'basic' })),
  msg: 'Basic gratis tanpa batas masa aktif. Premium Rp99.000 per 30 hari. Pembayaran dikonfirmasi admin sebagai simulasi.',
});
const checkout = async (req, res) => {
  if (!allowedObject(req.body, ['plan']) || req.body.plan !== 'premium') {
    return invalid(res,'INVALID_CHECKOUT','Kirim hanya {"plan":"premium"}. Basic gratis tanpa checkout. Harga ditentukan server.');
  }
  const key = req.get('Idempotency-Key');
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
    return invalid(res,'INVALID_IDEMPOTENCY_KEY','Header Idempotency-Key wajib, 8–100 karakter huruf/angka/underscore/strip. Gunakan key yang sama untuk mengulang checkout yang sama.');
  }
  return send(res, await billing.checkout(req.pengguna.id, req.body.plan, key));
};
const me = async (req, res) => {
  const state = await billing.subscriptionMe(req.pengguna.id);
  if (!state) return res.status(404).json({ code: 'USER_NOT_FOUND' });
  return send(res, { status: 200, body: state });
};
const payment = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return invalid(res,'INVALID_PAYMENT_ID','ID pembayaran harus bilangan bulat positif.');
  const row = await billing.getPayment(id, req.pengguna.id, isAdmin(req));
  return send(res, row ? { status: 200, body: { payment: row, payment_mode: 'simulation' } } :
    { status: 404, body: { code: 'PAYMENT_NOT_FOUND' } });
};
const list = (admin = false) => async (req, res) => {
  if (Object.keys(req.query).some(key => !['page','limit'].includes(key))) return invalid(res,'INVALID_PAGING','Gunakan page dan limit saja.');
  const page = req.query.page === undefined ? 1 : parseId(req.query.page);
  const limit = req.query.limit === undefined ? 20 : parseId(req.query.limit);
  if (!page || !limit || limit > 100 || (page - 1) * limit > 1000000) return invalid(res,'INVALID_PAGING','page harus positif dan limit 1–100.');
  return send(res, { status: 200, body: await billing.listPayments(admin ? null : req.pengguna.id, page, limit, admin) });
};
const confirm = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return invalid(res,'INVALID_PAYMENT_ID','ID pembayaran harus bilangan bulat positif.');
  if (!allowedObject(req.body, ['simulation']) || req.body.simulation !== true) {
    return invalid(res,'SIMULATION_ACK_REQUIRED','Kirim {"simulation":true}. Endpoint ini tidak memindahkan uang sungguhan.');
  }
  return send(res, await billing.confirmPayment(id, req.pengguna.id));
};
const cancel = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return invalid(res,'INVALID_PAYMENT_ID','ID pembayaran harus bilangan bulat positif.');
  if (req.body !== undefined && !allowedObject(req.body, [])) return invalid(res,'INVALID_CANCEL_INPUT','Pembatalan tidak menerima field tambahan.');
  return send(res, await billing.cancelPayment(id, req.pengguna.id));
};
module.exports = { plans, checkout, me, payment, myPayments: list(), pendingPayments: list(true), confirm, cancel };
