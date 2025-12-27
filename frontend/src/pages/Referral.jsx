// src/pages/Referral.jsx
import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import axios from '../utils/axios'

export default function Referral() {
  const { balance } = useSelector(state => state.auth)

  const [loading, setLoading] = useState(true)
  const [referral, setReferral] = useState({
    code: '',
    totalReferrals: 0,
    totalEarnedFromReferrals: 0,
    rewardPerReferral: 500,
    recentReferrals: []
  })

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/referral/me')
        if (!mounted) return
        if (data?.success && data.referral) {
          setReferral(data.referral)
        }
      } catch (err) {
        console.warn('referral fetch failed', err?.response?.data || err.message)
        toast.error('Could not load referral info')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetch()
    return () => { mounted = false }
  }, [])

  const referralLink = useMemo(() => `https://earnflow.app/r/${referral.code || ''}`, [referral.code])

  const copyToClipboard = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 1800)
    } catch (e) {
      toast.error('Copy failed')
    }
  }

  const shareViaWhatsApp = () => {
    const text = `Join Earnflow and earn! Use my code: ${referral.code} — Get ₦${referral.rewardPerReferral} bonus! ${referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const nativeShare = async () => {
    const text = `Join Earnflow — use my code ${referral.code} to get ₦${referral.rewardPerReferral} bonus! ${referralLink}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Earnflow', text, url: referralLink })
      } catch (e) {
        /* user cancelled */
      }
    } else {
      shareViaWhatsApp()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-6 px-4 sm:py-8">
      <Container>
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-2xl mx-auto text-center mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent leading-tight">Refer & Earn</h1>
          <p className="text-sm sm:text-base text-gray-700 mt-2">Invite friends and both of you get bonuses.</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 bg-white rounded-3xl shadow-lg p-6 md:p-8">
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-500 mb-2">Your Referral Code</div>
              <div className="inline-flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="text-2xl font-extrabold tracking-widest">{referral.code || (loading ? 'Loading…' : '—')}</div>
              </div>

              <div className="mt-4 text-sm text-gray-600">₦{referral.rewardPerReferral} per successful referral</div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={copyToClipboard} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl">{copied ? 'Copied' : 'Copy Link'}</button>
                <button onClick={nativeShare} className="w-full px-4 py-3 border rounded-xl">Share</button>
                <button onClick={shareViaWhatsApp} className="w-full px-4 py-3 bg-green-500 text-white rounded-xl">WhatsApp</button>
              </div>

              <div className="mt-4 text-xs text-gray-500 break-words">{referralLink}</div>
            </div>
          </motion.div>

          <aside className="w-full lg:w-96 bg-white rounded-3xl shadow-lg p-6 md:p-8">
            <h3 className="text-lg font-bold mb-3">Referral Summary</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500">Referrals</div>
                <div className="text-xl font-bold">{referral.totalReferrals}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500">Earned</div>
                <div className="text-xl font-bold">₦{(referral.totalEarnedFromReferrals || 0).toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-sm text-gray-500">Balance</div>
                <div className="text-xl font-bold">₦{(balance || 0).toLocaleString()}</div>
              </div>
            </div>

            <h4 className="font-semibold mb-2">Recent Referrals</h4>
            <div className="space-y-3 max-h-48 overflow-auto">
              {referral.recentReferrals && referral.recentReferrals.length > 0 ? (
                referral.recentReferrals.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-sm">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</div>
                    </div>
                    <div className={`text-sm font-bold ${r.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{r.status === 'completed' ? `+₦${r.reward || referral.rewardPerReferral}` : 'Pending'}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No recent referrals</div>
              )}
            </div>
          </aside>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-6">
          <h3 className="text-md font-bold mb-2">How It Works</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <div className="text-center"><div className="text-lg font-bold">1</div><div>Share</div></div>
            <div className="text-center"><div className="text-lg font-bold">2</div><div>They Join</div></div>
            <div className="text-center"><div className="text-lg font-bold">3</div><div>You Earn</div></div>
          </div>
        </motion.div>
      </Container>
    </div>
  )
}