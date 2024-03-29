import { Op, QueryTypes } from "sequelize";
import db, { Sequelize, sequelize } from "../models/index";

let createBill = (uid) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.Users.findOne({
        where: { id: uid },
      });
      if (!user)
        resolve({
          errCode: 1,
          errMessage: "User's not exist",
        });
      let checkBillExist = await db.Bills.findOne({
        where: {
          userID: uid,
          billstatus: 0,
        },
      });
      if (checkBillExist) {
        resolve({
          errCode: 2,
          errMessage: "Bill existed as draft",
        });
      } else {
        let bill = await db.Bills.create({
          userID: uid,
          // restaurantID: data.restaurantID,
          // dailyRpID: dailyRpCheck.id,
          total: 1,
          ship: 1,
          billstatus: 0,
        });
        resolve(bill);
      }
    } catch (e) {
      reject(e);
    }
  });
};
let addItemToCart = (uid, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!uid || !data.itemID || !data.number)
        resolve({
          errCode: 2,
          errMessage: "Missing required parameter",
        });
      await createBill(uid);
      let bill = await db.Bills.findOne({
        where: { userID: uid, billstatus: 0 },
      });
      if (!bill) {
        resolve({
          errCode: 1,
          errMessage: "Cart's not exists",
        });
      }
      let priceCheck = await db.Items.findOne({
        where: { id: data.itemID },
      });
      let price = priceCheck.price;
      let itemInCart = await db.BillDetails.findOne({
        where: {
          billID: bill.id,
          itemID: data.itemID,
        },
      });
      if (itemInCart) {
        await db.BillDetails.update(
          {
            number: Sequelize.literal("number + " + data.number),
          },
          {
            where: {
              billID: bill.id,
              itemID: data.itemID,
            },
          }
        );
      } else {
        itemInCart = await db.BillDetails.create({
          billID: bill.id,
          itemID: data.itemID,
          currentprice: Number((price * data.number).toFixed(2)),
          number: data.number,
        });
      }
      resolve({
        errCode: 0,
        errMessage: "Add item to cart succeeded",
        itemInCart,
      });
    } catch (e) {
      reject(e);
    }
  });
};
let displayCart = async (userId) => {
  const cart = await db.Bills.findOne({
    where: {
      userID: userId,
      billstatus: 0,
    },
  });
  if (!cart) return "hmu";

  let date = new Date();

  let promotion = 0;
  let promotionCheck = null;
  let promotions = await db.Promotions.findAll();
  for await (let promo of promotions) {
    if (date >= promo.begin && date <= promo.end) {
      promotionCheck = promo;
      break;
    }
  }

  if (promotionCheck) promotion = promotionCheck.value;
  const bill = await db.BillDetails.findAll({
    where: {
      billID: cart.id,
    },
  });

  let cartinfo = [];
  for await (let item of bill) {
    const product = await db.Items.findOne({
      where: {
        id: item.itemID,
      },
    });
    cartinfo.push({
      billID: item.billID,
      number: item.number,
      unitPricePromo: Number((product.price * (1 - promotion)).toFixed(2)),
      totalPricePromo: Number(
        (item.number * product.price * (1 - promotion)).toFixed(2)
      ),
      product: product,
    });
  }
  return cartinfo;
};
let updateCartItem = async (uid, data) => {
  if (!uid || !data.itemID) {
    return {
      errCode: 1,
      errMessage: "Missing required parameter",
    };
  }
  let user = await db.Users.findOne({
    where: { id: uid },
  });
  if (user) {
    console.log("found user");
    let bill = await db.Bills.findOne({
      where: {
        userID: uid,
        billstatus: 0,
      },
    });
    if (!bill) {
      return {
        errCode: 3,
        errMessage: "Cart's not exist",
      };
    }
    console.log("found cart");
    let itemInCart = await db.BillDetails.findOne({
      where: {
        billID: bill.id,
        itemID: data.itemID,
      },
    });
    if (!itemInCart) {
      return {
        errCode: 4,
        errMessage: "Item's not exist in cart",
      };
    }
    let priceCheck = await db.Items.findOne({
      where: { id: data.itemID },
    });
    if (priceCheck) console.log("found item");
    let price = priceCheck.price;
    await db.BillDetails.update(
      {
        number: data.number,
        currentprice: Number((price * data.number).toFixed(2)),
      },
      {
        where: {
          billID: bill.id,
          itemID: data.itemID,
        },
      }
    );
    return displayCart(user.id);
  } else {
    return {
      errCode: 2,
      errMessage: "User's not exist",
    };
  }
};
let deleteCartItem = async (uid, data) => {
  if (!uid || !data.itemID) {
    return {
      errCode: 1,
      errMessage: "Missing required parameter",
    };
  }
  let user = await db.Users.findOne({
    where: { id: uid },
  });
  if (user) {
    let bill = await db.Bills.findOne({
      where: {
        userID: uid,
        billstatus: 0,
      },
    });
    if (!bill) {
      return {
        errCode: 3,
        errMessage: "Cart's not exist",
      };
    }
    let itemInCart = await db.BillDetails.findOne({
      where: {
        billID: bill.id,
        itemID: data.itemID,
      },
    });
    if (!itemInCart) {
      return {
        errCode: 4,
        errMessage: "Item's not exist in cart",
      };
    }
    await db.BillDetails.destroy({
      where: {
        billID: bill.id,
        itemID: data.itemID,
      },
    });
    return "Delete cart item completed";
  } else return "User's not exists";
};
let purchase = async (uid, data) => {
  if (
    !uid ||
    !data.restaurantID ||
    !data.payment ||
    !data.phoneNumber ||
    !data.address ||
    !data.province ||
    !data.district ||
    !data.ward
  ) {
    console.log("Missing required parameters");
    return {
      errCode: 1,
      errMessage: "Missing required parameters",
    };
  }

  const cart = await db.Bills.findOne({
    where: {
      userID: uid,
      billstatus: 0,
    },
  });
  if (!cart) return "hmu";
  var m = new Date();
  let res = await db.Restaurants.findByPk(data.restaurantID);
  let open = await db.OpeningHours.findByPk(res.openID);
  if (
    m.getHours() < open.fromHour ||
    (m.getHours() == open.fromHour && m.getMinutes() < open.fromMin) ||
    m.getHours() > open.toHour ||
    (m.getHours() == open.toHour && m.getMinutes() > open.toMin)
  )
    return "Restaurant's closed";
  var dateString =
    m.getFullYear() +
    "/" +
    ("0" + (m.getMonth() + 1)).slice(-2) +
    "/" +
    ("0" + m.getDate()).slice(-2) +
    " " +
    ("0" + m.getHours()).slice(-2) +
    ":" +
    ("0" + m.getMinutes()).slice(-2) +
    ":" +
    ("0" + m.getSeconds()).slice(-2);
  let date = new Date(dateString);
  let promotion = 0;
  let promotionCheck = null;
  let promotions = await db.Promotions.findAll();
  for await (let promo of promotions) {
    if (date >= promo.begin && date <= promo.end) {
      promotionCheck = promo;
      break;
    }
  }

  if (promotionCheck) promotion = promotionCheck.value;

  const bill = await db.BillDetails.findAll({
    where: {
      billID: cart.id,
    },
  });
  if (bill.length == 0) return "You can't purchase an empty cart!";
  let subtotal = 0;
  let discount = 0;
  let cartItems = [];
  for await (let item of bill) {
    const product = await db.Items.findOne({
      where: {
        id: item.itemID,
      },
    });
    if (promotion != 0) {
      await db.BillDetails.update(
        {
          currentprice: Number(
            (item.number * product.price * (1 - promotion)).toFixed(2)
          ),
        },
        {
          where: {
            billID: cart.id,
            itemID: product.id,
          },
        }
      );
    }

    cartItems.push({
      item: product.itemName,
      unitPrice: product.price,
      unitPricePromo: Number((product.price * (1 - promotion)).toFixed(2)),
    });
    subtotal += Number((item.number * product.price).toFixed(2));
    discount += Number((item.number * product.price * promotion).toFixed(2));
    await db.Bills.increment(
      { total: item.currentprice },
      { where: { id: cart.id } }
    );
  }
  await db.Bills.update(
    {
      billstatus: 1,
      restaurantID: data.restaurantID,
      date: date,
      name: data.name,
      payment: data.payment,
      deliPhoneNum: data.phoneNumber,
      deliAddress: data.address,
      deliProvince: data.province,
      deliDistrict: data.district,
      deliWard: data.ward,
      note: data.note,
    },
    { where: { id: cart.id } }
  );
  console.log(cart.id + " " + date);
  const order = await db.Bills.findOne({
    where: { id: cart.id },
    include: [
      {
        model: db.Allcodes,
        as: "billstatusData",
        where: { type: "billstatus" },
        attributes: ["value"],
      },
      {
        model: db.Users,
        attributes: ["name"],
      },
    ],
    attributes: {
      exclude: ["dailyRpID", "createdAt", "updatedAt"],
    },
    raw: true,
    nest: true,
  });
  console.log("purchase succeeded");
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    bill: order,
    items: cartItems,
  };
};
//for staff only
let displayOrder = async (userID) => {
  const checkRole = await db.Users.findOne({
    where: {
      id: userID,
      roleID: {
        [Op.or]: [1, 0],
      },
    },
  });
  if (!checkRole)
    return {
      errCode: 1,
      errMessage: "You don't have permission to access",
    };
  const staff = await db.Staffs.findOne({
    where: {
      userID: userID,
      staffStatus: 1,
    },
  });
  if (!staff) return "no staff";
  let orders = await db.Bills.findAll({
    where: {
      restaurantID: staff.restaurantID,
    },
  });
  return orders;
};
let displayOrderItems = async (uid, billID) => {
  const order = await db.Bills.findOne({
    where: { id: billID },
  });
  if (!order) return "hmu";
  const user = await db.Users.findOne({
    where: { id: uid },
  });
  if (user.roleID == 2) {
    if (order.userID != uid) return "You can't view this order";
  } else if (user.roleID == 1) {
    const staff = await db.Staffs.findOne({
      where: {
        restaurantID: order.restaurantID,
        userID: uid,
        staffStatus: 1,
      },
    });
    if (!staff && order.userID != uid) return "You can't view this order";
  }

  let orderItems = await db.BillDetails.findAll({
    where: { billID: billID },
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    include: [
      {
        model: db.Items,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      },
    ],
    raw: true,
    nest: true,
  });
  return orderItems;
};
let confirmOrder = async (uid, billID) => {
  if (!billID) return "Pls pick an order";
  let bill = await db.Bills.findOne({
    where: { id: billID },
  });
  if (!bill) return "hmu";
  const user = await db.Users.findOne({
    where: { id: uid },
  });
  if (!user) return "no user";
  if (user.roleID != 2) {
    const staff = await db.Staffs.findOne({
      where: {
        restaurantID: bill.restaurantID,
        userID: uid,
        staffStatus: 1,
      },
    });
    if (!staff) return "You don't have permission to access";
  } else return "You don't have permission to access";
  if (bill.billstatus != 1) return "wtf";
  await db.Bills.update(
    {
      billstatus: 2,
    },
    { where: { id: billID } }
  );
  return "Order confirmed";
};
let cancelOrder = async (uid, id, data) => {
  if (!id) return "Pls pick an order";
  let bill = await db.Bills.findOne({
    where: { id: id },
  });
  if (!bill) return "wtf";
  const user = await db.Users.findOne({
    where: { id: uid },
  });
  if (!user) return "no user";
  if (user.roleID == 2) {
    if (bill.userID != uid) return "You can't view this order";
  }
  if (user.roleID == 1) {
    const staff = await db.Staffs.findOne({
      where: {
        restaurantID: bill.restaurantID,
        userID: uid,
        staffStatus: 1,
      },
    });
    if (!staff) return "You can't view this order";
  }
  if (bill.billstatus == 0 || bill.billstatus >= 2)
    return "You can't cancel this";
  await db.Bills.update(
    {
      billstatus: 4,
      note: data.note,
    },
    { where: { id: id } }
  );
  return "Cancel completed";
};
let confirmDelivered = async (uid, id) => {
  if (!id) return "Pls pick an order";
  let bill = await db.Bills.findOne({
    where: { id: id },
  });
  if (!bill) return "wtf";
  const user = await db.Users.findOne({
    where: { id: uid },
  });
  if (!user) return "no user";
  if (user.roleID == 2) {
    if (bill.userID != uid) return "You can't view this order";
  }
  if (user.roleID == 1) {
    const staff = await db.Staffs.findOne({
      where: {
        restaurantID: bill.restaurantID,
        userID: uid,
        staffStatus: 1,
      },
    });
    if (!staff) return "You can't view this order";
  }
  if (bill.billstatus != 2) return "wtf";
  let date = new Date();
  let salesRpCheck = await db.SalesReports.findOne({
    where: {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    },
  });
  if (!salesRpCheck) {
    salesRpCheck = await db.SalesReports.create({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      totalRevenue: 0,
      totalBillCount: 0,
    });
  }
  let today =
    date.getFullYear() +
    "-" +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + date.getDate()).slice(-2);
  let m = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  let tmr =
    m.getFullYear() +
    "-" +
    ("0" + (m.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + m.getDate()).slice(-2);
  console.log(today + "\n" + tmr);
  let dailyRpCheck = await db.DailyReports.findOne({
    where: {
      date: {
        [Op.gte]: new Date(today),
        [Op.lt]: new Date(tmr),
      },
    },
  });
  if (!dailyRpCheck) {
    dailyRpCheck = await db.DailyReports.create({
      reportID: salesRpCheck.id,
      date: Date.now(),
      revenue: 0,
      billCount: 0,
    });
  }
  await db.Bills.update(
    {
      billstatus: 3,
      dailyRpID: dailyRpCheck.id,
    },
    { where: { id: id } }
  );
  await db.DailyReports.increment(
    {
      revenue: bill.total,
      billCount: 1,
    },
    { where: { id: dailyRpCheck.id } }
  );
  await db.SalesReports.increment(
    {
      totalRevenue: bill.total,
      totalBillCount: 1,
    },
    { where: { id: salesRpCheck.id } }
  );
  return "Order delivered";
};
let getAllOrders = async (userID) => {
  const user = await db.Users.findOne({
    where: { id: userID },
  });
  if (!user) return "User's not exist";
  let bills = await db.Bills.findAll({
    where: {
      userID: userID,
      [Op.not]: {
        billstatus: 0,
      },
    },
  });
  return bills;
};
let getAllExistedOrders = async (userID) => {
  const checkRole = await db.Users.findOne({
    where: { id: userID },
  });
  if (!checkRole) return "no user";
  if (checkRole.roleID != 0) return "You don't have permission to access";
  return await db.Bills.findAll({
    where: {
      [Op.not]: {
        billstatus: 0,
      },
    },
  });
};

module.exports = {
  createBill: createBill,
  addItemToCart: addItemToCart,
  displayCart: displayCart,
  updateCartItem: updateCartItem,
  deleteCartItem: deleteCartItem,
  purchase: purchase,
  displayOrder: displayOrder,
  displayOrderItems: displayOrderItems,
  confirmOrder: confirmOrder,
  cancelOrder: cancelOrder,
  confirmDelivered: confirmDelivered,
  getAllOrders: getAllOrders,
  getAllExistedOrders: getAllExistedOrders,
};
