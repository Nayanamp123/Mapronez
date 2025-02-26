const Coupon = require('../models/couponSchema')

// Example backend validation middleware
const validateCoupon = async (req, res, next) => {
    try {
        const coupon = await Coupon.findOne({ code: req.body.couponCode });
        
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        const startDate = new Date(coupon.startDate);
        const endDate = new Date(coupon.endDate);

        if (currentDate < startDate) {
            return res.status(400).json({ 
                message: 'Coupon not active yet',
                validFrom: startDate
            });
        }

        if (currentDate > endDate) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        // Add coupon to request for later use
        req.coupon = coupon;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error validating coupon' });
    }
};

module.exports = {
    validateCoupon
}