const Wallet = require('../../models/walletSchema');

const getWallet = async (req, res) => {
    try {
        console.log("Session data:", req.session);
        const userId = req.session.user;
        
        if (!userId) {
            return res.redirect('/login');
        }

        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        return res.render('wallet', { 
            wallet: wallet,
            transactions: wallet.transactions || [] 
        });
    } catch (error) {
        console.error("Error loading wallet:", error);
        return res.status(500).render('error', { 
            message: 'Error loading wallet. Please try again later.' 
        });
    }
}

module.exports = {
    getWallet
};