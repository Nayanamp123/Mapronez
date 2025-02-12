const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');

const getSalesReport = async (req, res) => {
    try {
        // Pagination setup
        const limit = 10;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        
        // Date and status filter setup
        let dateFilter = { status: "Delivered" };
        if (req.query.startDate && req.query.endDate) {
            dateFilter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate + 'T23:59:59.999Z')
            };
        }

        // Fetch orders with filters and populate related data
        const orders = await Order.find(dateFilter)
            .populate('user')
            .populate('orderedItems.product')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        // Get total count for pagination
        const count = await Order.countDocuments(dateFilter);

        // Calculate summary statistics
        const summaryStats = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$finalAmount' },
                    totalDiscount: { $sum: '$discount' },
                    uniqueCustomers: { $addToSet: '$user' }
                }
            }
        ]);

        const summary = summaryStats.length > 0 ? {
            totalSales: summaryStats[0].totalSales || 0,
            totalOrders: count,
            totalDiscount: summaryStats[0].totalDiscount || 0,
            totalCustomers: summaryStats[0].uniqueCustomers.length
        } : {
            totalSales: 0,
            totalOrders: 0,
            totalDiscount: 0,
            totalCustomers: 0
        };

        res.render('sales-report', {
            orders,
            count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            summary,
            dateFilter: {
                startDate: req.query.startDate || '',
                endDate: req.query.endDate || ''
            }
        });

    } catch (error) {
        console.error("Error loading sales report page", error);
        res.redirect('/admin/pageerror');
    }
};


// Handle export data requests
const getExportData = async (req, res) => {
    try {
        let dateFilter = { status: "Delivered" };
        if (req.query.startDate && req.query.endDate) {
            dateFilter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate + 'T23:59:59.999Z')
            };
        }

        const orders = await Order.find(dateFilter)
            .populate('user')
            .populate('orderedItems.product')
            .sort({ createdAt: -1 });

        const exportData = orders.map(order => ({
            orderId: order._id,
            userName: order.user?.username || 'Unknown',
            products: order.orderedItems.map(item => 
                item.product?.productName || 'Deleted Product'
            ).join(', '),
            quantities: order.orderedItems.map(item => 
                item.quantity
            ).join(', '),
            date: order.createdAt.toLocaleDateString(),
            discountAmount: order.discount,
            finalAmount: order.finalAmount
        }));

        res.json({
            success: true,
            data: exportData,
            summary: {
                totalOrders: orders.length,
                totalSales: orders.reduce((sum, order) => sum + order.finalAmount, 0),
                totalDiscount: orders.reduce((sum, order) => sum + order.discount, 0)
            }
        });

    } catch (error) {
        console.error("Error exporting sales data:", error);
        res.status(500).json({
            success: false,
            message: 'Error exporting sales data'
        });
    }
};


module.exports = {
    getSalesReport,
    getExportData
};