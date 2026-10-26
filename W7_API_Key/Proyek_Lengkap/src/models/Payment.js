const { Model } = require('sequelize');
module.exports = (sequelize, D) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Pengguna, { foreignKey: 'pengguna_id', as: 'pelanggan' });
    }
  }
  Payment.init({
    id: { type: D.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    invoice_no: { type: D.STRING(50), allowNull: false, unique: true },
    pengguna_id: { type: D.INTEGER.UNSIGNED, allowNull: false },
    plan: { type: D.STRING(50), allowNull: false },
    amount: { type: D.INTEGER.UNSIGNED, allowNull: false },
    currency: { type: D.STRING(3), allowNull: false },
    billing_days: { type: D.SMALLINT.UNSIGNED, allowNull: false },
    checkout_key: { type: D.STRING(100), allowNull: false },
    status: { type: D.ENUM('pending','paid','cancelled','expired'), defaultValue: 'pending' },
    expires_at: { type: D.DATE(3), allowNull: false },
    paid_at: D.DATE(3), confirmed_by: D.INTEGER.UNSIGNED,
    period_start: D.DATE(3), period_end: D.DATE(3),
  }, { sequelize, modelName: 'Payment', tableName: 'payments', timestamps: true,
    indexes: [{ unique: true, fields: ['pengguna_id','checkout_key'] }] });
  return Payment;
};
