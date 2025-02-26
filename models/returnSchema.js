const mongoose = require('mongoose');
const { Schema } = mongoose;

const returnSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true // Index for faster user-based queries
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Order',
      index: true // Index for quick lookup by orderId

    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    returnStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true // Index for efficient filtering by return status

    }
  },
  { timestamps: true } 
);

const Return = mongoose.model('Return', returnSchema);
module.exports = Return;