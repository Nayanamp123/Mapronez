const mongoose = require("mongoose");
const { Schema } = mongoose;

const bannerSchema = new Schema({
  image: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    index: true, // Index for faster banner lookups by title

  },
  description: {
    type: String,
    required: true,
  },
  link: {
    type: String,
  },
  startDate: {
    type: Date,
    required: true,
    index: true, // Index for filtering banners by start date

  },
  endDate: {
    type: Date,
    required: true,
    index: true, // Index for filtering banners by end date

  },
});

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
