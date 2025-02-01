const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Brand = require('../../models/brandSchema');
const fs = require('fs');







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
    const { category, q } = req.query;
    const searchCriteria = {};
  
    if (category) {
      searchCriteria.category = category
    }
  
    if (q) {
      searchCriteria.productName = { $regex: q, $options: 'i' };
    }
  
    try {
  
      console.log(category);
      const limit = 12;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const products = await Product.find(searchCriteria)
      .populate('category', 'name')
      .limit(limit)
      .skip((page - 1) * limit);
  
      const count = await Product.countDocuments(searchCriteria);
  
      res.render('search-results', { products, 
        searchTerm: q,
        totalPages:Math.ceil(count/limit),
        currentPage:page
      });
  
    } catch (error) {
      console.error("Error fetching search results:", error);
      res.status(500).send("Internal Server Error");
    }
  }
  



  const getAllProducts = async (req,res) => {
    try {
      const limit = 12;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      
      // Fetch products with pagination
      const products = await Product.find({isBlocked:false})
        .limit(limit)
        .skip((page - 1) * limit);
      
      // Fetch all categories
      const cat = await Category.find();  // Changed to 'cat' to match template
      
      // Get total count for pagination
      const count = await Product.countDocuments({isBlocked:false});
  
      res.render('all-products', {
        products,
        cat,                            // Categories for the filter dropdown
        totalPages: Math.ceil(count/limit),
        currentPage: page
      });
  
    } catch (error) {
      console.error("Error in getAllProducts:", error);
      res.status(500).send("Internal Server Error");
    }
  }
  



  const getBrands = async (req,res) => {
    try {
      
      const brands = await Brand.find();
      res.render('brand-list',{brands});
  
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
        const product = await Product.findOne({_id:req.query.id,isBlocked:false});
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


  module.exports = {

    getProductDetails,
    searchProduct,
    getAllProducts,
    getBrands,
    getCheckout,

  }