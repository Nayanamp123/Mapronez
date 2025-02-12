const Return = require("../../models/returnSchema");
const Wallet = require("../../models/walletSchema");
const Order = require("../../models/orderSchema");
const Product = require('../../models/productSchema')
const { Transaction } = require("mongodb");


const getReturnApprovals = async (req, res) => {
    try {

        const limit = 5;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const returnData = await Return.find().populate('orderId userId')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);
        const count = await Return.find()
        res.render('return-order', {
            returns: returnData,
            totalPages: Math.ceil(count.length / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching return approvals:', error);
        res.status(500).send('Server error');
    }
};

const returnUpdate = async (req, res) => {
    try {
        const returnId = req.query.id;
        console.log(returnId);
        
        const { status } = req.body;


        const returnData = await Return.findById(returnId);
        if (!returnData) {
            return res.status(404).json({ message: "Return request not found" });
        }

        const userId = returnData.userId;
        const orderId = returnData.orderId;
        const amount = returnData.refundAmount;

        if (status === "approved") {
            await Wallet.findOneAndUpdate(
                { userId },
                {
                    $inc: { balance: amount },
                    $push: {
                        transactions: {
                            type: 'Refund',
                            amount: amount,
                            description: "Refund for your returned product",
                            orderId,
                            date: new Date()
                        }
                    }
                },
                { new: true }
            );


            returnData.returnStatus = status;
            await returnData.save();

            await Order.findOneAndUpdate(
                { _id: orderId },
                { $set: { status: "Returned" } }
            );
        } else if (status === "rejected") {
            returnData.returnStatus = status;
            await returnData.save();

            await Order.findOneAndUpdate(
                { _id: orderId },
                { $set: { status: "Return Request" } }
            );
        } else {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const order = await Order.findById(orderId);

        const updates = order.orderedItems.map(item =>
            Product.findByIdAndUpdate(
              item.product,
              { $inc: { quantity: item.quantity } },
              { new: true }
            )
          );
          
          await Promise.all(updates);

        return res.redirect('/admin/return-approvals');
    } catch (error) {
        console.error("Error in Updating Return Status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = {
    getReturnApprovals,
    returnUpdate
}