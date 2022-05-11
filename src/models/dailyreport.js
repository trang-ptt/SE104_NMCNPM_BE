'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DailyReports extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      DailyReports.hasMany(models.Bills, { foreignKey: 'dailyRpID' });
      DailyReports.belongsTo(models.SalesReports);
    }
  };
  DailyReports.init({
    reportID: DataTypes.INTEGER,
    date: DataTypes.DATE,
    revenue: DataTypes.BIGINT,
    billCount: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'DailyReports',
  });
  return DailyReports;
};