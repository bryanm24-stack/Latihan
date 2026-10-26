const { Model } = require('sequelize');
module.exports = (sequelize, D) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.Pengguna, { foreignKey: 'pengguna_id', as: 'pelanggan' });
    }
  }
  Subscription.init({
    id: { type: D.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    pengguna_id: { type: D.INTEGER.UNSIGNED, allowNull: false, unique: true },
    plan: { type: D.STRING(50), allowNull: false, defaultValue: 'premium' },
    status: { type: D.ENUM('active','expired'), allowNull: false, defaultValue: 'active' },
    starts_at: { type: D.DATE(3), allowNull: false },
    ends_at: { type: D.DATE(3), allowNull: false },
    source: { type: D.ENUM('payment','legacy_migration'), defaultValue: 'payment', allowNull: false },
  }, { sequelize, modelName: 'Subscription', tableName: 'subscriptions', timestamps: true });
  return Subscription;
};
