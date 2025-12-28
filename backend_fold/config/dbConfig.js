require("dotenv").config();
const mongoose = require("mongoose")

const dbConnection = async()=>{
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI
    if (!uri) {
        console.error('MONGO_URI / MONGODB_URI not set in environment')
        throw new Error('Missing MongoDB connection string')
    }

    try {
        // Recommended options and explicit connect timeout
        await mongoose.connect(uri, {
            // Use the new url parser and unified topology by default in modern mongoose
            serverSelectionTimeoutMS: 10000, // fail fast if server unreachable
        })
        console.log("Db connected successfully")
    } catch (error) {
        console.error('MongoDB connection error:', error && error.message ? error.message : error)
        throw error
    }
}

module.exports = dbConnection