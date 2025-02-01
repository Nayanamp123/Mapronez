const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();
const session = require('express-session');


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        console.log("Email in sendVerificationEmail:", email);  // Log to check
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
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP: ${otp}</h4></b>`,
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
    }
}

const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;

    } catch (error) {

    }
}

const getForgotPassword = async (req, res) => {
    try {

        const message = req.query.msg || ""
        res.render('forgot-password', { message })

    } catch (error) {
        res.redirect('/page-not-found')
    }
}

const forgotEmailValid = async (req, res) => {
    try {

        const { email } = req.body;
        const findUser = await User.findOne({ email: email });

        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.forgOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp")
                console.log("OTP: " + otp);
            } else {
                res.json({ success: false, message: "Failed to send OTP. Please try again" })
            }
        } else {
            res.redirect("/forgot-password?msg=User with this email does not exist")
        }

    } catch (error) {
        res.redirect('/page-not-found')
    }
}

const verifyForgotOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;

        if (enteredOtp === req.session.forgOtp) {
            res.json({ success: true, redirectUrl: '/reset-password' });
        } else {
            res.json({ success: false, message: "OTP does not match. Please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};


const getResetPassPage = async (req, res) => {
    try {

        const message = req.query.msg || ""
        res.render('reset-password', message);

    } catch (error) {
        res.redirect('/page-not-found');
    }
}

const resendOtp = async (req, res) => {
    try {

        const otp = generateOtp();
        req.session.forgOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email: " + otp);
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resemd OTP:", otp);
            res.status(200).json({ success: true, message: "Resend OTP Successful" })
        }

    } catch (error) {
        console.error("Error in resend OTP ", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const resetPassword = async (req, res) => {
    try {

        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;
        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1);
            await User.updateOne({ email: email }, { $set: { password: passwordHash } })
            res.redirect('/login')
        } else {
            res.redirect('/reset-password?msg=Password do not match')
        }

    } catch (error) {
        res.redirect('/page-not-found')
    }
}

const getUserProfile = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const userData = await User.findById(user);

        res.render('profile', { user: userData});

    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("An error occurred while fetching the user profile.");
    }
};


const updateProfile = async (req, res) => {
    try {
        const id = req.query.id;
        const data = req.body;

        const updatedUser = await User.findByIdAndUpdate({_id:id},
            {
                username: data.dname,
                phone: data.phone,
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.redirect(`/profile`)

        // res.status(200).json({ message: "Profile updated successfully" });

    } catch (error) {
        res.status(500).json({
            message: "An error occurred while updating the profile",error: error.message, });
    }
};


const getAddress = async (req,res) => {
    try {
        
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const addressDoc = await Address.findOne({ userId: user });

        const addresses = addressDoc ? addressDoc.addresses : [];
        res.render('address',{address:addresses})

    } catch (error) {
        
    }
}


const getAddAddress = async (req,res) => {
    try {
        
        const user = req.session.user;
        if(!user){
            return res.redirect('/login') 
        }
        return res.render('add-address',{user})

    } catch (error) {
        res.redirect('/page-not-found')
    }
}

const saveAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId } = req.body;
        const { addressType, name, city, streetAddress, state, pincode, phone, altPhone } = req.body;

        const updatedAddress = {
            addressType,
            name,
            state,
            city,
            streetAddress,
            pincode,
            phone,
            altPhone,
        };

        let addressDoc = await Address.findOne({ userId: userId });

        if (addressDoc) {
            if (addressId) {
                const addressIndex = addressDoc.addresses.findIndex(addr => addr._id.toString() === addressId);
                if (addressIndex !== -1) {
                    addressDoc.addresses[addressIndex] = { ...addressDoc.addresses[addressIndex], ...updatedAddress };
                } else {
                    return res.status(404).json({ message: "Address not found" });
                }
            } else {
                addressDoc.addresses.push(updatedAddress);
            }
            await addressDoc.save();
            res.status(200).json({ message: "Address saved successfully", address: addressDoc });
        } else {
            addressDoc = new Address({
                userId: userId,
                addresses: [updatedAddress],
            });
            await addressDoc.save();
            res.status(201).json({ message: "Address saved successfully", address: addressDoc });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving address" });
    }
};


const deleteAddress = async (req,res) => {
    try {
        
        const user = req.session.user;
        const addressId = req.query.id;

        if (!user) {
            return res.redirect('/login');
        }

        const addressDoc = await Address.findOne({ userId: user });

        if (addressDoc) {
            addressDoc.addresses = addressDoc.addresses.filter(addr => addr._id.toString() !== addressId);
            await addressDoc.save();
            res.redirect('/address');
        } else {
            res.status(404).send("Address not found");
        }

    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).send("An error occurred while deleting the address.");
    }
}

const editAddress = async (req, res) => {
    const userId = req.session.user;
    const addressId = req.query.id;

    try {
        if (!userId) {
            return res.redirect('/login');
        }

        const addressDoc = await Address.findOne({ userId: userId });

        if (addressDoc) {
            const address = addressDoc.addresses.find(addr => addr._id.toString() === addressId);
            if (address) {
                res.render('edit-address', { address });
            } else {
                res.status(404).send('Address not found');
            }
        } else {
            res.status(404).send('Address document not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    getForgotPassword,
    forgotEmailValid,
    verifyForgotOtp,
    getResetPassPage,
    resendOtp,
    resetPassword,
    getUserProfile,
    updateProfile,
    getAddAddress,
    saveAddress,
    getAddress,
    deleteAddress,
    editAddress
}