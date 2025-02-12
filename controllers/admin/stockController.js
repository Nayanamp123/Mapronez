const Product = require('../../models/productSchema');

const getStocks = async (req, res) => {
    try {

        const limit = 10;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const products = await Product.find().populate('category', 'name')
            .limit(limit)
            .skip((page - 1) * limit);

        const count = await Product.find()
        res.render('stocks', { products, totalPages: Math.ceil(count.length / limit), currentPage: page });

    } catch (error) {

    }
}

const updateStock = async (req, res) => {
    try {

        const { productId, newStock } = req.body;
        await Product.findByIdAndUpdate(productId, { quantity: newStock });
        res.json({ success: true });

    } catch (error) {
        console.error("Error updating stock", error);
        res.json({ success: false });
    }
}

module.exports = {
    getStocks,
    updateStock
}