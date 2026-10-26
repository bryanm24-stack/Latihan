const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
async function databaseNow(transaction) {
  const [row] = await sequelize.query('SELECT UTC_TIMESTAMP(3) AS now', {
    type: QueryTypes.SELECT, transaction,
  });
  return new Date(row.now);
}
module.exports = { databaseNow };
