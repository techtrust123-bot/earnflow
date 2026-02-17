// Real Data & Airtime Integration Service
// This service handles real data and airtime reselling using Paystack API

const axios = require('axios')
require('dotenv').config()

class DataAirtimeService {
  // Purchase data using Paystack
  static async purchaseData(provider, phoneNumber, dataAmount, amount) {
    try {
      // Map provider to Paystack network codes
      const networkMap = {
        'MTN': '01',
        'AIRTEL': '02',
        'GLO': '03',
        '9MOBILE': '04',
        'MTN': '01' // fallback
      }

      const network = networkMap[provider.toUpperCase()] || '01'

      // Use Paystack Data API
      const response = await axios.post('https://api.paystack.co/data/purchase', {
        network,
        phone: phoneNumber,
        plan: this.getDataPlanId(provider, dataAmount),
        amount: amount * 100 // Convert to kobo
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.data.status) {
        return {
          success: true,
          message: 'Data purchased successfully',
          reference: response.data.data.reference || `DATA-${Date.now()}`,
          provider,
          phoneNumber,
          dataAmount,
          amount,
          status: 'completed',
          timestamp: new Date(),
          providerResponse: response.data
        }
      } else {
        return {
          success: false,
          message: response.data.message || 'Data purchase failed',
          error: response.data
        }
      }

    } catch (error) {
      console.error('Data purchase error:', error.response?.data || error.message)

      // Retry logic (up to 3 attempts)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)) // Wait 2s, 4s
          const retryResponse = await this.purchaseData(provider, phoneNumber, dataAmount, amount)
          if (retryResponse.success) return retryResponse
        } catch (retryError) {
          console.error(`Retry ${attempt} failed:`, retryError.message)
        }
      }

      return {
        success: false,
        message: 'Failed to process data purchase after retries',
        error: error.response?.data || error.message
      }
    }
  }

  // Purchase airtime using Paystack
  static async purchaseAirtime(provider, phoneNumber, airtimeAmount, amount) {
    try {
      // Map provider to Paystack network codes
      const networkMap = {
        'MTN': '01',
        'AIRTEL': '02',
        'GLO': '03',
        '9MOBILE': '04',
        'MTN': '01' // fallback
      }

      const network = networkMap[provider.toUpperCase()] || '01'

      // Use Paystack Airtime API
      const response = await axios.post('https://api.paystack.co/airtime/purchase', {
        network,
        phone: phoneNumber,
        amount: airtimeAmount * 100 // Convert to kobo
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.data.status) {
        return {
          success: true,
          message: 'Airtime purchased successfully',
          reference: response.data.data.reference || `AIRTIME-${Date.now()}`,
          provider,
          phoneNumber,
          airtimeAmount,
          amount,
          status: 'completed',
          timestamp: new Date(),
          providerResponse: response.data
        }
      } else {
        return {
          success: false,
          message: response.data.message || 'Airtime purchase failed',
          error: response.data
        }
      }

    } catch (error) {
      console.error('Airtime purchase error:', error.response?.data || error.message)

      // Retry logic (up to 3 attempts)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)) // Wait 2s, 4s
          const retryResponse = await this.purchaseAirtime(provider, phoneNumber, airtimeAmount, amount)
          if (retryResponse.success) return retryResponse
        } catch (retryError) {
          console.error(`Retry ${attempt} failed:`, retryError.message)
        }
      }

      return {
        success: false,
        message: 'Failed to process airtime purchase after retries',
        error: error.response?.data || error.message
      }
    }
  }

  // Get data plan ID based on provider and amount
  static getDataPlanId(provider, dataAmount) {
    // This would need to be mapped to actual Paystack data plan IDs
    // For now, return a placeholder - in production, you'd have a database of plan mappings
    const planMap = {
      'MTN': {
        '100': 'MTN_100MB',
        '500': 'MTN_500MB',
        '1000': 'MTN_1GB',
        '2000': 'MTN_2GB'
      },
      'AIRTEL': {
        '100': 'AIRTEL_100MB',
        '500': 'AIRTEL_500MB',
        '1000': 'AIRTEL_1GB',
        '2000': 'AIRTEL_2GB'
      },
      'GLO': {
        '100': 'GLO_100MB',
        '500': 'GLO_500MB',
        '1000': 'GLO_1GB',
        '2000': 'GLO_2GB'
      },
      '9MOBILE': {
        '100': '9MOBILE_100MB',
        '500': '9MOBILE_500MB',
        '1000': '9MOBILE_1GB',
        '2000': '9MOBILE_2GB'
      }
    }

    return planMap[provider.toUpperCase()]?.[dataAmount.toString()] || `${provider}_${dataAmount}MB`
  }

  // Verify transaction status
  static async verifyTransaction(provider, reference) {
    try {
      // For Paystack, we can verify using their verify endpoint
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      })

      return {
        success: response.data.data.status === 'success',
        status: response.data.data.status,
        reference,
        details: response.data.data
      }
    } catch (error) {
      console.error('Verification error:', error.response?.data || error.message)
      return {
        success: false,
        message: 'Failed to verify transaction',
        error: error.response?.data || error.message
      }
    }
  }

  // Get provider API status
  static async getProviderStatus() {
    try {
      // Check Paystack service status
      const response = await axios.get('https://api.paystack.co/health', {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      })

      const isHealthy = response.data.status === 'ok'

      return {
        mtn: { status: isHealthy ? 'active' : 'inactive', networks: ['4G', '3G', '2G'] },
        airtel: { status: isHealthy ? 'active' : 'inactive', networks: ['4G', '3G', '2G'] },
        glo: { status: isHealthy ? 'active' : 'inactive', networks: ['4G', '3G', '2G'] },
        '9mobile': { status: isHealthy ? 'active' : 'inactive', networks: ['4G', '3G', '2G'] },
        paystack: { status: isHealthy ? 'active' : 'inactive' }
      }
    } catch (error) {
      console.error('Provider status check error:', error.message)
      // Fallback status
      return {
        mtn: { status: 'active', networks: ['4G', '3G', '2G'] },
        airtel: { status: 'active', networks: ['4G', '3G', '2G'] },
        glo: { status: 'active', networks: ['4G', '3G', '2G'] },
        '9mobile': { status: 'active', networks: ['4G', '3G', '2G'] },
        paystack: { status: 'unknown' }
      }
    }
  }

  // Get available data plans (would need to be implemented with actual Paystack data plans)
  static async getDataPlans(provider) {
    // In production, fetch from Paystack or maintain a local database
    // For now, return sample plans
    const plans = {
      'MTN': [
        { id: 'MTN_100MB', name: '100MB Data', amount: 100, data: '100MB', validity: '1 day' },
        { id: 'MTN_500MB', name: '500MB Data', amount: 200, data: '500MB', validity: '7 days' },
        { id: 'MTN_1GB', name: '1GB Data', amount: 300, data: '1GB', validity: '30 days' },
        { id: 'MTN_2GB', name: '2GB Data', amount: 500, data: '2GB', validity: '30 days' }
      ],
      'AIRTEL': [
        { id: 'AIRTEL_100MB', name: '100MB Data', amount: 100, data: '100MB', validity: '1 day' },
        { id: 'AIRTEL_500MB', name: '500MB Data', amount: 200, data: '500MB', validity: '7 days' },
        { id: 'AIRTEL_1GB', name: '1GB Data', amount: 300, data: '1GB', validity: '30 days' },
        { id: 'AIRTEL_2GB', name: '2GB Data', amount: 500, data: '2GB', validity: '30 days' }
      ],
      'GLO': [
        { id: 'GLO_100MB', name: '100MB Data', amount: 100, data: '100MB', validity: '1 day' },
        { id: 'GLO_500MB', name: '500MB Data', amount: 200, data: '500MB', validity: '7 days' },
        { id: 'GLO_1GB', name: '1GB Data', amount: 300, data: '1GB', validity: '30 days' },
        { id: 'GLO_2GB', name: '2GB Data', amount: 500, data: '2GB', validity: '30 days' }
      ],
      '9MOBILE': [
        { id: '9MOBILE_100MB', name: '100MB Data', amount: 100, data: '100MB', validity: '1 day' },
        { id: '9MOBILE_500MB', name: '500MB Data', amount: 200, data: '500MB', validity: '7 days' },
        { id: '9MOBILE_1GB', name: '1GB Data', amount: 300, data: '1GB', validity: '30 days' },
        { id: '9MOBILE_2GB', name: '2GB Data', amount: 500, data: '2GB', validity: '30 days' }
      ]
    }

    return plans[provider.toUpperCase()] || []
  }
}

module.exports = DataAirtimeService
