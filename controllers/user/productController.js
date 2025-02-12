const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Brand = require('../../models/brandSchema');
const fs = require('fs');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema')
const Return = require('../../models/returnSchema')






const getProductDetails = async (req, res) => {
  try {

    const userId = req.session.user;
    const user = await User.findById(userId);
    const id = req.query.id;
    const productData = await Product.findOne({ _id: id });
    const category = await Category.findOne({ _id: productData.category });

    const productOffer = productData.productOffer || 0;
    const categoryOffer = category ? category.categoryOffer || 0 : 0;
    const highestOffer = Math.max(productOffer, categoryOffer);

    const discount = (productData.regularPrice * highestOffer) / 100;
    const finalSalePrice = productData.regularPrice - discount;

    const recommendedProducts = await Product.find({
      category: productData.category,
      _id: { $ne: productData._id }
    }).limit(4);

    res.render('product-details', {
      product: productData,
      cat: category,
      recProducts: recommendedProducts,
      user: user,
      finalSalePrice: Math.floor(finalSalePrice),
      highestOffer
    });

  } catch (error) {
    res.redirect('/page-not-found')
  }
}

const searchProduct = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.render("search-results", {
        products: [],
        searchTerm: ""
      });
    }

    // Create case-insensitive regex for names starting with the query
    const searchRegex = new RegExp(`^${query}`, 'i');

    const results = await Product.find({
      productName: searchRegex
    })
      .populate('category')  // Make sure category data is populated
      .limit(20);

    res.render("search-results", {
      products: results,
      searchTerm: query
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).render("error", {
      error: 'An error occurred while searching'
    });
  }
};




const getAllProducts = async (req, res) => {
  try {
    const limit = 12;
    const page = Math.max(1, parseInt(req.query.page) || 1);

    // Fetch products with pagination
    const products = await Product.find({ isBlocked: false })
      .limit(limit)
      .skip((page - 1) * limit);

    // Fetch all categories
    const cat = await Category.find();  // Changed to 'cat' to match template

    // Get total count for pagination
    const count = await Product.countDocuments({ isBlocked: false });

    res.render('all-products', {
      products,
      cat,                            // Categories for the filter dropdown
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });

  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.status(500).send("Internal Server Error");
  }
}




const getBrands = async (req, res) => {
  try {

    const brands = await Brand.find();
    res.render('brand-list', { brands });

  } catch (error) {

  }
}

const getCheckout = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect('/login');
    }

    const addressDoc = await Address.findOne({ userId: user });
    const addresses = addressDoc ? addressDoc.addresses : [];

    let totalPrice = 0;

    if (req.query.id) {
      const product = await Product.findOne({ _id: req.query.id, isBlocked: false });
      if (!product) {
        return res.redirect('/page-not-found');
      }
      totalPrice = product.salePrice;
      return res.render('checkout', { cart: null, product, address: addresses, totalPrice });
    } else {
      const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
      if (!cartItems) {
        return res.render('checkout', { cart: null, products: [], address: addresses, totalPrice, product: null });
      }
      totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
      return res.render('checkout', { cart: cartItems, products: cartItems.items, address: addresses, totalPrice, product: null });
    }
  } catch (error) {
    console.error("Error loading checkout page:", error);
    res.redirect('/page-not-found');
  }
};


