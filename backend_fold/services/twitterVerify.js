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

// Create signed request for user context
const requestWithUserAuth = (userToken, userTokenSecret, method, url, params = {}) => {
  const token = {
    key: userToken,
    secret: userTokenSecret
  };

  const authHeader = oauth.toHeader(oauth.authorize({
    url,
    method,
    data: params
  }, token));

  return axios({
    method,
    url,
    params,
    headers: {
      Authorization: authHeader.Authorization
    }
  });
};

exports.verifyFollow = async (userTwitterId, targetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', `https://api.twitter.com/2/users/${userTwitterId}/following`);
    return res.data.data?.some(u => u.id === targetId);
  } catch (err) {
    console.error("Follow verify failed:", err.response?.data || err.message);
    return false;
  }
};

exports.verifyLike = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', `https://api.twitter.com/2/tweets/${tweetId}/liking_users`);
    return res.data.data?.some(u => u.id === userTwitterId);
  } catch (err) {
    return false;
  }
};

exports.verifyRepost = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', `https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`);
    return res.data.data?.some(u => u.id === userTwitterId);
  } catch (err) {
    return false;
  }
};

exports.verifyComment = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', 'https://api.twitter.com/2/tweets/search/recent', {
      query: `conversation_id:${tweetId} from:${userTwitterId}`,
      max_results: 10
    });
    return res.data.data?.length > 0;
  } catch (err) {
    return false;
  }
};