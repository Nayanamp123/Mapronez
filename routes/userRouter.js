const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const profileController = require('../controllers/user/profileController.js')
const productController = require('../controllers/user/productController.js')
const cartController = require('../controllers/user/cartController.js')
const paymentController = require('../controllers/user/paymentController.js');
const invoiceController = require('../controllers/user/invoiceController.js');

const {userAuth} = require('../middlewares/auth.js')
const User = require('../models/userSchema.js');
const passport = require('passport');
const { loadCategories } = require('../middlewares/loadCategories');
const loadBrands = require('../middlewares/loadBrands.js');

// First verify these middlewares are functions
// if (typeof loadCategories !== 'function') {
//     throw new Error('loadCategories must be a function');
// }
// if (typeof loadBrands !== 'function') {
//     throw new Error('loadBrands must be a function');
// }

// Static files
router.use(express.static('public'));

// Apply category and brand middlewares
// router.use(loadCategories);
// router.use(loadBrands);

// User session middleware with error handling
router.use((req, res, next) => {
    if (!req.session) {
        return next();
    }
    
    if (!req.session.user) {
        res.locals.user = null;
        return next();
    }

    User.findById(req.session.user)
        .then(userData => {
            res.locals.user = userData || null;
            next();
        })
        .catch(err => {
            console.error('Error in user session middleware:', err);
            res.locals.user = null;
            next();
        });
});
router.use(async(req, res, next) => {
    const userData = await User.findById(req.session.user);
    res.locals.user = userData || null;
    next();
});

// User block check middleware with error handling
router.use((req, res, next) => {
    if (req.path === "/login") {
        return next();
    }

    if (!req.session || !req.session.user) {
        return next();
    }

    User.findById(req.session.user)
        .then(user => {
            if (user && user.isBlocked) {
                return res.redirect("/login");
            }
            next();
        })
        .catch(err => {
            console.error('Error in block check middleware:', err);
            next();
        });
});
const session = require('express-session');

router.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

router.get('/page-not-found', userController.pageNotFound)
router.get('/', userController.loadHomepage)
router.get('/sort', userController.sortProducts);
router.get('/filter-by-category',userController.catFilter)
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)
router.post('/verify-otp', userController.verifyOtp)
router.post('/resend-otp', userController.resendOtp);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/')
})

//user authentication
router.get('/login', userController.loadLogin)
router.post('/login', userController.login);
router.get('/logout-user', userController.getLogoutPage);
router.get('/logout', userController.logout);
router.get('/forgot-password', profileController.getForgotPassword);
router.post('/forgot-email-valid', profileController.forgotEmailValid);
router.post('/verify-forgotpass-otp', profileController.verifyForgotOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.resetPassword);

//user profile
router.get('/profile', profileController.getUserProfile);
router.post('/updateprofile', profileController.updateProfile);
router.get('/add-address', profileController.getAddAddress);
router.post('/save-address', profileController.saveAddress);
router.get('/address', profileController.getAddress);
router.get('/edit-address', profileController.editAddress);
router.get('/delete-address', profileController.deleteAddress);

//product details
router.get('/productdetails', productController.getProductDetails);

router.get('/all-products',productController.getAllProducts);
router.get('/brands',productController.getBrands);


//user cart
router.get('/cart', cartController.getCart);
router.post('/add-to-cart', cartController.addToCart);
router.post('/remove-cart-item', cartController.removeCartItem);
router.post('/update-cart-quantity', cartController.updateCart);

// router.get('/checkout', productController.getCheckout);
// router.post('/place-order', productController.placeOrder);
// router.post('/place-order-initial',productController.placeOrderInitial);
// router.post('/retry-payment',paymentController.retryPayment);
// router.get('/payment-failed',paymentController.paymentFailed);
// router.post('/wallet-payment',paymentController.walletPayment);

// router.post('/create-order', paymentController.createOrder);
// router.post('/verify-payment', paymentController.verifyPayment);
// router.get('/razorpay-key', paymentController.getRazorpayKey);
// router.get('/get-address/:id', paymentController.getAddress);

// router.get('/order-confirmation', productController.orderConfirm);
// router.get('/orders', productController.getOrders);
// router.get('/cancel-order', productController.cancelOrder);
// router.post('/return-request',productController.returnOrder);
// router.get('/order-details', productController.orderDetails);
// router.get('/download-invoice',invoiceController.downloadInvoice)







module.exports = router;