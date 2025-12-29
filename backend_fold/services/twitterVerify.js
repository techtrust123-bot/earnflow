const axios = require('axios')

// APP CONTEXT (likes / retweets / comments)
const appClient = axios.create({
  baseURL: 'https://api.twitter.com/2',
  headers: {
    Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
  }
})

exports.verifyFollow = async (userId, targetUserId) => {
  const res = await appClient.get(`/users/${userId}/following`)
  return res.data.data?.some(u => u.id === targetUserId)
}

exports.verifyLike = async (userId, tweetId) => {
  const res = await appClient.get(`/tweets/${tweetId}/liking_users`)
  return res.data.data?.some(u => u.id === userId)
}

exports.verifyRepost = async (userId, tweetId) => {
  const res = await appClient.get(`/tweets/${tweetId}/retweeted_by`)
  return res.data.data?.some(u => u.id === userId)
}

exports.verifyComment = async (userId, tweetId) => {
  const res = await appClient.get('/tweets/search/recent', {
    params: {
      query: `conversation_id:${tweetId} from:${userId}`
    }
  })
  return res.data.data?.length > 0
}
