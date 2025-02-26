const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expireOn: {
    type: Date,
    required: true,
    index: true, // Index for filtering active/expired coupons

  },
  offerPercentage: {
    type: Number,
    required: true,
    index: true, // Index for sorting/filtering by discount

  },
  minimumPrice: {
    type: Number,
    required: true,
    index: true, // Index for price-based filtering

  },
  isList: {
    type: Boolean,
    default: true,
    index: true, // Index for filtering active/inactive coupons

  },
  userId: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const Coupon = mongoose.model("Coupon", couponSchema);
  
module.exports = Coupon;
