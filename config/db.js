const mongoose =require(`mongoose`);
const env =require(`dotenv`).config();



const connectDB= async()=>{
    try{
      await   mongoose.connect(process.env.MONGODB_URI)
        console.log("DB Connected")
    }catch(error){

    }
}

module.exports = connectDB;