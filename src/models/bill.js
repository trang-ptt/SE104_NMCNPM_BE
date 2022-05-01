'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bill extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Bill.init({
    userID: DataTypes.INTEGER,
    restaurantID: DataTypes.INTEGER,
    date: DataTypes.DATE,
    total: DataTypes.INTEGER,
    ship: DataTypes.INTEGER,
    payment: DataTypes.INTEGER,
    billstatus: DataTypes.INTEGER,
    deliAddress: DataTypes.STRING,
    deliPhoneNumber: DataTypes.STRING,
    note: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Bills',
  });
  return Bill;
};