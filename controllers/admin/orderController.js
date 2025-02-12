const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema')


const getOrderPage = async (req,res) => {
    const { status } = req.query;

    const filter = status && status !== 'All' ? { status } : {};

    try {
        const limit = 10;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const orders = await Order.find(filter)
            .populate('user')
            .populate('orderedItems.product').sort({createdAt:-1})
            .limit(limit)
            .skip((page - 1) * limit);
            const count = await Order.find(filter)
        res.render('orders-list', { orders:orders.reverse(), currentStatus: status || 'All',totalPages:Math.ceil(count.length/limit), currentPage:page });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error retrieving orders');
    }
}

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;

        const order = await Order.findById(orderId);
       
        if (order) {
            if (newStatus === 'Cancelled' || newStatus === "Returned") {
                for (const item of order.orderedItems) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { quantity : item.quantity }
                    });
                }
            }


             await Order.findByIdAndUpdate(orderId, { status: newStatus });
              
            return res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        res.json({ success: false });
    }
};

module.exports = {
    getOrderPage,
    updateOrderStatus,
}