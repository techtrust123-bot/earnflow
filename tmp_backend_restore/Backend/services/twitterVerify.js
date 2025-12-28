// services/twitterVerify.js
const axios = require("../../../backend_fold/node_modules/axios")

const twitterClient = axios.create({
  baseURL: "https://api.twitter.com/2",
  timeout: 8000,  // Increased for larger requests
  headers: {
    Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
  }
})

// Helper to get user ID from username (if needed)
const getUserIdByUsername = async (username) => {
  try {
    const res = await twitterClient.get(`/users/by/username/${username}`)
    return res.data.data?.id
  } catch (err) {
    console.error("Username lookup failed:", err.response?.data || err.message)
    return null
  }
}

// MAIN VERIFICATION FUNCTION
exports.verifyTask = async (userTwitterId, task) => {
  const { type, targetId, targetTweetId } = task.verification || {}

  if (!type) {
    throw new Error("Task has no verification type")
  }

  try {
    switch (type.toLowerCase()) {
      case 'follow':
        return await verifyFollow(userTwitterId, targetId)

      case 'like':
        return await verifyLike(userTwitterId, targetTweetId)

      case 'repost':
      case 'retweet':
        return await verifyRepost(userTwitterId, targetTweetId)

      case 'comment':
      case 'reply':
        return await verifyComment(userTwitterId, targetTweetId)

      default:
        throw new Error(`Unsupported verification type: ${type}`)
    }
  } catch (error) {
    console.error(`Verification failed for type ${type}:`, error.message)
    throw new Error("TWITTER_VERIFICATION_FAILED")
  }
}

// 1. Verify Follow
const verifyFollow = async (userTwitterId, targetId) => {
  let paginationToken = null
  let checked = 0
  const MAX_CHECK = 5000

  while (checked < MAX_CHECK) {
    const res = await twitterClient.get(`/users/${userTwitterId}/following`, {
      params: {
        max_results: 1000,
        pagination_token: paginationToken
      }
    })

    const users = res.data?.data || []
    if (users.some(u => u.id === targetId)) return true

    checked += users.length
    paginationToken = res.data?.meta?.next_token
    if (!paginationToken) break
  }

  return false
}

// 2. Verify Like
const verifyLike = async (userTwitterId, tweetId) => {
  try {
    const res = await twitterClient.get(`/tweets/${tweetId}/liking_users`, {
      params: { max_results: 100 }
    })

    const users = res.data?.data || []
    return users.some(u => u.id === userTwitterId)
  } catch (err) {
    if (err.response?.status === 404) return false
    throw err
  }
}

// 3. Verify Repost (Retweet)
const verifyRepost = async (userTwitterId, tweetId) => {
  try {
    const res = await twitterClient.get(`/tweets/${tweetId}/retweeted_by`, {
      params: { max_results: 100 }
    })

    const users = res.data?.data || []
    return users.some(u => u.id === userTwitterId)
  } catch (err) {
    if (err.response?.status === 404) return false
    throw err
  }
}

// 4. Verify Comment (Reply)
const verifyComment = async (userTwitterId, tweetId) => {
  let paginationToken = null
  let checked = 0
  const MAX_CHECK = 2000

  while (checked < MAX_CHECK) {
    const res = await twitterClient.get(`/tweets`, {
      params: {
        'tweet.fields': 'in_reply_to_user_id,conversation_id',
        'query': `conversation_id:${tweetId} from:${userTwitterId}`,
        max_results: 100,
        pagination_token: paginationToken
      }
    })

    const tweets = res.data?.data || []
    if (tweets.length > 0) return true

    checked += tweets.length
    paginationToken = res.data?.meta?.next_token
    if (!paginationToken) break
  }

  return false
}

// Export helpers for other controllers (Task.js imports verifyFollow directly)
module.exports = {
  verifyTask: exports.verifyTask,
  verifyFollow,
  verifyLike,
  verifyRepost,
  verifyComment,
  getUserIdByUsername
}