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
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  couponCode:{
    type:String,
    required:false
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online','Wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Failed'],
    default: 'Pending'
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
