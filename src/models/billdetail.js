'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BillDetails extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  BillDetails.init({
    billID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    itemID: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    number: DataTypes.INTEGER,
    noteItem: DataTypes.STRING,
    currentprice: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'BillDetails',
  });
  return BillDetails;
};