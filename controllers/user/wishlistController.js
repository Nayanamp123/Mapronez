const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');

const getWishList = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const wishlistDoc = await Wishlist.findOne({ userId: user }).populate('products.productId');
        return res.render('wishlist', { products: wishlistDoc?.products || null });
    } catch (error) {
        console.error("Error loading wishlist", error);
        res.redirect('/page-not-found');
    }
};

const checkWishlistStatus = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.json({ inWishlist: false });
        }

        const productId = req.params.productId;
        const wishlist = await Wishlist.findOne({
            userId: user,
            'products.productId': productId
        });

        return res.json({ inWishlist: !!wishlist });
    } catch (error) {
        console.error("Error checking wishlist status:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({ error: "Please login first" });
        }

        let wishlistDoc = await Wishlist.findOne({ userId: user });
        if (wishlistDoc) {
            const productExists = wishlistDoc.products.some(item => 
                item.productId.toString() === productId
            );

            if (!productExists) {
                wishlistDoc.products.push({ productId });
                await wishlistDoc.save();
            }
        } else {
            wishlistDoc = new Wishlist({
                userId: user,
                products: [{ productId }]
            });
            await wishlistDoc.save();
        }

        res.status(200).json({ message: "Product added to wishlist" });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const removeItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Please login first" });
        }

        await Wishlist.findOneAndUpdate(
            { userId: userId },
            { $pull: { products: { productId: productId } } }
        );

        res.status(200).json({ message: "Product removed from wishlist" });
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = {
    getWishList,
    addToWishlist,
    removeItem,
    checkWishlistStatus
};