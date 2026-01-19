// Script to seed sample data/airtime packages
// Run: node scripts/seedPackages.js

require('dotenv').config()
const mongoose = require('mongoose')
const DataAirtimePackage = require('../models/dataAirtimePackage')

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/earnflow'

const packages = [
  // Data Packages
  { name: '100MB Data', type: 'data', provider: 'MTN', amount: 50, balance: 100, description: 'MTN 100MB Data Pack', icon: '📱' },
  { name: '500MB Data', type: 'data', provider: 'MTN', amount: 200, balance: 500, description: 'MTN 500MB Data Pack', icon: '📱' },
  { name: '1GB Data', type: 'data', provider: 'MTN', amount: 350, balance: 1024, description: 'MTN 1GB Data Pack', icon: '📱' },
  { name: '2GB Data', type: 'data', provider: 'MTN', amount: 650, balance: 2048, description: 'MTN 2GB Data Pack', icon: '📱' },
  
  { name: '100MB Data', type: 'data', provider: 'Airtel', amount: 50, balance: 100, description: 'Airtel 100MB Data Pack', icon: '📱' },
  { name: '500MB Data', type: 'data', provider: 'Airtel', amount: 200, balance: 500, description: 'Airtel 500MB Data Pack', icon: '📱' },
  { name: '1GB Data', type: 'data', provider: 'Airtel', amount: 350, balance: 1024, description: 'Airtel 1GB Data Pack', icon: '📱' },
  { name: '2GB Data', type: 'data', provider: 'Airtel', amount: 650, balance: 2048, description: 'Airtel 2GB Data Pack', icon: '📱' },
  
  { name: '100MB Data', type: 'data', provider: 'Glo', amount: 50, balance: 100, description: 'Glo 100MB Data Pack', icon: '📱' },
  { name: '500MB Data', type: 'data', provider: 'Glo', amount: 200, balance: 500, description: 'Glo 500MB Data Pack', icon: '📱' },
  { name: '1GB Data', type: 'data', provider: 'Glo', amount: 350, balance: 1024, description: 'Glo 1GB Data Pack', icon: '📱' },
  { name: '2GB Data', type: 'data', provider: 'Glo', amount: 650, balance: 2048, description: 'Glo 2GB Data Pack', icon: '📱' },

  // Airtime Packages
  { name: '₦100 Airtime', type: 'airtime', provider: 'MTN', amount: 100, balance: 100, description: 'MTN ₦100 Airtime', icon: '📞' },
  { name: '₦200 Airtime', type: 'airtime', provider: 'MTN', amount: 200, balance: 200, description: 'MTN ₦200 Airtime', icon: '📞' },
  { name: '₦500 Airtime', type: 'airtime', provider: 'MTN', amount: 500, balance: 500, description: 'MTN ₦500 Airtime', icon: '📞' },
  { name: '₦1,000 Airtime', type: 'airtime', provider: 'MTN', amount: 1000, balance: 1000, description: 'MTN ₦1,000 Airtime', icon: '📞' },

  { name: '₦100 Airtime', type: 'airtime', provider: 'Airtel', amount: 100, balance: 100, description: 'Airtel ₦100 Airtime', icon: '📞' },
  { name: '₦200 Airtime', type: 'airtime', provider: 'Airtel', amount: 200, balance: 200, description: 'Airtel ₦200 Airtime', icon: '📞' },
  { name: '₦500 Airtime', type: 'airtime', provider: 'Airtel', amount: 500, balance: 500, description: 'Airtel ₦500 Airtime', icon: '📞' },
  { name: '₦1,000 Airtime', type: 'airtime', provider: 'Airtel', amount: 1000, balance: 1000, description: 'Airtel ₦1,000 Airtime', icon: '📞' },

  { name: '₦100 Airtime', type: 'airtime', provider: 'Glo', amount: 100, balance: 100, description: 'Glo ₦100 Airtime', icon: '📞' },
  { name: '₦200 Airtime', type: 'airtime', provider: 'Glo', amount: 200, balance: 200, description: 'Glo ₦200 Airtime', icon: '📞' },
  { name: '₦500 Airtime', type: 'airtime', provider: 'Glo', amount: 500, balance: 500, description: 'Glo ₦500 Airtime', icon: '📞' },
  { name: '₦1,000 Airtime', type: 'airtime', provider: 'Glo', amount: 1000, balance: 1000, description: 'Glo ₦1,000 Airtime', icon: '📞' },

  { name: '₦100 Airtime', type: 'airtime', provider: '9mobile', amount: 100, balance: 100, description: '9mobile ₦100 Airtime', icon: '📞' },
  { name: '₦200 Airtime', type: 'airtime', provider: '9mobile', amount: 200, balance: 200, description: '9mobile ₦200 Airtime', icon: '📞' },
  { name: '₦500 Airtime', type: 'airtime', provider: '9mobile', amount: 500, balance: 500, description: '9mobile ₦500 Airtime', icon: '📞' },
  { name: '₦1,000 Airtime', type: 'airtime', provider: '9mobile', amount: 1000, balance: 1000, description: '9mobile ₦1,000 Airtime', icon: '📞' }
]

async function seedPackages() {
  try {
    await mongoose.connect(dbUri)
    console.log('Connected to MongoDB')

    // Clear existing packages
    await DataAirtimePackage.deleteMany({})
    console.log('Cleared existing packages')

    // Insert new packages
    const result = await DataAirtimePackage.insertMany(packages)
    console.log(`✓ Seeded ${result.length} packages successfully!`)
    console.log('  - Data packages:', packages.filter(p => p.type === 'data').length)
    console.log('  - Airtime packages:', packages.filter(p => p.type === 'airtime').length)

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  } catch (err) {
    console.error('Error seeding packages:', err)
    process.exit(1)
  }
}

seedPackages()
