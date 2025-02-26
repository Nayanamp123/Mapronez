const Coupon = require('../../models/couponSchema');

const getCouponPage = async (req, res) => {
    try {
        const limit = 5;
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const coupons = await Coupon.find()
            .limit(limit)
            .skip((page - 1) * limit);
            
        const count = await Coupon.find();
        res.render('coupons', { 
            coupons,
            totalPages: Math.ceil(count.length/limit), 
            currentPage: page 
        });
    } catch (error) {
        console.log('Error:', error);
        res.status(500).send('Error loading coupons');
    }
}

const getEditCouponPage = async (req, res) => {
    try {
        const couponId = req.query.id;
        const coupon = await Coupon.findById(couponId);
        
        if (!coupon) {
            return res.redirect('/admin/coupons');
        }
        
        res.render('edit-coupon', { coupon });
    } catch (error) {
        console.error('Error loading edit coupon page:', error);
        res.redirect('/admin/coupons');
    }
}

const updateCoupon = async (req, res) => {
    try {
        const { couponId, couponCode, discountPercentage, minimumPrice, createdDate, endDate } = req.body;
        
        await Coupon.findByIdAndUpdate(couponId, {
            name: couponCode,
            offerPercentage: discountPercentage,
            minimumPrice: minimumPrice,
            createdOn: createdDate,
            expireOn: endDate
        });

        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).send('Error updating coupon');
    }
}

const addCoupon = async (req, res) => {
    try {
        const { couponCode, discountPercentage, minimumPrice, createdDate, endDate } = req.body;
        const coupon = new Coupon({
            name: couponCode,
            createdOn: createdDate,
            expireOn: endDate,
            offerPercentage: discountPercentage,
            minimumPrice: minimumPrice
        });

        await coupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error("Error adding coupon", error);
        res.redirect('/admin/pageerror');
    }
}

const deleteCoupon = async (req, res) => {
    try {
        const id = req.query.id;
        await Coupon.findByIdAndDelete(id);
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.redirect('/admin/coupons');
    }
}

module.exports = {
    getCouponPage,
    getEditCouponPage,
    updateCoupon,
    addCoupon,
    deleteCoupon
}