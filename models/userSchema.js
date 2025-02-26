const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    index: true // Add index for username searches
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true // Add index since it's unique and frequently queried
  },
  phone: {
    type: String,
    required: false,
    unique: false,
    sparse: true,
    default: null,
    index: true // Add index for phone number searches
  },
  googleId: {
    type: String,
    required: false,
    sparse: true,
    index: true // Add index for Google OAuth queries
  },
  password: {
    type: String,
    required: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true // Add index for filtering blocked users
  },
  isAdmin: {
    type: Boolean,
    default: false,
    index: true // Add index for filtering admin users
  },
  addresses: [
    {
      type: Schema.Types.ObjectId,
      ref: "Address"
    }
  ],
  cart: [
    {
      type: Schema.Types.ObjectId,
      ref: "Cart",
    },
  ],
  wallet: [
    {
      type: Schema.Types.ObjectId,
      ref: "Wishlist",
    },
  ],
  orderHistory: [
    {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  createdOn: {
    type: Date,
    default: Date.now,
    index: true // Add index for date-based queries
  },
  referalCode: {
    type: String,
    index: true // Add index for referral code lookups
  },
  redeemed: {
    type: Boolean,
  },
  redeemedUser: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  searchHistory: [
    {
      category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
      brand: {
        type: String,
      },
      searchOn: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, { 
  timestamps: true 
});



const User = mongoose.model('User',userSchema);

module.exports = User;
