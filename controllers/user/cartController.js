const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');

const addToCart = async (req, res) => {
    try {
        const productId = req.query.id || req.body.productId;
        const user = req.session.user;

        if (!user) {
            return res.redirect('/login');
        }

        const product = await Product.findById(productId);
        const quantity = parseInt(req.body.quantity, 10) || 1;

        const totalPrice = product.salePrice * quantity || product.salePrice;

        const cartDoc = await Cart.findOne({ userId: user });

        if (cartDoc) {
            const existingItemIndex = cartDoc.items.findIndex(item => item.productId.toString() === productId);

            if (existingItemIndex >= 0) {

                const existingQuantity = cartDoc.items[existingItemIndex].quantity;

                if (existingQuantity + quantity < 5) {
                    cartDoc.items[existingItemIndex].quantity += quantity;
                    cartDoc.items[existingItemIndex].totalPrice += totalPrice;
                }

            } else {
                cartDoc.items.push({ productId, quantity, price: product.salePrice, totalPrice });
            }
            await cartDoc.save();
        } else {
            const newCart = new Cart({
                userId: user,
                items: [{ productId, quantity, price: product.salePrice, totalPrice }]
            });
            await newCart.save();
        }

        res.redirect('/cart');
    } catch (error) {
        console.error("Error adding to cart", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(userId);

        const cartItems = await Cart.findOne({ userId: userId }).populate('items.productId');

        if (!cartItems) {
            return res.render('cart', { cart: null, products: [], totalAmount: 0, user: user });
        }

        const totalAmount = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);

        res.render('cart', { cart: cartItems, products: cartItems.items, totalAmount, user: user });
    } catch (error) {
        console.error(error);
        res.redirect('/page-not-found');
    }
};


const removeCartItem = async (req, res) => {
    try {

        const userId = req.session.user;
        const { productId } = req.body;

        await Cart.findOneAndUpdate(
            { userId: userId },
            { $pull: { items: { productId: productId } } }
        );

        res.redirect("/cart");

    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.redirect("/page-not-found");
    }
}

const updateCart = async (req, res) => {
    const { productId, change } = req.body;
    try {

        const userId = req.session.user;
        if (!userId) {
            return res.json({ success: false, message: "User not logged in" });
        }

        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.json({ success: false, message: "Cart not found" });
        }

        const item = cart.items.find((item) => item.productId.toString() === productId);
        if (item) {
            item.quantity += change;
            item.totalPrice = item.quantity * item.price;

            if (item.quantity <= 0) {
                cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
            }

            cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
            await cart.save();

            res.json({
                success: true,
                newQuantity: item.quantity,
                newSubtotal: item.totalPrice,
                totalPrice: cart.totalPrice,
            });
        } else {
            res.json({ success: false, message: "Item not found in cart" });
        }

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Failed to update quantity" });
    }
};



module.exports = {
    addToCart,
    getCart,
    removeCartItem,
    updateCart
}