"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Users.belongsTo(models.Allcodes, {
        foreignKey: "roleID",
        targetKey: "key",
        as: "roleData",
      });
      Users.hasMany(models.Staffs, { foreignKey: "userID" });
      Users.hasMany(models.Bills, { foreignKey: "userID" });
      Users.hasMany(models.Addresses, { foreignKey: "userID" });
    }
  }
  Users.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      email: DataTypes.STRING,
      name: DataTypes.STRING,
      dob: DataTypes.DATE,
      phoneNumber: DataTypes.STRING,
      address: DataTypes.STRING,
      gender: DataTypes.STRING,
      roleID: DataTypes.INTEGER,
      avatar: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Users",
    }
  );
  return Users;
};
