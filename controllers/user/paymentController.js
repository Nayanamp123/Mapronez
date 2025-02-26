const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const Product = require('../../models/productSchema');
const env = require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZOR_KEY_ID,
    key_secret: process.env.RAZOR_SECRET,
});

const RAZORPAY_MAX_AMOUNT = 5000000000;
const RAZORPAY_MIN_AMOUNT = 100;

const createOrder = async (req, res) => {
    try {
        const { amount, addressId } = req.body;
        const userId = req.session.user;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Amount must be a positive number'
            });
        }

        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const amountInPaise = Math.round(amount * 100);

        if (amountInPaise < RAZORPAY_MIN_AMOUNT) {
            return res.status(400).json({
                success: false,
                message: `Amount must be at least ₹${RAZORPAY_MIN_AMOUNT / 100}`
            });
        }

        if (amountInPaise > RAZORPAY_MAX_AMOUNT) {
            return res.status(400).json({
                success: false,
                message: `Amount exceeds maximum limit of ₹${RAZORPAY_MAX_AMOUNT / 100}`
            });
        }

        // Generate unique receipt ID
        const receipt = crypto
            .randomBytes(16)
            .toString('hex');

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt,
            notes: {
                userId: userId.toString(),
                addressId: addressId.toString()
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Store order ID in session with expiry
        req.session.razorpayOrderId = razorpayOrder.id;
        req.session.razorpayOrderExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes expiry

        res.status(200).json({
            success: true,
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt,
            name:'MAPRONEZ',
            description:"A perfume app that helps users discover, compare, and purchase fragrances based on their preferences."
        });

    } catch (error) {
        console.error('Razorpay order creation error:', error);

        // Enhanced error handling
        if (error.error && error.error.code === 'BAD_REQUEST_ERROR') {
            return res.status(400).json({
                success: false,
                message: error.error.description || 'Invalid request parameters',
                error: error.error
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment verification parameters'
            });
        }

        if (!req.session.razorpayOrderId || !req.session.razorpayOrderExpiry ||
            Date.now() > req.session.razorpayOrderExpiry) {
            return res.status(400).json({
                success: false,
                message: 'Order session has expired'
            });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZOR_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        if (req.session.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: 'Order verification failed'
            });
        }

        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status !== 'captured') {
            return res.status(400).json({
                success: false,
                message: `Payment not captured. Current status: ${payment.status}`
            });
        }

        delete req.session.razorpayOrderId;
        delete req.session.razorpayOrderExpiry;

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            paymentId: razorpay_payment_id,
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};

const getRazorpayKey = (req, res) => {
    if (!process.env.RAZOR_KEY_ID) {
        return res.status(500).json({
            success: false,
            message: 'Razorpay key not configured'
        });
    }

    res.json({
        success: true,
        key: process.env.RAZOR_KEY_ID
    });
};

const getAddress = async (req, res) => {
    try {
        const user = req.session.user;
        const addressId = req.params.id;
        const addressDoc = await Address.findOne({ userId: user });
        const address = addressDoc.addresses.filter((address) => {
            address._id = addressId
        })

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        res.json({
            success: true,
            name: address.name,
            email: address.email,
            phone: address.phone,
            streetAddress: address.streetAddress
        });
    } catch (error) {
        console.error('Error fetching address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch address details'
        });
    }
}

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        res.json({
            success: true,
            orderDetails: {
                _id: order._id,
                razorpayOrderId: order.razorpayOrderId,
                amount: order.finalAmount * 100,
                currency: 'INR'
            },
            razorpayKey: process.env.RAZOR_KEY_ID
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch order details' });
    }
}

const retryPayment = async (req, res) => {
    const orderId = req.body.orderId || req.query.orderId;

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    try {
        const razorpayOrder = await razorpay.orders.create({
            amount: order.finalAmount * 100,
            currency: order.currency,
            receipt: `order_rcptid_${order.id}`,
        });

        req.session.razorpayOrderId = razorpayOrder.id;
        req.session.razorpayOrderExpiry = Date.now() + (30 * 60 * 1000);

        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            razorpayKey: process.env.RAZOR_KEY_ID,
            amount: order.finalAmount,
            currency: order.currency,
            name: 'MAPRONEZ'
        });
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }
}

const paymentFailed = async (req, res) => {
    try {

        const { errorReference, message } = req.query;
        const orderId = req.query.id;
        res.render('payment-failed', { errorReference, message, orderId });

    } catch (error) {

    }
}

const walletPayment = async (req, res) => {
    try {
        const { cart, totalPrice, addressId, singleProduct, finalPrice, coupon, discount } = req.body;
        const userId = req.session.user;

        if (!userId || !finalPrice || (!cart && !singleProduct)) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(400).json({ success: false, message: 'Wallet not found.' });
        }

        const amount = parseFloat(finalPrice);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid final price.' });
        }

        if (wallet.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
        }

        let orderedItems = [];
        if (singleProduct) {
            const product = JSON.parse(singleProduct);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                price: product.salePrice,
            });
            await Product.findByIdAndUpdate(product._id, {
                $inc: { quantity: -1 },
            });
        } else if (cart) {
            const cartItems = JSON.parse(cart);
            orderedItems = cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.totalPrice / item.quantity,
            }));
            cartItems.forEach(async item => {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { quantity: -item.quantity },
                });
            });
        }

        const addressDoc = await Address.findOne({ userId });
        const address = addressDoc.addresses.find(addr => addr._id.toString() === addressId);

        const newOrder = new Order({
            orderedItems,
            totalPrice,
            discount: discount,
            finalAmount: finalPrice,
            user: userId,
            address: address,
            status: 'Pending',
            paymentMethod: 'Wallet',
            paymentStatus: 'Completed',
            couponCode: coupon,
            couponApplied: Boolean(coupon && discount),
        });
        // console.log('sf',newOrder.finalAmount)
        await newOrder.save();

        const walletData = {
            $inc: { balance: -newOrder.finalAmount },
            $push: {
                transactions: {
                    type: "Purchase",
                    amount: newOrder.finalAmount,
                    orderId: newOrder._id
                }
            }
        }

        await Wallet.findOneAndUpdate(
            { userId: userId },
            walletData,
            { upsert: true, new: true }
        );


        res.status(200).json({ success: true, orderId: newOrder._id });
    } catch (error) {
        console.error("Error processing wallet payment:", error);
        res.status(500).json({ success: false, message: 'Failed to process wallet payment. Please try again.' });
    }
};


module.exports = {
    createOrder,
    verifyPayment,
    getRazorpayKey,
    getAddress,
    getOrderDetails,
    retryPayment,
    paymentFailed,
    walletPayment
};