const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
      index: true // Index for faster product searches
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
      index: true // Index for filtering products by brand

    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true // Index for category-based lookups

    },
    regularPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      required: false,
    },
    productOffer: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    color: {
      type: String,
      required: true,
    },
    productImage: {
      type: [String],
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Available", "Out of stock", "Discontinued"],
      required: true,
      default: "Available",
      index: true // Index for efficient filtering by status

    },
    popularity: {
      type: Number,
      default: 0,
      index: true // Index for sorting products by popularity

    },
      rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true // Index for sorting by rating

    },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema)

module.exports = Product;