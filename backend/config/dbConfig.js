const mongoose = require('mongoose')

module.exports = async function dbConnection() {
  const uri = process.env.MONGO_URI || process.env.MONGO || ''
  if (!uri) {
    console.warn('MONGO_URI not set; skipping DB connect')
    return Promise.resolve()
  }
  try {
    await mongoose.connect(uri, {
      // options
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  }
}
