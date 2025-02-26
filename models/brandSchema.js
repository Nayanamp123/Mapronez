const mongoose = require("mongoose");
const { Schema } = mongoose;

const brandSchema = new Schema({
  brandName: {
    type: String,
    required: true,
    unique: true, // Ensuring unique brand names
    index: true,  // Index for faster brand lookups
  },
  brandImage: {
    type: String,
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true, // Index for filtering active/inactive brands

  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


const Brand = mongoose.model("Brand",brandSchema);

module.exports = Brand;