const placeOrderInitial = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod } = req.body;
    let { cart, singleProduct, coupon, discount } = req.body;

    // Validate user and required fields
    if (!userId || !addressId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    let orderedItems = [];
    let totalPrice = 0;
    let finalPrice = 0;

    // Handle single product purchase
    if (singleProduct) {
      const product = await Product.findById(singleProduct);

      if (!product || product.isBlocked || product.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Product is unavailable'
        });
      }

      orderedItems.push({
        product: product._id,
        quantity: 1,
        price: product.salePrice
      });

      totalPrice = product.salePrice;
      finalPrice = totalPrice - (discount || 0);

      // Update product quantity
      await Product.findByIdAndUpdate(product._id, {
        $inc: { quantity: -1 }
      });
    }
    // Handle cart purchase
    else if (cart) {
      const userCart = await Cart.findOne({ userId }).populate('items.productId');

      if (!userCart || userCart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      // Validate product availability and prepare order items
      for (const item of userCart.items) {
        const product = item.productId;

        if (!product) {
          return res.status(400).json({
            success: false,
            message: `${product.productName} is not found`
          });
        }
        if (product.isBlocked) {
          return res.status(400).json({
            success: false,
            message: `${product.productName} is blocked by admin`
          });
        }
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `${product.productName} is out of stock`
          });
        }

        orderedItems.push({
          product: product._id,
          quantity: item.quantity,
          price: item.totalPrice / item.quantity
        });

        totalPrice += item.totalPrice;

        // Update product quantity
        await Product.findByIdAndUpdate(product._id, {
          $inc: { quantity: -item.quantity }
        });
      }

      finalPrice = totalPrice - (discount || 0);

      // Clear the user's cart after successful order
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [] } }
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'No items to order'
      });
    }

    const addressDoc = await Address.findOne({ userId });
    const address = addressDoc.addresses.find(addr => addr._id.toString() === addressId);

    // Create the order
    const newOrder = new Order({
      orderedItems,
      totalPrice,
      discount: discount || 0,
      finalAmount: finalPrice,
      user: userId,
      address: address,
      status: 'Pending',
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Completed',
      couponCode: coupon,
      couponApplied: Boolean(coupon && discount)
    });

    await newOrder.save();

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId: newOrder._id,
      paymentMethod
    });

  } catch (error) {
    console.error('Error placing order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to place order. Please try again.'
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { orderId, paymentDetails, paymentSuccess } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (paymentSuccess) {
      order.paymentStatus = 'Completed';
    } else {
      order.paymentStatus = 'Pending';
    }

    if (paymentDetails) {
      order.paymentDetails = paymentDetails;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order ${paymentSuccess ? 'completed' : 'pending due to payment failure'}`,
      orderId: order._id
    });
  } catch (error) {
    console.error("Error updating order payment status:", error);
    res.status(500).json({ success: false, message: 'Failed to update order. Please try again.' });
  }
};




const orderConfirm = async (req, res) => {
  try {

    const id = req.query.id
    const order = await Order.findById(id);
    res.render('order-confirmation', { order });

  } catch (error) {
    console.error("Error loading cofirmation page", error);
    res.redirect('/page-not-found');
  }
}


const getOrders = async (req, res) => {
  try {
    const { user: userId } = req.session;

    if (userId) {
      const user = await User.findById(userId);
      const limit = 10;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const orders = await Order.find({ user: userId })
        .populate('orderedItems.product')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
      const count = await Order.find({ user: userId })
      if (orders.length > 0) {
        res.render('orders', { orders, user, totalPages: Math.ceil(count.length / limit), currentPage: page });
      } else {
        res.render('orders', { orders: [], message: "No orders found.", user });
      }
    } else {
      return res.redirect('/login');
    }
  } catch (error) {
    console.error("Error loading orders page", error);
    res.status(500).redirect('/page-not-found');
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const id = req.query.id;
    const reason = req.query.reason;

    // First, find the order and verify it exists
    const order = await Order.findById(id);

    if (!order) {
      console.error(`Order not found for ID: ${id}`);
      return res.status(404).redirect('/orders');
    }

    // Update the order status
    await Order.findByIdAndUpdate(id, {
      $set: {
        status: 'Cancelled',
        cancellationReason: reason
      }
    });

    // Process refund for online payments
    if (order.paymentMethod && order.paymentMethod.trim().toLowerCase() === "online") {
      const walletData = {
        $inc: { balance: order.totalPrice },
        $push: {
          transactions: {
            type: "Refund",
            amount: order.totalPrice,
            orderId: order._id
          }
        }
      };

      const walletUpdate = await Wallet.findOneAndUpdate(
        { userId: userId },
        walletData,
        { upsert: true, new: true }
      );


      if (!walletUpdate) {
        throw new Error("Failed to update wallet");
      }
    }

    const updates = order.orderedItems.map(item =>
      Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } },
        { new: true }
      )
    );
    
    await Promise.all(updates);

    res.redirect('/orders');

  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).redirect('/page-not-found');
  }
};


const orderDetails = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.user;

    if (!userId) {
      return res.redirect('/login');
    }
    const user = await User.findById(userId);
    const order = await Order.findOne({ _id: orderId });
    const address = order.address

    const products = await Promise.all(
      order.orderedItems.map(async (item) => {
        return await Product.findOne({ _id: item.product });
      })
    );

    res.render('order-details', { order, products, address: address, user });
  } catch (error) {
    console.error("Error getting order details", error);
    res.redirect('/page-not-found');
  }
}


const getCouponList = async (req, res) => {
  try {

    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    const coupons = await Coupon.find({
      isList: true,
      userId: { $ne: user },
    });

    res.render('coupon-list', { coupons });

  } catch (error) {
    console.log(error)
  }
}

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, totalPrice } = req.body;
    const userId = req.session.user;

    const coupon = await Coupon.findOne({
      name: couponCode,
      isList: true,
      expireOn: { $gt: new Date() }
    });

    if (!coupon) {
      return res.json({
        success: false,
        message: 'Invalid or expired coupon code'
      });
    }

    if (coupon.userId.includes(userId)) {
      return res.json({
        success: false,
        message: 'Coupon has already been used by this user'
      });
    }

    let discountAmount = (totalPrice * coupon.offerPercentage) / 100;

    if (coupon.minimumPrice && totalPrice < coupon.minimumPrice) {
      return res.json({
        success: false,
        message: `Minimum purchase amount of ${coupon.minimumPrice} required`
      });
    }

    const discountedTotal = totalPrice - discountAmount;


    return res.json({
      success: true,
      message: 'Coupon applied successfully!',
      discountedTotal: discountedTotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2)
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to apply coupon'
    });
  }
};


const removeCoupon = async (req, res) => {
  try {

    const { totalPrice } = req.body;

    const discountAmount = 0;
    const finalTotal = totalPrice;

    res.json({
      success: true,
      discountAmount,
      finalTotal,
    });

  } catch (error) {
    console.error("Error removing coupon", error);
    res.status(500);
  }
}
const returnOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.session.user;

    const orderData = await Order.findById(orderId);
    if (!orderData) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await Order.findByIdAndUpdate(orderId, { $set: { status: 'Return Request' } })

    const Existingreturn = await Return.findOne({ orderId });
    if (Existingreturn) {
      return res.status(404).json({ message: 'Return request already submited for this order' })
    }

    const reasonData = new Return({
      userId,
      orderId,
      reason,
      refundAmount: orderData.finalAmount,
    });

    await reasonData.save();

    return res.status(200).json({ message: "Return Request Submitted Successfully" });

  } catch (error) {
    console.error("Error processing return request:", error);
    return res.status(500).json({ message: 'Something went wrong, please try again later.' });
  }
};


module.exports = {

  getProductDetails,
  searchProduct,
  getAllProducts,
  getBrands,
  getCheckout,
  placeOrderInitial,
  placeOrder,
  orderConfirm,
  getOrders,
  cancelOrder,
  orderDetails,
  getCouponList,
  applyCoupon,
  removeCoupon,
  returnOrder,
}