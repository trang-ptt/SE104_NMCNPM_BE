import Op from 'sequelize';
import db, { Sequelize, sequelize } from "../models/index";

let createBill = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let user = await db.Users.findOne({
                where: { id: data.userID }
            })
            let checkBillExist = await db.Bills.findOne({
                where: {
                    userID: user.id,
                    billstatus: 0
                }
            })
            if (checkBillExist) {
                resolve({
                    errCode: 1,
                    errMessage: 'Bill existed as draft'
                })
            } else {
                // let salesRpCheck = await db.SalesReports.findOne({
                //     where: {
                //         year: Date.now().getFullYear,
                //         month: Date.now().getMonth,
                //     }
                // })
                // if (!salesRpCheck) {
                //     salesRpCheck = await db.SalesReports.create({
                //         year: Date.now().getFullYear,
                //         month: Date.now().getMonth,
                //         totalRevenue: 0,
                //         totalBillCount: 0
                //     })
                // }
                // let dailyRpCheck = await sequelize.query('select date from dailyreports where '
                // + 'year(date) = ' + Date.now().getFullYear() + ' and month(date) = ' + Date.now().getMonth()
                // + 'and day(date) = ' + Date.now().getDate(), { type: QueryTypes.SELECT })
                // if (!dailyRpCheck) {
                //     dailyRpCheck = await db.DailyReports.create({
                //         reportID: salesRpCheck.id,
                //         date: Date.now(),
                //         revenue: 0,
                //         billCount: 0
                //     })
                // }
                let bill = await db.Bills.create({
                    userID: data.userID,
                    // restaurantID: data.restaurantID,
                    // dailyRpID: dailyRpCheck.id,
                    total: 20000,
                    ship: 20000,
                    billstatus: 0,                    
                })
                resolve(bill)
            }
        } catch(e) {
            reject(e)
        }
    })
}
let addItemToCart = (data) => {
    return new Promise(async (resolve, reject) => {
        try {            
            await createBill(data);
            let bill = await db.Bills.findOne({
                where: { userID: data.userID, billstatus: 0 }
            })
            let priceCheck = await db.Items.findOne({
                where: { id: data.itemId }
            });
            let price = priceCheck.price;
            let itemInCart = await db.BillDetails.findOne({
                where: {
                    billID: bill.id,
                    itemID: data.itemId
                }
            })
            if (itemInCart) {
                await db.BillDetails.update({
                    number: Sequelize.literal('number + ' + data.number)
                }, { where: {
                    billID: bill.id,
                    itemID: data.itemId
                } })
            }   
            else {
                itemInCart = await db.BillDetails.create({
                    billID: bill.id,
                    itemID: data.itemId,
                    currentprice: price * data.number,
                    number: data.number
                })
            }
            resolve(itemInCart)
        } catch (e) {
            reject(e)
        }
    })
}
let displayCart = async(userId) => {
    const cart = await db.Bills.findOne({
        where: {
            userID: userId,
            billstatus: 0
        }
    })
    if(!cart) return "hmu"

    let date = new Date()
    let promotionCheck = await db.Promotions.findOne({
        // where: {
            [Op.and]: [
                sequelize.where(sequelize.fn('date', sequelize.col('begin')), '<=', date),
                sequelize.where(sequelize.fn('date', sequelize.col('end')), '>=', date)
            ]
        // }
    })   

    let promotion = 0;
    if (promotionCheck)
        promotion = promotionCheck.value;
    const bill = await db.BillDetails.findAll({
        where: {
            billID : cart.id
        }
    })

    let cartinfo = []
    for await (let item of bill){
        const product = await db.Items.findOne({
            where: {
                id : item.itemID
            },
        })
        cartinfo.push({
            billid: item.billID, 
            number: item.number, 
            unitPricePromo: product.price * (1 - promotion),
            totalPricePromo: item.number * product.price * (1 - promotion),
            product: product,
        })        
    }
    return cartinfo
}
let updateCartItem = async (data) => {
    if (!data.userID || !data.itemId) {
        return ({
            errCode: 1,
            errMessage: 'Missing required parameter'
        })
    }
    let user = await db.Users.findOne({
        where: {id: data.userID},
    })
    if (user) {
        let bill = await db.Bills.findOne({
            where: {
                userID: data.userID,
                billstatus: 0
            }
        })
        if (!bill) {
            return ({
                errCode: 3,
                errMessage: "Cart's not exist",
            });
        }
        let itemInCart = await db.BillDetails.findOne({
            where : {
                billID: bill.id,
                itemID: data.itemId
            }
        })
        if (!itemInCart) {
            return ({
                errCode: 4,
                errMessage: "Item's not exist in cart",
            });
        }
        let priceCheck = await db.Items.findOne({
            where: { id: data.itemId }
        });
        let price = priceCheck.price;
        let cartItem = await db.BillDetails.update({
            number: data.number,
            currentprice: price * data.number
        }, { where: {
            billID: bill.id,
            itemID: data.itemId
        }})
        return displayCart(user.id)
    } else {
        return ({
            errCode: 2,
            errMessage: "User's not exist",
        });
    }
}
let purchase = async(data) => {
    const cart = await db.Bills.findOne({
        where: {
            userID: data.userID,
            billstatus: 0
        }
    })
    if(!cart) return "hmu"

    let date = new Date()
    let promotionCheck = await db.Promotions.findOne({
        // where: {
            [Op.and]: [
                sequelize.where(sequelize.fn('date', sequelize.col('begin')), '<=', date),
                sequelize.where(sequelize.fn('date', sequelize.col('end')), '>=', date)
            ]
        // }
    })   

    let promotion = 0;
    if (promotionCheck)
        promotion = promotionCheck.value;

    const bill = await db.BillDetails.findAll({
        where: {
            billID : cart.id
        }
    })
    let subtotal = 0;
    let discount = 0;
    let cartItems = []
    for await (let item of bill) {
        const product = await db.Items.findOne({
            where: {
                id : item.itemID
            },
        })
        if (promotion != 0) {
            await db.BillDetails.update({
                currentprice: item.number * product.price * (1 - promotion)
            }, { where: {
                billID: cart.id,
                itemID: product.id
            }})
        }
        cartItems.push({
            item: product.itemName,
            unitPrice: product.price,
            unitPricePromo: product.price * (1 - promotion)
        });
        subtotal += item.number * product.price,
        discount += item.number * product.price * promotion
        await db.Bills.increment({ total: item.currentprice },
             { where: { id: cart.id }})
    }
    await db.Bills.update({
        billstatus: 1,
        restaurantID: data.restaurantID, 
        date: date,
        payment: data.payment,
        deliPhoneNum: data.phoneNumber,
        deliAddress: data.address,
        deliProvince: data.province,
        deliDistrict: data.district,
        deliWard: data.ward,
        note: data.note,
    }, { where: { id: cart.id }})
    console.log(cart.id)
    const order = await db.Bills.findOne({
        where: { id: cart.id },        
        include: [
            {
                model: db.Allcodes,                            
                as: 'billstatusData',
                where: { type: 'billstatus' },
                attributes: ['value']
            },
            {
                model: db.Users,              
                attributes: ['name']
            },
        ],
        attributes: {
            exclude: ['dailyRpID', 'createdAt', 'updatedAt']
        },
        raw: true, 
        nest: true
    })
    console.log('done')
    return {
        subtotal: subtotal,
        discount: discount,
        bill: order,
        items: cartItems
    }
}
//for staff only
let displayOrder = async(userID) => {
    const staff = await db.Staffs.findOne({
        where: { userID: userID, staffstatus: 1 }
    })
    if (!staff) return {
        errCode: 1,
        errMessage: "You don't have permission to access"
    }
    let orders = await db.Bills.findAll({
        where: {
            restaurantID: staff.restaurantID,
        }, 
    })
    return orders
} 
let displayOrderItems = async(billID) => {
    const order = await db.Bills.findOne({
        where: { id: billID }
    })
    if (!order) return 'hmu'

    let orderItems = await db.BillDetails.findAll({
        where: { billID: billID },
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        },
        include: [{
            model: db.Items,
            attributes: ['itemName']
        }],
        raw: true,
        nest: true
    })
    return orderItems
}
let confirmOrder = async(data) => {

}

module.exports = {
    createBill: createBill,
    addItemToCart: addItemToCart,
    displayCart: displayCart,
    updateCartItem: updateCartItem,
    purchase: purchase,
    displayOrder: displayOrder,
    displayOrderItems: displayOrderItems,
    confirmOrder: confirmOrder,
}