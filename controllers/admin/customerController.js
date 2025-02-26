const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || '';
        let page = Number(req.query.page) || 1;  // Get the current page number
        const limit = 3;  // Number of users per page
        const skip = (page - 1) * limit;  // Calculate how many users to skip
        
        console.log(`Fetching users for Page: ${page}, Skipping: ${skip}, Search: ${search}`);
        
        const queryCondition = {
            isAdmin: false,
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };
        
        // Count total users
        const totalUsers = await User.countDocuments(queryCondition);
        const totalPages = Math.ceil(totalUsers / limit); // Calculate total pages
        
        // Fetch paginated users (skip users based on page number)
        const userData = await User.find(queryCondition)
            .skip(skip)  // Skip already displayed users
            .limit(limit); // Limit users per page
        
        console.log(`Users Fetched on Page ${page}:`, userData.length, `Total Pages: ${totalPages}`);
        
        res.render('customers', {
            data: userData,
            totalPages,
            currentPage: page,
            search
        });
    } catch (error) {
        console.error('Error in customerInfo:', error);
        res.redirect('/pageerror');
    }
};

// Blocking a customer
const customerBlocked = async (req, res) => {
    try {
        await User.updateOne({ _id: req.query.id }, { $set: { isBlocked: true } });
        
        // Preserve pagination and search params in redirect
        const page = req.query.page || 1;
        const search = req.query.search || '';
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
        
        res.redirect(`/admin/users?page=${page}${searchParam}`);
    } catch (error) {
        console.error('Error in customerBlocked:', error);
        res.redirect('/pageerror');
    }
};

// Unblocking a customer
const customerUnblocked = async (req, res) => {
    try {
        await User.updateOne({ _id: req.query.id }, { $set: { isBlocked: false } });
        
        // Preserve pagination and search params in redirect
        const page = req.query.page || 1;
        const search = req.query.search || '';
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
        
        res.redirect(`/admin/users?page=${page}${searchParam}`);
    } catch (error) {
        console.error('Error in customerUnblocked:', error);
        res.redirect('/pageerror');
    }
};

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
};