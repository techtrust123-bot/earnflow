// src/pages/Referral.jsx
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import axios from '../utils/axios'

export default function Referral() {
  const { user, balance } = useSelector(state => state.auth)

  const [referralCode, setReferralCode] = useState(() => 'EARN' + Math.floor(100000 + Math.random() * 900000))

  const referralStats = {
    code: referralCode,
    totalReferrals: 23,
    totalEarnedFromReferrals: 11500,
    rewardPerReferral: 500,
    recentReferrals: [
      { name: 'Chidera Okeke', date: '2 days ago', status: 'completed' },
      { name: 'Tunde Adebayo', date: '5 days ago', status: 'completed' },
      { name: 'Fatima Yusuf', date: '1 week ago', status: 'pending' },
      { name: 'Emeka Nwosu', date: '2 weeks ago', status: 'completed' }
    ]
  }

  const referralLink = `https://earnflow.app/r/${referralStats.code}`
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 1800)
    } catch (e) {
      toast.error('Copy failed')
    }
  }

  useEffect(() => {
    let mounted = true
    const fetchReferral = async () => {
      try {
        const { data } = await axios.get('/auth/me')
        const user = data?.user
        if (!mounted || !user) return
        // prefer explicit referralCode, fallback to userID
        if (user.referralCode) setReferralCode(user.referralCode)
        else if (user.userID) setReferralCode(String(user.userID))
      } catch (e) {
        // ignore
      }
    }
    fetchReferral()
    return () => { mounted = false }
  }, [])

  const shareViaWhatsApp = () => {
    const text = `Join Earnflow and earn real money! Use my code: ${referralStats.code}\nGet ₦${referralStats.rewardPerReferral} bonus!\n\n${referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const nativeShare = async () => {
    const text = `Join Earnflow — use my code ${referralStats.code} to get ₦${referralStats.rewardPerReferral} bonus! ${referralLink}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Earnflow', text, url: referralLink })
      } catch (e) {
        // user cancelled or failed
      }
    } else {
      shareViaWhatsApp()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-6 px-4 sm:py-8">
      <Container>
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent leading-tight">Refer & Earn ₦500</h1>
          <p className="text-base sm:text-lg text-gray-700 mt-3">Invite friends, both earn ₦500!</p>
        </motion.div>

        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 text-white rounded-3xl shadow-2xl p-8 mb-8 overflow-hidden">
          <div className="text-center">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 6, repeat: Infinity }} className="text-7xl sm:text-8xl mb-4">Gift</motion.div>

            <p className="text-lg font-semibold mb-3">Your Referral Code</p>
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl py-4 px-6 inline-block mb-6">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-widest">{referralStats.code}</p>
            </div>

            <p className="text-xl font-bold mb-6">₦{referralStats.rewardPerReferral} per referral</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={copyToClipboard} className="flex-1 bg-white text-purple-600 py-3 rounded-2xl font-bold text-lg shadow-lg">{copied ? 'Copied!' : 'Copy Link'}</motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={nativeShare} className="flex-1 bg-white/10 border border-white/30 text-white py-3 rounded-2xl font-bold text-lg shadow-lg">Share</motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={shareViaWhatsApp} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-bold text-lg shadow-lg">WhatsApp</motion.button>
            </div>

            <p className="mt-6 text-sm opacity-90 break-all">{referralLink}</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-6 text-center">
                <p className="text-4xl font-extrabold">{referralStats.totalReferrals}</p>
                <p className="text-sm opacity-90 mt-1">Total Referrals</p>
              </motion.div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 text-center">
                <p className="text-3xl font-extrabold">₦{referralStats.totalEarnedFromReferrals.toLocaleString()}</p>
                <p className="text-sm opacity-90 mt-1">Earned</p>
              </motion.div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Referrals</h2>
              {referralStats.recentReferrals.map((ref, i) => (
                <motion.div key={i} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.06 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-xl">{ref.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-gray-800">{ref.name}</p>
                      <p className="text-xs text-gray-500">{ref.date}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${ref.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{ref.status === 'completed' ? `+₦${referralStats.rewardPerReferral}` : 'Pending'}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <aside className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-lg font-bold mb-3">Referral</h3>
            <p className="text-sm text-gray-600 mb-4">Share your code and earn when friends join.</p>
            <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
              <div className="text-sm text-gray-500">Your Code</div>
              <div className="text-2xl font-extrabold mt-1">{referralStats.code}</div>
            </div>
            <div className="space-y-3">
              <button onClick={copyToClipboard} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg">{copied ? 'Copied' : 'Copy Link'}</button>
              <button onClick={nativeShare} className="w-full px-4 py-3 border rounded-lg">Share</button>
              <button onClick={shareViaWhatsApp} className="w-full px-4 py-3 bg-green-500 text-white rounded-lg">WhatsApp</button>
            </div>
            <div className="mt-4 text-xs text-gray-500">Referral link: <span className="break-all">{referralLink}</span></div>
          </aside>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-3xl p-8 text-center">
          <h3 className="text-xl font-bold mb-6">How It Works</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">1</div>
              <p>Share Link</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">2</div>
              <p>They Join</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">3</div>
              <p>You Earn ₦500</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="fixed bottom-20 right-4 z-50 md:hidden">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-full shadow-2xl border-4 border-white">
            <p className="text-center text-xs">
              <span className="block font-bold">Balance</span>
              <span className="text-xl font-extrabold">₦{(balance || 0).toLocaleString()}</span>
            </p>
          </div>
        </motion.div>
      </Container>
    </div>
  )
}