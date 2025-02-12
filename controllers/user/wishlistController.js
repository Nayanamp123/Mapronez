const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');


const getWishList = async (req,res) => {
    try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/login');
      }
  
      const wishlistDoc = await Wishlist.findOne({userId:user}).populate('products.productId');
      console.log(wishlistDoc,"asdfghjdfgh")
      if(wishlistDoc){
        return res.render('wishlist',{products:wishlistDoc.products});
      }else{
        return res.render('wishlist',{products:null});
      }
  
      
    } catch (error) {
      console.error("Error loading wishlist",error);
      res.redirect('/page-not-found');
    }
  }

  const addToWishlist = async (req,res) => {
    try {
        
        const {productId} = req.body;
        const user = req.session.user;
        
        if (!user) {
            return res.redirect('/login');
        }

        let wishlistDoc = await Wishlist.findOne({ userId: user });
        if(wishlistDoc){
            const productExists = wishlistDoc.products.some(item => item.productId.toString() === productId);

            if(!productExists){
                wishlistDoc.products.push({ productId });
                await wishlistDoc.save();
            }
        }else{
            wishlistDoc = new Wishlist({
                userId: user,
                products: [{ productId }]
            });
            await wishlistDoc.save();
        }
        res.redirect('/wishlist');

    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).send("An error occurred")
    }
  }

  const removeItem = async (req,res) => {
    try {
        
        const userId = req.session.user;
        const { productId } = req.body;

        await Wishlist.findOneAndUpdate(
            {userId:userId},
            {$pull:{products:{productId:productId}}}
        )

        res.redirect('/wishlist')

    } catch (error) {
        
    }
  }

  module.exports = {
    getWishList,
    addToWishlist,
    removeItem
  }