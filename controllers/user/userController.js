const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Banner = require('../../models/bannerSchema');
const Wallet = require('../../models/walletSchema');
const Notification = require('../../models/notificationSchema');
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
  try {
    return res.render("page-404");
  } catch (error) {
    res.status(500).send("Server error")
  }
};

const loadHomepage = async (req, res) => {
  try {    
    
    const userData = req.session.user;
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) }
    });

    const user = await User.findById(req.session.user);
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(category => category._id) }
    }).populate('category');

    productData = productData.map(product => {
      const highestOffer = Math.max(product.productOffer || 0, product.category.categoryOffer || 0);
      const finalPrice = product.regularPrice - (product.regularPrice * (highestOffer / 100));
      
      return {
        ...product.toObject(),
        finalPrice: Math.floor(finalPrice),
        highestOffer
      };
    });

    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const products = productData.slice(0,8);
    
    let notifications = [];
    if (userData) {
      notifications = await Notification.find({
        userId: userData,
        status: "unread"
      });
    }

    // Modified render call to include user data
    return res.render('home', { 
      products: products, 
      cat: categories, 
      banner: findBanner || [],
      user: user,  // Add this line
      notifications: notifications || []
    });
    
  } catch (error) {
    console.log("Home page not found:", error);
    res.status(500).send("Server error");
  }
};

const loadSignup = async (req, res) => {
  try {
    // Check if there's a referral code in the query
    const referralCode = req.query.ref;
    
    return res.render("signup", {
      referralCode: referralCode || '',
      message: ''
    });
  } catch (error) {
    console.log("Sign Up page not loading :", error);
    res.status(500).send("Server Error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferalCode(length) {
  let result = '';
  const characters = 'abcdef0123456789';

  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }

  return result;
}

async function sendVerificationEmail(email, otp) {
  try {
    console.log("Email in sendVerificationEmail:", email);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    console.log("Sending email to:", email);

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4></b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
  }
}

const signup = async (req, res) => {
  try {
    const { username, phone, email, password, cpassword, referal } = req.body;
       
    if (password != cpassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exists",
      });
    }

    // Validate referral code if one was provided
    if (referal) {
      const referrer = await User.findOne({ referalCode: referal });
      if (!referrer) {
        return res.render("signup", {
          message: "Invalid referral code",
          referralCode: referal
        });
      }
    }

    const otp = generateOtp();
    
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = { username, phone, email, password, referal };

    res.render("verify-OTP");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("Signup error", error);
    res.redirect("/page-not-found");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error securing password:", error);
    throw error;
  }
}

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const referalCode = generateReferalCode(8);

      // Define fixed values for bonuses
      let refererBonus = 120;
      let newUserBonus = 100;
      
      // Check if user signed up with a referral
      if (user.referal) {
        const refererUser = await User.findOne({ referalCode: user.referal });

        if (refererUser) {
          // Add bonus to the referer's wallet
          await Wallet.findOneAndUpdate(
            { userId: refererUser._id },
            {
              $inc: { balance: refererBonus, referralEarnings: refererBonus },
              $push: {
                transactions: {
                  type: "referral",
                  amount: refererBonus,
                  description: "Referral bonus for referring a new user"
                }
              }
            },
            { upsert: true }
          );
          
          // Send notification to referer
          await Notification.create({
            userId: refererUser._id,
            message: `You received ${refererBonus} points for referring a new user!`,
            status: "unread",
            type: "referral"
          });
        }
      }

      const saveUserData = new User({
        username: user.username,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        referalCode: referalCode,
        referredBy: user.referal || null,
        ...(user.googleId && { googleId: user.googleId })
      });

      await saveUserData.save();
      
      // Create wallet for new user with bonus if signed up with referral
      await Wallet.create({
        userId: saveUserData._id,
        balance: user.referal ? newUserBonus : 0,
        referralEarnings: 0,
        transactions: user.referal
          ? [{
            type: "referral",
            amount: newUserBonus,
            description: "Referral bonus for signing up with a referral code"
          }]
          : []
      });
      
      // If user signed up with referral, send notification about their bonus
      if (user.referal) {
        await Notification.create({
          userId: saveUserData._id,
          message: `Welcome! You received ${newUserBonus} points for signing up with a referral code!`,
          status: "unread",
          type: "referral"
        });
      }
      
      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    console.log("mailllllll",req.session)
    if (!email) {
      return res.status(400).json({ success: false, message: "Email not found in session" })
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP: ", otp);
      console.log("mail",email)
      res.status(200).json({ success: true, message: "OTP resend " })
    } else {
      res.status(500).json({ success: false, message: "failed to resend OYP. Please try again" })
    }

  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({ success: false, message: "Internal server error. Please try again" })
  }
}

