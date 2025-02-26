const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4, NIL } = require("uuid");

const generateShortId = () => {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let shortId = "";
  for (let i = 0; i < 6; i++) {
    shortId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return shortId;
};

const AddressSchema = new Schema({
  addressType: { type: String, required: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  streetAddress: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  phone: { type: String, required: true },
  altPhone: { type: String },
});

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => generateShortId(),
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Index for faster user-based lookups

  },
  orderedItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
  totalWithoutGst: {
    type: Number,
    default: 0,
  },
  totalWithGst: {
    type: Number,
    default: 0,
  },
  address: {
    type: AddressSchema,
    require: true,
  },
  razorpayDetails: {
    orderId: String,
    paymentId: String,
    signature: String
  },
  invoiceDate: {
    type: Date,
    index: true, // Index for sorting by invoice date
  },
  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return Request",
      "Returned",
    ],
    index: true, // Index for filtering by status

  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  couponCode:{
    type:String,
    required:false,
    index: true, // Index for filtering orders with a specific coupon

  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online','Wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Failed'],
    default: 'Pending',
    index: true, // Index for filtering by payment status

  },
  cancellationReason:{
    type:String
  },
  razorpayOrderId:{
    type: String 
  },
  razorpayPaymentId:{
    type: String
    },
  razorpaySignature:{
    type: String
  },
}, {
  timestamps: true
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
