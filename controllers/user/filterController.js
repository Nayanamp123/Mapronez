const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');

const filterByCategoryAndSearch = async (req, res) => {
    try {

        const { category, search } = req.query;
        let query = {productName: { $regex: search, $options: 'i' }};

        if (category && category !== 'all-categories') {
            query.category = category;
        }

        const products = await Product.find(query).populate('category');
        res.json({ products });

    } catch (error) {
        console.error("Error in filtering", error);
        res.json({ success: false })
    }
}

const sortAndSearch = async (req, res) => {
    try {

        const { search } = req.query;
        const sortOption = req.query.sort || 'default';
        let sortCriteria;

        switch (sortOption) {
            case 'popularity':
                sortCriteria = { popularity: -1 };
                break;
            case 'price-low-high':
                sortCriteria = { salePrice: 1 };
                break;
            case 'price-high-low':
                sortCriteria = { salePrice: -1 };
                break;
            case 'rating':
                sortCriteria = { rating: -1 };
                break;
            case 'new-arrivals':
                sortCriteria = { createdAt: -1 };
                break;
            case 'alphabetical-a-z':
                sortCriteria = { productName: 1 };
                break;
            case 'alphabetical-z-a':
                sortCriteria = { productName: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        const products = await Product.find({productName: { $regex: search, $options: 'i' }}).sort(sortCriteria);
        res.json({ products });

    } catch (error) {
        console.error("Error in sort and search", error);
    }
}

module.exports = {
    filterByCategoryAndSearch,
    sortAndSearch
}