const loadLogin = async (req, res) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);
      if (user && user.isBlocked) {
        req.session.user = null;
        return res.render("login", { message: "User is blocked" });
      }
      return res.redirect("/");
    } else {
      return res.render("login", { message: '' });
    }

  } catch (error) {
    res.redirect('/page-not-found')
  }
};

const login = async (req, res) => {
  try {

    const { email, password } = req.body;
    const findUser = await User.findOne({
      isAdmin: 0,
      email: email
    })

    if (!findUser) {
      return res.render('login', { message: "User not found" })
    }

    if (findUser.isBlocked) {
      return res.render('login', { message: "User is blocked by admin" })
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render('login', { message: "Incorrect password" })
    }

    req.session.user = findUser._id;
    res.redirect('/')

  } catch (error) {
    console.error("Login error", error)
    res.render('login', { message: "Login failed. Please try again later" });
  }
}

const getLogoutPage = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
    } else {
      res.render('logout-user');
    }
  } catch (error) {
    console.error("Error loading logout page", error);
    res.status(500).json("Server Error")
  }
}

const logout = async (req, res) => {
  try {
    req.session.user = null;
    res.redirect('/login')

  } catch (error) {
    console.log("Logout error", error);
    res.redirect('/page-not-found');
  }
}

const sortProducts = async (req, res) => {
  try {
    const sortOption = req.query.sort || 'default';
    let sortCriteria;

    switch (sortOption) {
      case 'popularity':
        sortCriteria = { popularity: -1 };
        break;
      case 'price-low-high':
        sortCriteria = { salePrice: 1 };
        break;
      case 'price-high-low':
        sortCriteria = { salePrice: -1 };
        break;
      case 'rating':
        sortCriteria = { rating: -1 };
        break;
      case 'new-arrivals':
        sortCriteria = { createdAt: -1 };
        break;
      case 'alphabetical-a-z':
        sortCriteria = { productName: 1 };
        break;
      case 'alphabetical-z-a':
        sortCriteria = { productName: -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    const products = await Product.find().sort(sortCriteria);
    res.json({ products });

  } catch (error) {
    console.error('Error fetching sorted products:', error);
    res.status(500).json({ message: 'An error occurred while sorting products.' });
  }
};

const catFilter = async (req, res) => {
  try {
    const category = req.query.category;
    let products;

    if (category === 'all-categories') {
      products = await Product.find({});
    } else {
      products = await Product.find({ category: category });
    }

    res.json({ products });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching products' });
  }
}

// Referral system endpoints
const getReferralPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    
    const user = await User.findById(req.session.user);
    if (!user) {
      return res.redirect('/login');
    }
    
    // Generate referral URL
    const referralUrl = `${req.protocol}://${req.get('host')}/signup?ref=${user.referalCode}`;
    
    res.render('referral', {
      user: user,
      referralCode: user.referalCode,
      referralUrl: referralUrl
    });
  } catch (error) {
    console.error('Error loading referral page:', error);
    res.redirect('/page-not-found');
  }
};

const getMyReferrals = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    
    const user = await User.findById(req.session.user);
    if (!user) {
      return res.redirect('/login');
    }
    
    // Find users who signed up using this user's referral code
    const referredUsers = await User.find({ 
      referredBy: user.referalCode 
    }).select('username email createdAt').sort({ createdAt: -1 });
    
    // Get total earnings from wallet
    const wallet = await Wallet.findOne({ userId: user._id });
    
    res.render('my-referrals', {
      user: user,
      referredUsers: referredUsers,
      referralEarnings: wallet ? wallet.referralEarnings : 0,
      totalReferrals: referredUsers.length
    });
  } catch (error) {
    console.error('Error loading referrals page:', error);
    res.redirect('/page-not-found');
  }
};

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  getLogoutPage,
  logout,
  sortProducts,
  catFilter,
  getReferralPage,
  getMyReferrals
};