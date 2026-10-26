// BRYAN: checkout dan konfirmasi simulasi. Semua nominal berasal dari server.
const crypto = require('node:crypto');
const { Transaction } = require('sequelize');
const { sequelize, Pengguna, Payment, Subscription } = require('../models');
const { API_PLANS } = require('../config/apiPlans');
const { databaseNow } = require('./clock');
const DAY_MS = 86400000;
const failure = (status, code, msg) => ({ status, body: { code, msg } });
const txOptions = { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED };

function paymentView(row) {
  const fields = ['id','invoice_no','pengguna_id','plan','amount','currency','billing_days',
    'status','expires_at','paid_at','confirmed_by','period_start','period_end','createdAt'];
  return Object.fromEntries(fields.map(key => [key, row[key]]));
}

// DANA: api_level adalah cache. Subscription aktif adalah sumber hak akses.
async function effectiveSubscription(user, now, transaction) {
  const subscription = await Subscription.findOne({ where: { pengguna_id: user.id }, transaction });
  const active = Boolean(subscription && subscription.status === 'active' &&
    +subscription.starts_at <= +now && +subscription.ends_at > +now);
  const level = active ? 'premium' : 'basic';
  if (subscription && subscription.status === 'active' && +subscription.ends_at <= +now) {
    await subscription.update({ status: 'expired' }, { transaction });
  }
  if (user.api_level !== level) await user.update({ api_level: level }, { transaction });
  return {
    api_level: level, plan: API_PLANS[level],
    subscription: subscription ? {
      id: subscription.id, plan: subscription.plan, status: active ? 'active' : 'expired',
      starts_at: subscription.starts_at, ends_at: subscription.ends_at, source: subscription.source,
      remaining_seconds: active ? Math.max(0, Math.floor((+subscription.ends_at - +now) / 1000)) : 0,
    } : { status: 'none', plan: 'basic', starts_at: null, ends_at: null, remaining_seconds: 0 },
    server_time: now.toISOString(), payment_mode: 'simulation', auto_renew: false,
  };
}

async function subscriptionMe(userId) {
  return sequelize.transaction(txOptions, async transaction => {
    const user = await Pengguna.unscoped().findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) return null;
    return effectiveSubscription(user, await databaseNow(transaction), transaction);
  });
}

async function expirePayment(payment, now, transaction) {
  if (payment.status === 'pending' && +payment.expires_at <= +now) {
    await payment.update({ status: 'expired' }, { transaction });
  }
}

async function checkout(userId, planName, checkoutKey) {
  const plan = API_PLANS[planName];
  return sequelize.transaction(txOptions, async transaction => {
    const user = await Pengguna.unscoped().findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) return failure(404, 'USER_NOT_FOUND');
    const now = await databaseNow(transaction);
    const previous = await Payment.findOne({ where: { pengguna_id: userId, checkout_key: checkoutKey }, transaction });
    if (previous) {
      if (previous.plan !== planName) return failure(409, 'IDEMPOTENCY_CONFLICT');
      await expirePayment(previous, now, transaction);
      return { status: 200, body: { payment: paymentView(previous), replayed: true,
        payment_mode: 'simulation', msg: 'Checkout yang sama tidak membuat invoice baru.' } };
    }
    const payment = await Payment.create({
      invoice_no: `INV-${now.toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      pengguna_id: userId, plan: planName, amount: plan.price, currency: plan.currency,
      billing_days: plan.billingDays, checkout_key: checkoutKey, status: 'pending',
      expires_at: new Date(+now + DAY_MS),
    }, { transaction });
    return { status: 201, body: { payment: paymentView(payment), replayed: false,
      payment_mode: 'simulation', msg: 'Invoice pending berlaku 24 jam. Admin mengonfirmasi pembayaran simulasi. Tidak ada uang sungguhan yang ditagihkan.' } };
  });
}

async function getPayment(id, requesterId, isAdmin = false) {
  return sequelize.transaction(txOptions, async transaction => {
    const payment = await Payment.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment || (!isAdmin && Number(payment.pengguna_id) !== Number(requesterId))) return null;
    await expirePayment(payment, await databaseNow(transaction), transaction);
    return paymentView(payment);
  });
}

async function listPayments(userId, page, limit, pendingOnly = false) {
  const { Op } = require('sequelize');
  const where = userId ? { pengguna_id: userId } : {};
  const now = await databaseNow();
  await Payment.update({ status: 'expired' }, { where: { ...where, status: 'pending', expires_at: { [Op.lte]: now } } });
  if (pendingOnly) where.status = 'pending';
  const result = await Payment.findAndCountAll({ where, limit, offset: (page - 1) * limit, order: [['id','DESC']] });
  return { data: result.rows.map(paymentView), total: result.count, page, limit, payment_mode: 'simulation' };
}

async function changePayment(id, actorId, confirm) {
  const seed = await Payment.findByPk(id, { attributes: ['id','pengguna_id'] });
  if (!seed || (!confirm && Number(seed.pengguna_id) !== Number(actorId))) return failure(404, 'PAYMENT_NOT_FOUND');
  // Satu urutan lock di seluruh jalur: pengguna dahulu, kemudian invoice.
  return sequelize.transaction(txOptions, async transaction => {
    const user = await Pengguna.unscoped().findByPk(seed.pengguna_id, { transaction, lock: transaction.LOCK.UPDATE });
    const payment = await Payment.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user || !payment) return failure(404, 'PAYMENT_NOT_FOUND');
    const now = await databaseNow(transaction);
    await expirePayment(payment, now, transaction);
    if (confirm && payment.status === 'paid') {
      const state = await effectiveSubscription(user, now, transaction);
      return { status: 200, body: { payment: paymentView(payment), ...state, replayed: true,
        msg: 'Invoice sudah dibayar. Konfirmasi ulang tidak menambah masa aktif.' } };
    }
    if (!confirm && payment.status === 'cancelled') {
      return { status: 200, body: { payment: paymentView(payment), replayed: true } };
    }
    if (payment.status !== 'pending') return failure(409, 'PAYMENT_NOT_PENDING', `Invoice berstatus ${payment.status}.`);
    if (!confirm) {
      await payment.update({ status: 'cancelled' }, { transaction });
      return { status: 200, body: { payment: paymentView(payment), replayed: false } };
    }
    const current = await Subscription.findOne({ where: { pengguna_id: user.id }, transaction });
    const stillActive = current && current.status === 'active' && +current.starts_at <= +now && +current.ends_at > +now;
    const periodStart = stillActive ? current.ends_at : now;
    const periodEnd = new Date(+periodStart + payment.billing_days * DAY_MS);
    const values = { plan: payment.plan, status: 'active',
      starts_at: stillActive ? current.starts_at : now, ends_at: periodEnd, source: 'payment' };
    if (current) await current.update(values, { transaction });
    else await Subscription.create({ pengguna_id: user.id, ...values }, { transaction });
    await payment.update({ status: 'paid', paid_at: now, confirmed_by: actorId,
      period_start: periodStart, period_end: periodEnd }, { transaction });
    const state = await effectiveSubscription(user, now, transaction);
    return { status: 200, body: { payment: paymentView(payment), ...state, replayed: false,
      msg: 'Pembayaran simulasi dikonfirmasi. Premium aktif atau diperpanjang 30 hari. Tidak ada debit uang sungguhan.' } };
  });
}

module.exports = { effectiveSubscription, subscriptionMe, checkout, getPayment, listPayments,
  confirmPayment: (id, actorId) => changePayment(id, actorId, true),
  cancelPayment: (id, actorId) => changePayment(id, actorId, false) };
