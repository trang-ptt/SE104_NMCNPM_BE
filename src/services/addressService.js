import db, { sequelize } from "../models/index";

let getAllAddress = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let addresses = '';
            
            addresses = await db.Addresses.findAll({
                where: {
                    userID: userId 
                },
                include: [
                    {
                        model: db.Users,                            
                            
                    },
                ],
                    raw: true, 
                    nest: true
            }) 
            resolve(addresses)
        } catch (e) {
            reject(e);
        }
    })
}

let addNewAddress = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.userID || !data.detail || !data.province || !data.district || !data.ward || !data.default) {
                resolve({
                    errCode: 2,
                    errMessage: 'Missing required parameters!'
                });
            }
            let checkAddress = await db.Addresses.findOne({
                where: {
                    userID: data.userID,
                    detail: data.detail,
                    province: data.province,
                    district: data.district,
                    ward: data.ward
                }
            });
            //await db.Addresses.update({
            //    default: 0,
            //}, { where: { default: 1, userID: data.id }})
            if (checkAddress) {
                resolve({
                    errCode: 1,
                    errMessage: 'Existed!'
                });
            }
            else {
                let checkDefault = data.default;
                if (checkDefault === 1) {
                    await db.Addresses.update({
                    default: 0,
                    }, { where: { default: 1, userID: data.userID }})
                } 
                let newAddress = await db.Addresses.create({
                    userID: data.userID,
                    detail: data.detail,
                    province: data.province,
                    district: data.district,
                    ward: data.ward,
                    default: data.default

                })
                if (checkDefault === 1) {
                    await db.Users.update({
                        address: newAddress.id,                                
                    }, { where: { id: data.userID }})
                }                            
            }
            resolve({
                errCode: 0,
                errMessage: 'Address success!'
            });
        }
        catch (e) {
            reject (e);
        }
    })
}

module.exports = {
    getAllAddress: getAllAddress,
    addNewAddress: addNewAddress
}