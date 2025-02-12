const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');

const createCodOrder = async (req, res) => {
    try {
        const { cart, totalPrice, addressId, singleProduct, finalPrice, coupon, discount } = req.body;
        const userId = req.session.user;

        // Validate required fields
        if (!userId || !finalPrice || (!cart && !singleProduct)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields.' 
            });
        }

        // Validate address
        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address is required'
            });
        }

        // Process ordered items
        let orderedItems = [];
        if (singleProduct) {
            const product = JSON.parse(singleProduct);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                price: product.salePrice,
            });
            
            // Update product quantity
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

            // Update quantities for all cart items
            for (const item of cartItems) {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { quantity: -item.quantity },
                });
            }
        }

        // Create new order
        const newOrder = new Order({
            orderedItems,
            totalPrice,
            discount: discount,
            finalAmount: finalPrice,
            user: userId,
            address: addressId,
            status: 'Pending',
            paymentMethod: 'COD',
            paymentStatus: 'Pending',
            couponCode: coupon,
            couponApplied: Boolean(coupon && discount),
        });

        await newOrder.save();

        res.status(200).json({ 
            success: true, 
            message: 'Order placed successfully',
            orderId: newOrder._id 
        });

    } catch (error) {
        console.error("Error processing COD order:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process order. Please try again.' 
        });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user;

        // Find order and populate product details
        const order = await Order.findOne({ _id: orderId, user: userId })
            .populate({
                path: 'orderedItems.product',
                select: 'name images price salePrice'
            })
            .populate({
                path: 'address',
                select: 'name email phone streetAddress city state pincode'
            });

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Format the response
        const orderDetails = {
            orderId: order._id,
            orderDate: order.createdAt,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            items: order.orderedItems.map(item => ({
                product: {
                    name: item.product.name,
                    image: item.product.images[0],
                    price: item.price
                },
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            })),
            address: {
                name: order.address.name,
                email: order.address.email,
                phone: order.address.phone,
                streetAddress: order.address.streetAddress,
                city: order.address.city,
                state: order.address.state,
                pincode: order.address.pincode
            },
            pricing: {
                subtotal: order.totalPrice,
                discount: order.discount || 0,
                finalAmount: order.finalAmount,
                couponApplied: order.couponApplied,
                couponCode: order.couponCode
            }
        };

        res.json({
            success: true,
            orderDetails
        });

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch order details' 
        });
    }
};

module.exports = {
    createCodOrder,
    getOrderDetails,
    
};