const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ApiLog extends Model {
    static associate(models) {
      ApiLog.belongsTo(models.Pengguna, { foreignKey: "pengguna_id", as: "pengguna" });
    }
  }
  ApiLog.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    pengguna_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    endpoint: { type: DataTypes.STRING(255), allowNull: false },
    http_method: { type: DataTypes.STRING(10), allowNull: false },
    status_code: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW },
  }, { sequelize, modelName: "ApiLog", tableName: "api_log", timestamps: true,
    createdAt: "createdAt", updatedAt: false,
    indexes: [{ fields: ["pengguna_id", "createdAt"] }] });
  return ApiLog;
};
