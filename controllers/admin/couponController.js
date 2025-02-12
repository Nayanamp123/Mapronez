const Coupon = require('../../models/couponSchema');

const getCouponPage = async (req, res) => {
   
    try {

        const limit = 5;
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const coupons = await Coupon.find()
            .limit(limit)
            .skip((page - 1) * limit);
            
        const count = await Coupon.find();
        res.render('coupons', { coupons,totalPages:Math.ceil(count.length/limit), currentPage:page });

    } catch (error) {
        console.log('dfghj',error);
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
        })

        await coupon.save();
        res.redirect('/admin/coupons');

    } catch (error) {
        console.error("Error loading coupon page", error);
        res.redirect('/admin/pageerror');
    }
}

const deleteCoupon = async (req, res) => {
    try {

        const id = req.query.id;
        await Coupon.findByIdAndDelete(id);
        res.redirect('/admin/coupons');

    } catch (error) {
        
    }
}

module.exports = {
    getCouponPage,
    addCoupon,
    deleteCoupon,
}