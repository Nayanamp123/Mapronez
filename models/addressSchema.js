const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Index on userId for quick lookups

  },
  addresses: [
    {
      addressType: {
        type: String,
        required: true,
        
      },
      name: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      streetAddress: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
        index: true, // Index on pincode for faster searches

      },
      phone: {
        type: String,
        required: true,
        index: true, // Index on phone for quick lookups

      },
      altPhone: {
        type: String,
        required: false,
      },
    },
  ],
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
