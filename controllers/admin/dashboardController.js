// const Order = require('../models/Order');
// const Product = require('../models/Product');

// const getDashboardData = async (req, res) => {
//     try {
//         // Get sales data
//         const totalSales = await Order.aggregate([
//             { $group: { _id: null, total: { $sum: "$totalAmount" } } }
//         ]);

//         // Get total orders count
//         const totalOrders = await Order.countDocuments();

//         // Get top products
//         const topProducts = await Order.aggregate([
//             { $unwind: "$items" },
//             { 
//                 $group: {
//                     _id: "$items.productId",
//                     totalQuantitySold: { $sum: "$items.quantity" },
//                     totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
//                 }
//             },
//             { $sort: { totalQuantitySold: -1 } },
//             { $limit: 5 },
//             {
//                 $lookup: {
//                     from: "products",
//                     localField: "_id",
//                     foreignField: "_id",
//                     as: "productDetails"
//                 }
//             },
//             {
//                 $project: {
//                     productName: { $arrayElemAt: ["$productDetails.name", 0] },
//                     totalQuantitySold: 1,
//                     totalRevenue: 1
//                 }
//             }
//         ]);

//         // Get top categories
//         const topCategories = await Order.aggregate([
//             { $unwind: "$items" },
//             {
//                 $lookup: {
//                     from: "products",
//                     localField: "items.productId",
//                     foreignField: "_id",
//                     as: "product"
//                 }
//             },
//             { $unwind: "$product" },
//             {
//                 $group: {
//                     _id: "$product.category",
//                     totalQuantitySold: { $sum: "$items.quantity" },
//                     totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
//                 }
//             },
//             { $sort: { totalQuantitySold: -1 } },
//             { $limit: 5 }
//         ]);

//         // Get sales data for charts
//         const getSalesData = async (timeFrame) => {
//             const now = new Date();
//             let dateFormat, groupBy, matchCriteria;

//             switch(timeFrame) {
//                 case 'weekly':
//                     dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
//                     matchCriteria = {
//                         createdAt: { 
//                             $gte: new Date(now.setDate(now.getDate() - 7))
//                         }
//                     };
//                     break;
//                 case 'monthly':
//                     dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
//                     matchCriteria = {
//                         createdAt: {
//                             $gte: new Date(now.setMonth(now.getMonth() - 12))
//                         }
//                     };
//                     break;
//                 case 'yearly':
//                     dateFormat = { $dateToString: { format: "%Y", date: "$createdAt" } };
//                     matchCriteria = {
//                         createdAt: {
//                             $gte: new Date(now.setFullYear(now.getFullYear() - 5))
//                         }
//                     };
//                     break;
//             }

//             return await Order.aggregate([
//                 { $match: matchCriteria },
//                 {
//                     $group: {
//                         _id: dateFormat,
//                         total: { $sum: "$totalAmount" }
//                     }
//                 },
//                 { $sort: { "_id": 1 } }
//             ]);
//         };

//         const [weeklySales, monthlySales, yearlySales] = await Promise.all([
//             getSalesData('weekly'),
//             getSalesData('monthly'),
//             getSalesData('yearly')
//         ]);

//         // Format chart data
//         const formatChartData = (salesData) => {
//             return {
//                 labels: salesData.map(item => item._id),
//                 data: salesData.map(item => item.total)
//             };
//         };

//         res.render('admin/dashboard', {
//             salesData: {
//                 totalSalesAmount: totalSales[0]?.total || 0,
//                 weekly: formatChartData(weeklySales),
//                 monthly: formatChartData(monthlySales),
//                 yearly: formatChartData(yearlySales)
//             },
//             count: totalOrders,
//             products: topProducts,
//             categories: topCategories
//         });

//     } catch (error) {
//         console.error('Dashboard Error:', error);
//         res.status(500).send('Error fetching dashboard data');
//     }
// };

// module.exports = { getDashboardData };