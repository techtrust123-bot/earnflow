import { useState } from 'react'
import { useSelector } from 'react-redux'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

export default function CreateTask() {
  const user = useSelector(s => s.auth.user || s.auth)
  const { isDark } = useTheme()

  const [form, setForm] = useState({
    title: '',
    platform: 'twitter',
    action: 'follow',
    socialHandle: '',
    accountUsername: '',
    numUsers: 100,
    url: '',
    description: '',
    screenshot: null,
    screenshotPreview: null
  })

  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        return toast.error('Please upload an image file')
      }
      if (file.size > 200 * 1024) { // 200KB limit
        return toast.error('Image size must be less than 200KB')
      }
      const preview = URL.createObjectURL(file)
      setForm(f => ({
        ...f,
        screenshot: file,
        screenshotPreview: preview
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.platform) return toast.error('Platform is required')
    if (!form.numUsers || Number(form.numUsers) < 1) return toast.error('Number of users must be at least 1')

    const followAction = form.action === 'follow' || form.action === 'subscribe'
    
    if (followAction) {
      if (!form.socialHandle.trim()) return toast.error('Please provide the account/channel to follow/subscribe to')
    } else {
      // For repost, like, comment: require username/handle and screenshot
      if (!form.accountUsername.trim()) return toast.error('Please provide your account username/handle')
      if (!form.screenshot) return toast.error('Please upload a screenshot of the post')
      if (!form.description.trim()) return toast.error('Please provide a description')
    }

    setLoading(true)
    try {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('title', form.title.trim())
      formData.append('platform', form.platform)
      formData.append('action', form.action)
      formData.append('numUsers', Number(form.numUsers))
      
      const followAction = form.action === 'follow' || form.action === 'subscribe'
      
      if (followAction) {
        formData.append('socialHandle', form.socialHandle.trim())
      } else {
        formData.append('accountUsername', form.accountUsername.trim())
        formData.append('description', form.description.trim())
        formData.append('screenshot', form.screenshot)
      }

      const res = await axios.post('/user-tasks/request-approval', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data && res.data.success) {
        toast.success('Request submitted — awaiting admin approval')
        setForm({
          title: '',
          platform: 'twitter',
          action: 'follow',
          socialHandle: '',
          accountUsername: '',
          numUsers: 100,
          url: '',
          description: '',
          screenshot: null,
          screenshotPreview: null
        })
      } else {
        toast.error(res.data?.message || 'Failed to submit request')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`max-w-3xl mx-auto p-6 min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gray-50'} transition-colors`}>
      <h1 className={`text-3xl font-bold mb-8 text-center ${isDark ? 'text-slate-50' : 'text-gray-900'} transition-colors`}>Request Task Approval</h1>

      <form onSubmit={handleSubmit} className={`${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'} rounded-2xl shadow-xl p-8 transition-colors`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" className={`p-2 border rounded w-full transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} required />

          <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className={`p-2 border rounded w-full transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}>
            <option value="twitter">Twitter (X)</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
          </select>

          <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} className={`p-2 border rounded w-full transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}>
            {form.platform === 'youtube' ? (
              <>
                <option value="subscribe">Subscribe</option>
                <option value="like">Like</option>
                <option value="comment">Comment</option>
              </>
            ) : (
              <>
                <option value="follow">Follow</option>
                <option value="like">Like</option>
                <option value="repost">Repost/Retweet</option>
                <option value="comment">Comment/Reply</option>
              </>
            )}
          </select>

          <input type="number" min="1" value={form.numUsers} onChange={e => setForm(f => ({ ...f, numUsers: Number(e.target.value) }))} className={`p-2 border rounded w-full transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} />
        </div>

        {form.action === 'follow' || form.action === 'subscribe' ? (
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Account {form.platform === 'youtube' ? 'channel' : 'username'} to {form.action}</label>
            <input value={form.socialHandle} onChange={e => setForm(f => ({ ...f, socialHandle: e.target.value }))} placeholder={form.platform === 'youtube' ? 'e.g. @channelname' : 'e.g. @username'} className={`p-2 border rounded w-full transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} required />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Your Account Username/Handle</label>
              <input value={form.accountUsername} onChange={e => setForm(f => ({ ...f, accountUsername: e.target.value }))} placeholder="e.g. @yourhandle" className={`p-2 border rounded w-full transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} required />
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Upload Screenshot/Image of the Post</label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDark ? 'border-slate-600 hover:border-blue-500' : 'border-gray-300 hover:border-blue-500'}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="screenshot-upload"
                  required
                />
                <label htmlFor="screenshot-upload" className="cursor-pointer">
                  {form.screenshotPreview ? (
                    <div className="space-y-2">
                      <img src={form.screenshotPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                      <p className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Click to change image</p>
                    </div>
                  ) : (
                    <div>
                      <p className={`mb-2 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>📷 Click to upload or drag and drop</p>
                      <p className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>PNG, JPG, GIF up to 200KB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Post Description / Instructions</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details for performers about this post" className={`w-full p-2 border rounded transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} rows={4} required />
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Submitting...' : 'Request Approval'}
          </button>
        </div>
      </form>
    </div>
  )
}