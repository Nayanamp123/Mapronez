const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema')
const Cart = require("../../models/cartSchema")


const categoryInfo = async (req,res) => {
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render('category',{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalcategories:totalCategories
        })

    } catch (error) {
        console.log(error);
        res.redirect('/pageerror')
    }
}

const addCategory = async (req,res) => {
    const { name, description } = req.body;

    try {
        // Case-insensitive check for existing category
        const existingCategory = await Category.findOne({
            name: { $regex: `^${name}$`, $options: 'i' }
        });

        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        return res.json({ message: "Category added successfully" });

    } catch (error) {
        console.log(error)
        return res.status(500).json({error:"Internal server error"})
    }
}

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage, 10);
        const categoryId = req.body.categoryId;

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Update the category offer
        category.categoryOffer = percentage;
        await category.save();

        // Get all products in this category
        const products = await Product.find({ category: categoryId });
        
        // Process each product and its cart items
        for (const product of products) {
            // Calculate effective offer (higher of product or category offer)
            const effectiveOffer = Math.max(percentage, product.productOffer);
            const newSalePrice = product.regularPrice - Math.floor(product.regularPrice * (effectiveOffer / 100));
            
            console.log('Product price update:', {
                productId: product._id,
                regularPrice: product.regularPrice,
                newSalePrice,
                effectiveOffer
            });

            // Update product sale price
            product.salePrice = newSalePrice;
            await product.save();

            // Find all carts containing this product
            const carts = await Cart.find({ "items.productId": product._id });
            
            // Update each cart
            for (const cart of carts) {
                const cartModified = cart.items.map(item => {
                    if (item.productId.toString() === product._id.toString()) {
                        const oldPrice = item.price;
                        item.price = newSalePrice;
                        item.totalPrice = newSalePrice * item.quantity;
                        
                        console.log('Cart item update:', {
                            cartId: cart._id,
                            productId: product._id,
                            oldPrice,
                            newPrice: item.price,
                            quantity: item.quantity,
                            newTotalPrice: item.totalPrice
                        });
                    }
                    return item;
                });

                cart.items = cartModified;
                await cart.save();
            }
        }

        res.json({ status: true });
    } catch (error) {
        console.error("Error adding category offer:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        
        // Find category and verify it exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Get all products in this category
        const products = await Product.find({ category: categoryId });
        
        // Process each product and its cart items
        for (const product of products) {
            // Calculate new sale price based on product offer only
            const newSalePrice = product.productOffer > 0 
                ? product.regularPrice - Math.floor(product.regularPrice * (product.productOffer / 100))
                : product.regularPrice;

            console.log('Product price update:', {
                productId: product._id,
                regularPrice: product.regularPrice,
                newSalePrice,
                productOffer: product.productOffer
            });

            // Update product sale price
            product.salePrice = newSalePrice;
            await product.save();

            // Find all carts containing this product
            const carts = await Cart.find({ "items.productId": product._id });
            
            // Update each cart
            for (const cart of carts) {
                const cartModified = cart.items.map(item => {
                    if (item.productId.toString() === product._id.toString()) {
                        const oldPrice = item.price;
                        item.price = newSalePrice;
                        item.totalPrice = newSalePrice * item.quantity;
                        
                        console.log('Cart item update:', {
                            cartId: cart._id,
                            productId: product._id,
                            oldPrice,
                            newPrice: item.price,
                            quantity: item.quantity,
                            newTotalPrice: item.totalPrice
                        });
                    }
                    return item;
                });

                cart.items = cartModified;
                await cart.save();
            }
        }

        // Reset category offer
        category.categoryOffer = 0;
        await category.save();

        res.json({ status: true });
    } catch (error) {
        console.error("Error removing category offer:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};
const getListCategory = async (req,res) => {
    try {
        
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/category')

    } catch (error) {
        res.redirect('/pageerror')
    }
}

const getUnlistCategory = async (req,res) => {
    try {
        
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/category')

    } catch (error) {
        res.redirect('/pageerror')
    }
}

const getEditCategory = async (req,res) => {
    try {
        
        const id = req.query.id;
        const category = await Category.findOne({_id:id});
        res.render('edit-category',{category:category})

    } catch (error) {
        res.redirect('/pageerror')
    }
}

const editCategory = async (req,res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;
        
        // First check if current category exists
        const currentCategory = await Category.findById(id);
        if (!currentCategory) {
            return res.status(404).json({ error: "Category not found" });
        }
    
        // Only check for duplicates if the name is being changed
        if (categoryName !== currentCategory.name) {
            // Check for existing category with same name (case-insensitive)
            const existingCategory = await Category.findOne({
                _id: { $ne: id }, // Exclude current category
                name: categoryName
            }).collation({ locale: 'en', strength: 2 }); // case-insensitive comparison
    
            if (existingCategory) {
                return res.status(400).json({ 
                    error: "Category already exists. Please choose another name" 
                });
            }
        }
    
        // If no duplicate found, update the category
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            {
                name: categoryName,
                description: description
            },
            { new: true }
        );
    
        if (updatedCategory) {
            res.redirect('/admin/category');
        } else {
            res.status(404).json({ error: "Category not found" });
        }
    } catch (error) {
        res.status(500).json({error:"Internal server error"})
    }
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory
}