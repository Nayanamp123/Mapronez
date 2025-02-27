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


// In your search-products route
const searchProduct = ('/search-products', async (req, res) => {
  try {
      // Get all categories first
      const categories = await Category.find({}).sort({ name: 1 });
      
      // Get search parameters
      const searchTerm = req.query.q || '';
      const sortBy = req.query.sort || 'default';
      const categoryId = req.query.category;

      // Build search query
      let query = {};
      
      if (searchTerm) {
          query.productName = { $regex: searchTerm, $options: 'i' };
      }
      
      if (categoryId && categoryId !== '') {
          query.category = categoryId;
      }

      // Get products
      const products = await Product.find(query)
          .populate('category')
          .sort(getSortingOrder(sortBy));

      // Render the page
      res.render('search-results', {
          products,
          categories,  // Pass categories to the template
          searchTerm,
          sortBy,
          category: categoryId
      });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).send('Error processing search');
  }
});

// Helper function for sorting
function getSortingOrder(sortBy) {
  switch(sortBy) {
      case 'price-low-high':
          return { salePrice: 1 };
      case 'price-high-low':
          return { salePrice: -1 };
      case 'alphabetical-a-z':
          return { productName: 1 };
      case 'alphabetical-z-a':
          return { productName: -1 };
      case 'rating':
          return { rating: -1 };
      case 'new-arrivals':
          return { createdAt: -1 };
      default:
          return {};
  }
}



const getAllProducts = async (req, res) => {
  try {
    const limit = 12;
    const page = Math.max(1, parseInt(req.query.page) || 1);

    // Fetch products with pagination
    const products = await Product.find({ isBlocked: false })
      .limit(limit)
      .skip((page - 1) * limit);

    // Fetch all categories
    const cat = await Category.find({isListed:true});

    // Get total count for pagination
    const count = await Product.countDocuments({ isBlocked: false });

    res.render('all-products', {
      products,
      cat,                            
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
    let gstAmount = 0;
    let totalWithoutGst = 0;
    let totalWithGst = 0;
    let discount = 0; // Initialize discount to 0

    if (req.query.id) {
      const product = await Product.findOne({ _id: req.query.id, isBlocked: false });
      if (!product) {
        return res.redirect('/page-not-found');
      }
      totalPrice = product.salePrice;
      
      // Calculate GST values
      totalWithoutGst = totalPrice - discount;
      gstAmount = (totalWithoutGst * 18) / 100; // 18% GST
      totalWithGst = totalWithoutGst + gstAmount;

      return res.render('checkout', { 
        cart: null, 
        product, 
        address: addresses, 
        totalPrice,
        totalWithoutGst,
        gstAmount,
        totalWithGst,
        discount // Pass discount to template
      });
    } else {
      const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
      if (!cartItems) {
        return res.render('checkout', { 
          cart: null, 
          products: [], 
          address: addresses, 
          totalPrice: 0,
          totalWithoutGst: 0,
          gstAmount: 0,
          totalWithGst: 0,
          discount: 0, // Pass discount to template
          product: null 
        });
      }
      totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Calculate GST values
      totalWithoutGst = totalPrice - discount;
      gstAmount = (totalWithoutGst * 18) / 100; // 18% GST
      totalWithGst = totalWithoutGst + gstAmount;

      return res.render('checkout', { 
        cart: cartItems, 
        products: cartItems.items, 
        address: addresses, 
        totalPrice,
        totalWithoutGst,
        gstAmount,
        totalWithGst,
        discount, // Pass discount to template
        product: null 
      });
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
    singleProduct && (singleProduct = JSON.parse(singleProduct))
    
    if (!userId || !addressId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    let orderedItems = [];
    let totalPrice = 0;
    let finalPrice = 0;

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
    } else if (cart) {
      const userCart = await Cart.findOne({ userId }).populate('items.productId');
      if (!userCart || userCart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      for (const item of userCart.items) {
        const product = item.productId;
        if (!product || product.isBlocked || product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Product ${product?.productName || 'Unknown'} is unavailable`
          });
        }
        
        orderedItems.push({
          product: product._id,
          quantity: item.quantity,
          price: item.totalPrice / item.quantity
        });
        totalPrice += item.totalPrice;
        
        await Product.findByIdAndUpdate(product._id, {
          $inc: { quantity: -item.quantity }
        });
      }

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

    // Calculate GST and final amounts
    const gstPercentage = 18;
    const totalWithoutGst = totalPrice - (discount || 0);
    const gstAmount = (totalWithoutGst * gstPercentage) / 100;
    const totalWithGst = totalWithoutGst + gstAmount;

    const addressDoc = await Address.findOne({ userId });
    const address = addressDoc.addresses.find(addr => addr._id.toString() === addressId);

    const newOrder = new Order({
      orderedItems,
      totalPrice,
      discount: discount || 0,
      finalAmount: totalWithGst,
      gstAmount,
      totalWithoutGst,
      totalWithGst,
      user: userId,
      address: address,
      status: 'Pending',
      paymentMethod,
      paymentStatus: 'Pending',
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

    // console.log('Order details:', {
    //   paymentMethod: order.paymentMethod,
    //   finalAmount: order.finalAmount,
    //   status: order.status
    // });

    // Update the order status
    await Order.findByIdAndUpdate(id, {
      $set: {
        status: 'Cancelled',
        cancellationReason: reason
      }
    });

    // Process refund for both Online and Wallet payments
    if (order.paymentMethod === 'Online' || order.paymentMethod === 'Wallet') {
      console.log(`Processing refund for ${order.paymentMethod} payment`);

      const walletData = {
        $inc: { balance: order.finalAmount },
        $push: {
          transactions: {
            type: "Refund",
            amount: order.finalAmount,
            orderId: order._id,
            status: 'Completed',
            description: `Refund for cancelled order ${order.orderId}`
          }
        }
      };

      console.log('Wallet update data:', walletData);

      const walletUpdate = await Wallet.findOneAndUpdate(
        { userId: userId },
        walletData,
        { upsert: true, new: true }
      );

      console.log('Wallet update result:', walletUpdate);

      if (!walletUpdate) {
        console.error('Failed to update wallet for user:', userId);
        throw new Error("Failed to update wallet");
      }
    } else {
      console.log('No refund needed - payment method:', order.paymentMethod);
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

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const startDate = new Date(coupon.createdOn);
    const endDate = new Date(coupon.expireOn);

    if (currentDate < startDate) {
      return res.status(400).json({
        message: 'Coupon not active yet',
        validFrom: startDate
      });
    }

    if (currentDate > endDate) {
      return res.status(400).json({ message: 'Coupon has expired' });
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
    res.status(500).json({
      success: false,
      message: 'Failed to remove coupon'
    });
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