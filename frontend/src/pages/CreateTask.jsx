import { useState } from 'react'
import { useSelector } from 'react-redux'
import axios from '../utils/axios'
import toast from 'react-hot-toast'

export default function CreateTask() {
  const user = useSelector(s => s.auth.user || s.auth)

  const [form, setForm] = useState({
    title: '',
    platform: 'twitter',
    action: 'follow',
    socialHandle: '',
    numUsers: 100,
    url: '',
    description: ''
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.platform) return toast.error('Platform is required')
    if (!form.numUsers || Number(form.numUsers) < 1) return toast.error('Number of users must be at least 1')

    if (form.action === 'follow') {
      if (!form.socialHandle.trim()) return toast.error('Please provide the account username to follow')
    } else {
      if (!form.url.trim()) return toast.error('Please provide the post URL')
      if (!form.description.trim()) return toast.error('Please provide a description for the post')
    }

    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        platform: form.platform,
        action: form.action,
        numUsers: Number(form.numUsers),
        socialHandle: form.socialHandle.trim() || undefined,
        url: form.url.trim() || undefined,
        description: form.description.trim() || undefined
      }

      const res = await axios.post('/user-tasks/request-approval', payload)

      if (res.data && res.data.success) {
        toast.success('Request submitted — awaiting admin approval')
        setForm({ title: '', platform: 'twitter', action: 'follow', socialHandle: '', numUsers: 100, url: '', description: '' })
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
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Request Task Approval</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" className="p-2 border rounded w-full" required />

          <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="p-2 border rounded w-full">
            <option value="twitter">Twitter (X)</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>

          <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} className="p-2 border rounded w-full">
            <option value="follow">Follow</option>
            <option value="like">Like</option>
            <option value="repost">Repost/Retweet</option>
            <option value="comment">Comment/Reply</option>
          </select>

          <input type="number" min="1" value={form.numUsers} onChange={e => setForm(f => ({ ...f, numUsers: Number(e.target.value) }))} className="p-2 border rounded w-full" />
        </div>

        {form.action === 'follow' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Account username to follow</label>
            <input value={form.socialHandle} onChange={e => setForm(f => ({ ...f, socialHandle: e.target.value }))} placeholder="e.g. @username" className="p-2 border rounded w-full" required />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Post URL</label>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="p-2 border rounded w-full" required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Post description / instructions</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details for performers" className="w-full p-2 border rounded" rows={4} required />
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