// middlewares/loadBrands.js
const Brand = require('../models/brandSchema'); // adjust path as needed

const loadBrands = async (req, res, next) => {
    try {
        const brands = await Brand.find();
        res.locals.brands = brands;
        next();
    } catch (error) {
        console.error('Error loading brands:', error);
        res.locals.brands = [];
        next();
    }
};

module.exports = loadBrands;