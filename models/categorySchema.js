const mongoose = require('mongoose');
const {Schema} = mongoose;

const categorySchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true,
        index: true, // Index for filtering active/inactive categories

    },
    categoryOffer:{
        type:Number,
        default:0,
        index: true, // Index for sorting/filtering by discount

    },
    createdAt:{
        type:Date,
        default:Date.now,
        index: true, // Index for retrieving categories by creation date

    }
})

const Category = mongoose.model("Category",categorySchema)

module.exports = Category;