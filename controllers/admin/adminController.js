const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const pageError = async (req, res) => {
    try {

        res.render('admin-error')

    } catch (error) {
        console.log(error)
    }
}

const loadLogin = async (req, res) => {
    try {

        const message = req.query.msg || ""
        if (req.session.admin) {
            return res.redirect('/admin/dashboard')
        }
        res.render('admin-login', { message })
    } catch (error) {

    }
}

const login = async (req, res) => {
    try {

        const { email, password } = req.body;
        const admin = await User.findOne({ email: email, isAdmin: true });
        if (admin) {
            

                const passwordMatch = await bcrypt.compare(password, admin.password);
                
                if (passwordMatch) {
                req.session.admin = true;
                return res.redirect('/admin')
            } else {
                return res.redirect('/admin/login?msg=Incorrect Password')
            }
        } else {
            return res.redirect('/admin/login?msg=Admin not found')
        }

    } catch (error) {
        console.log('Admin login error', error);
        return res.redirect('/pageerror')
    }
}

const loadDashboard = async (req, res) => {
    try {

        if (req.session.admin) {
            const salesData = await getTotalSales();
            const products = await getMostSellingProducts();
            const categories = await getMostSellingCategories();
            const brands = await getMostSellingBrands();

            const count = await Order.countDocuments();

            const {totalSalesAmount,monthly,yearly} = salesData;

            res.render('dashboard', { salesData, products, categories, brands,count });
        }

    } catch (error) {
        res.redirect('/pageerror')
    }
}

async function getTotalSales() {
    try {
        const totalSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$finalAmount" }
                }
            }
        ]);

        const weeklySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) // Start of current year
                    }
                }
            },
            {
                $group: {
                    _id: { $isoWeek: "$createdAt" },
                    sales: { $sum: "$finalAmount" }
                }
            }
        ]);

        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) // Start of current year
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    sales: { $sum: "$finalAmount" }
                }
            }
        ]);

        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdAt" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            },
            {
                $limit: 5 // Last 5 years
            }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Weekly Data
        const totalWeeks = 52; // Maximum weeks in a year
        const weeklyData = {
            labels: Array.from({ length: totalWeeks }, (_, i) => `Week ${i + 1}`),
            data: Array(totalWeeks).fill(0)
        };
        weeklySales.forEach(item => {
            const weekIndex = item._id - 1; // Convert to zero-based index
            if (weekIndex >= 0 && weekIndex < totalWeeks) {
                weeklyData.data[weekIndex] = item.sales;
            }
        });

        // Monthly Data
        const monthlyData = {
            labels: monthNames,
            data: Array(12).fill(0)
        };
        monthlySales.forEach(item => {
            const monthIndex = item._id - 1; // Convert to zero-based index
            monthlyData.data[monthIndex] = item.sales;
        });

        // Yearly Data
        const currentYear = new Date().getFullYear();
        const yearlyData = {
            labels: Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString()),
            data: Array(5).fill(0)
        };
        yearlySales.forEach(item => {
            const yearIndex = yearlyData.labels.indexOf(item._id.toString());
            if (yearIndex !== -1) {
                yearlyData.data[yearIndex] = item.sales;
            }
        });

        return {
            totalSalesAmount: totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0,
            weekly: weeklyData,
            monthly: monthlyData,
            yearly: yearlyData
        };
    } catch (error) {
        console.error("Error calculating sales data:", error);
        return {
            totalSalesAmount: 0,
            weekly: { labels: [], data: [] },
            monthly: { labels: [], data: [] },
            yearly: { labels: [], data: [] }
        };
    }
}


async function getMostSellingProducts() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$orderedItems.product",
                    productName: { $first: "$productDetails.productName" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling product:", error);
    }
}

async function getMostSellingCategories() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },

            { $unwind: "$categoryDetails" },

            {
                $group: {
                    _id: "$productDetails.category",
                    categoryName: { $first: "$categoryDetails.name" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category:", error);
    }
}

async function getMostSellingBrands() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$productDetails.brand",
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 },
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category and brand:", error);
    }
}


const logout = async (req, res) => {
    try {

        req.session.admin = null;
        res.redirect('/admin/login');

    } catch (error) {
        console.log("Unexpected error during logout", error);
        res.redirect('/pageerror')
    }
}

// Get Dashboard Data
exports.getDashboardData = async (req, res) => {
    try {
        // Fetch total sales
        const totalSales = await Order.aggregate([
            { $group: { _id: null, totalSalesAmount: { $sum: "$totalAmount" } } }
        ]);
        const totalSalesAmount = totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0;

        // Fetch total orders
        const totalOrders = await Order.countDocuments();

        // Fetch top 10 products
        const topProducts = await Product.aggregate([
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
            { $project: { productName: 1, totalQuantitySold: 1 } }
        ]);

        // Fetch top 10 categories
        const topCategories = await Category.aggregate([
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
            { $project: { categoryName: 1, totalQuantitySold: 1 } }
        ]);

        // Fetch top 10 brands
        const topBrands = await Brand.aggregate([
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
            { $project: { brandName: 1, totalQuantitySold: 1 } }
        ]);

        // Fetch sales data for weekly, monthly, yearly
        const salesData = {
            yearly: await getSalesData('yearly'),
            monthly: await getSalesData('monthly'),
            weekly: await getSalesData('weekly')
        };

        res.render('admin/dashboard', {
            salesData: {
                totalSalesAmount,
                yearly: salesData.yearly,
                monthly: salesData.monthly,
                weekly: salesData.weekly
            },
            totalOrders,
            topProducts,
            topCategories,
            topBrands
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Helper function to get sales data
const getSalesData = async (range) => {
    const now = new Date();
    let startDate;

    switch (range) {
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'weekly':
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            break;
    }

    const sales = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, totalSales: { $sum: "$totalAmount" } } },
        { $sort: { _id: 1 } }
    ]);

    return {
        labels: sales.map(s => s._id),
        data: sales.map(s => s.totalSales)
    };
};


module.exports = {
    pageError,
    loadLogin,
    login,
    loadDashboard,
    logout,
    
}