// middlewares/loadCategories.js
const Category = require('../models/categorySchema'); // adjust path as needed

const loadCategories = async (req, res, next) => {
    try {
        const categories = await Category.find();
        res.locals.categories = categories;
        next();
    } catch (error) {
        console.error('Error loading categories:', error);
        res.locals.categories = [];
        next();
    }
};

module.exports = { loadCategories };