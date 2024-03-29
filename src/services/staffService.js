import db from "../models/index";

let checkUserEmail = (userEmail) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.Users.findOne({
        where: { email: userEmail },
      });
      if (user) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (e) {
      reject(e);
    }
  });
};

let addNewStaff = (uid, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const checkRole = await db.Users.findOne({
        where: { id: uid },
      });
      if (!checkRole)
        resolve({
          errCode: 3,
          errMessage: "No user",
        });
      if (checkRole.roleID != 0)
        resolve({
          errCode: 4,
          errMessage: "You don't have permission to access",
        });
      let check = await checkUserEmail(data.email);
      if (check === false) {
        resolve({
          errCode: 1,
          errMessage: "User's not exist",
        });
      } else {
        let user = await db.Users.findOne({
          where: { email: data.email },
        });
        let staff = await db.Staffs.findOne({
          where: {
            userID: user.id,
            staffStatus: 1,
          },
        });
        if (staff)
          resolve({
            errCode: 2,
            errMessage: "Staff exists",
          });
        else
          await db.Staffs.create({
            userID: user.id,
            restaurantID: data.restaurantID,
            workingDay: Date.now(),
            staffStatus: 1,
          });
        await db.Users.update(
          {
            roleID: 1,
          },
          { where: { id: user.id } }
        );
        resolve({
          errCode: 0,
          errMessage: "OK",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let updateStaffStatus = (uid, id, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const checkRole = await db.Users.findOne({
        where: { id: uid },
      });
      if (!checkRole)
        resolve({
          errCode: 3,
          errMessage: "No user",
        });
      if (checkRole.roleID != 0)
        resolve({
          errCode: 4,
          errMessage: "You don't have permission to access",
        });
      if (!id) {
        resolve({
          errCode: 2,
          errMessage: "Missing required parameters",
        });
      }
      let staff = await db.Staffs.findOne({
        where: { id: id },
      });
      if (staff) {
        if (staff.userID == uid)
          resolve({
            errCode: 5,
            errMessage: "You can't change your status!",
          });
        if (staff.staffStatus == 0)
          resolve({
            errCode: 6,
            errMessage: "Can't update retired staff!",
          });
        else
          await db.Staffs.update(
            {
              staffStatus: data.staffStatus,
            },
            { where: { id: id } }
          );
        if (data.staffStatus == 0) {
          await db.Users.update(
            {
              roleID: 2,
            },
            { where: { id: staff.userID } }
          );
        }
        resolve({
          errCode: 0,
          errMessage: "Status updated successfully!",
        });
      } else {
        resolve({
          errCode: 1,
          errMessage: "Staff's not found!",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getAllStaff = async (uid) => {
  const checkRole = await db.Users.findOne({
    where: { id: uid },
  });
  if (!checkRole)
    return {
      errCode: 1,
      errMessage: "No user",
    };
  if (checkRole.roleID != 0)
    return {
      errCode: 2,
      errMessage: "You don't have permission to access",
    };
  return await db.Staffs.findAll({
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    include: [
      {
        model: db.Allcodes,
        as: "staffstatusData",
        where: { type: "staffstatus" },
        attributes: ["value"],
      },
      {
        model: db.Restaurants,
        attributes: ["resAddress"],
      },
      {
        model: db.Users,
        attributes: ["name", "email", "phoneNumber", "roleID"],
        include: [
          {
            model: db.Allcodes,
            as: "roleData",
            where: { type: "roleID" },
            attributes: ["value", "key"],
          },
        ],
      },
    ],
    raw: true,
    nest: true,
  });
};

let changeRole = async (uid, data) => {
  const checkRole = await db.Users.findOne({
    where: { id: uid },
  });
  if (!checkRole) return "no user";
  if (checkRole.roleID != 0) return "You don't have permission to access";
  if (!data.id || !uid || !data.roleID) return "Missing required parameter";
  if (uid == data.id) return "You can't demote yourself";
  const staff = await db.Staffs.findOne({
    where: { userID: data.id },
  });
  if (!staff) return "no staff";
  await db.Users.update(
    {
      roleID: data.roleID,
    },
    { where: { id: staff.userID } }
  );
  return "Change role succeeded";
};

module.exports = {
  addNewStaff: addNewStaff,
  updateStaffStatus: updateStaffStatus,
  getAllStaff: getAllStaff,
  changeRole: changeRole,
};
