// services/twitterVerify.js
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');

const oauth = OAuth({
  consumer: {
    key: process.env.TWITTER_CONSUMER_KEY,
    secret: process.env.TWITTER_CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

// Create signed request for user context (OAuth1.0a)
const requestWithUserAuth = (userToken, userTokenSecret, method, url, params = {}) => {
  const token = { key: userToken, secret: userTokenSecret };
  const authHeader = oauth.toHeader(oauth.authorize({ url, method, data: params }, token));
  return axios({ method, url, params, headers: { Authorization: authHeader.Authorization } });
};



// Verify follow. Accepts either an app Bearer `accessToken` (3rd arg) OR user OAuth1 tokens (3rd and 4th args)
exports.verifyFollow = async (userTwitterId, targetId, accessTokenOrUserToken, userTokenSecret) => {
  try {
    if (userTokenSecret) {
      // Use user-signed request (OAuth1)
      const res = await requestWithUserAuth(accessTokenOrUserToken, userTokenSecret, 'GET', `https://api.twitter.com/2/users/${userTwitterId}/following`, { max_results: 1000 });
      return res.data.data?.some(u => u.id === targetId) || false;
    }
    // Fallback: use app bearer token (access token for app context)
    const res = await axios.get(`https://api.twitter.com/2/users/${userTwitterId}/following`, {
      headers: { Authorization: `Bearer ${accessTokenOrUserToken}` },
      params: { max_results: 1000 }
    });
    return res.data.data?.some(u => u.id === targetId) || false;
  } catch (err) {
    console.error("Follow verify error:", err.response?.data || err.message)
    return false
  }
}

exports.verifyLike = async (userTwitterId, tweetId, accessTokenOrUserToken, userTokenSecret) => {
  try {
    if (userTokenSecret) {
      const res = await requestWithUserAuth(accessTokenOrUserToken, userTokenSecret, 'GET', `https://api.twitter.com/2/tweets/${tweetId}/liking_users`);
      return res.data.data?.some(u => u.id === userTwitterId) || false;
    }
    const res = await axios.get(`https://api.twitter.com/2/tweets/${tweetId}/liking_users`, { headers: { Authorization: `Bearer ${accessTokenOrUserToken}` } });
    return res.data.data?.some(u => u.id === userTwitterId) || false;
  } catch (err) {
    console.error('Like verify error:', err.response?.data || err.message)
    return false
  }
}

exports.verifyRepost = async (userTwitterId, tweetId, accessTokenOrUserToken, userTokenSecret) => {
  try {
    if (userTokenSecret) {
      const res = await requestWithUserAuth(accessTokenOrUserToken, userTokenSecret, 'GET', `https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`);
      return res.data.data?.some(u => u.id === userTwitterId) || false;
    }
    const res = await axios.get(`https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`, { headers: { Authorization: `Bearer ${accessTokenOrUserToken}` } });
    return res.data.data?.some(u => u.id === userTwitterId) || false;
  } catch (err) {
    console.error('Repost verify error:', err.response?.data || err.message)
    return false
  }
}

exports.verifyComment = async (userTwitterId, tweetId, accessTokenOrUserToken, userTokenSecret) => {
  try {
    const params = { query: `conversation_id:${tweetId} from:${userTwitterId}`, max_results: 10 };
    if (userTokenSecret) {
      const res = await requestWithUserAuth(accessTokenOrUserToken, userTokenSecret, 'GET', 'https://api.twitter.com/2/tweets/search/recent', params);
      return res.data.data?.length > 0 || false;
    }
    const res = await axios.get('https://api.twitter.com/2/tweets/search/recent', { headers: { Authorization: `Bearer ${accessTokenOrUserToken}` }, params });
    return res.data.data?.length > 0 || false;
  } catch (err) {
    console.error('Comment verify error:', err.response?.data || err.message)
    return false
  }
}

// exports.verifyFollow = async (userTwitterId, targetId, userToken, userTokenSecret) => {
//   try {
//     const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', `https://api.twitter.com/2/users/${userTwitterId}/following`);
//     return res.data.data?.some(u => u.id === targetId);
//   } catch (err) {
//     console.error("Follow verify failed:", err.response?.data || err.message);
//     return false;
//   }
// };

// exports.verifyLike = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
//   try {
//     const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', `https://api.twitter.com/2/tweets/${tweetId}/liking_users`);
//     return res.data.data?.some(u => u.id === userTwitterId);
//   } catch (err) {
//     return false;
//   }
// };

// exports.verifyRepost = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
//   try {
//     const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', `https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`);
//     return res.data.data?.some(u => u.id === userTwitterId);
//   } catch (err) {
//     return false;
//   }
// };

// exports.verifyComment = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
//   try {
//     const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', 'https://api.twitter.com/2/tweets/search/recent', {
//       query: `conversation_id:${tweetId} from:${userTwitterId}`,
//       max_results: 10
//     });
//     return res.data.data?.length > 0;
//   } catch (err) {
//     return false;
//   }
// };