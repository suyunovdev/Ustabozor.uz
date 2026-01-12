const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.log('⚠️ Server davom etmoqda MongoDB\'siz...');
        console.log('💡 MongoDB Atlas > Network Access > Add IP Address > Allow from Anywhere');
        // Server to'xtamaydi, lekin DB funksiyalari ishlamaydi
    }
};

module.exports = connectDB;
