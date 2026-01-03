     
    // services/twitterVerify.js — FINAL WORKING VERSION FOR OAUTH 1.0A

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

const requestWithUserAuth = (userToken, userTokenSecret, method, url, params = {}) => {
  const token = { key: userToken, secret: userTokenSecret };
  const authHeader = oauth.toHeader(oauth.authorize({ url, method, data: params }, token));
  return axios({ method, url, params, headers: { Authorization: authHeader.Authorization } });
};

exports.verifyFollow = async (userTwitterId, targetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', 'https://api.twitter.com/1.1/friendships/show.json', {
      source_id: userTwitterId,
      target_id: targetId
    });
    return res.data.relationship.source.following;
  } catch (err) {
    console.error("Follow verify error:", err.response?.data || err.message);
    return false;
  }
};

exports.verifyLike = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', 'https://api.twitter.com/1.1/favorites/list.json', {
      user_id: userTwitterId,
      count: 200
    });
    return res.data.some(tweet => tweet.id === tweetId);
  } catch (err) {
    console.error('Like verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyRepost = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', 'https://api.twitter.com/1.1/statuses/retweeters/ids.json', {
      id: tweetId
    });
    return res.data.ids.some(id => id.toString() === userTwitterId);
  } catch (err) {
    console.error('Repost verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyComment = async (userTwitterId, tweetId, userToken, userTokenSecret) => {
  try {
    const res = await requestWithUserAuth(userToken, userTokenSecret, 'GET', 'https://api.twitter.com/1.1/search/tweets.json', {
      q: `from:${userTwitterId} in_reply_to_tweet_id:${tweetId}`,
      count: 10
    });
    return res.data.statuses.length > 0;
  } catch (err) {
    console.error('Comment verify error:', err.response?.data || err.message);
    return false;
  }
}; 
     
     
     
     
     
     
     
     // // 
      

     // // 
      


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
// // services/twitterVerify.js
// const axios = require('axios');

// // All verification uses OAuth 2.0 Bearer token (accessToken from user.twitter.accessToken)

// exports.verifyFollow = async (userTwitterId, targetId, accessToken) => {
//   try {
//     const res = await axios.get(`https://api.twitter.com/2/users/${userTwitterId}/following`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//       params: { max_results: 1000 }
//     });
//     return res.data.data?.some(u => u.id === targetId) || false;
//   } catch (err) {
//     console.error("Follow verify error:", err.response?.data || err.message);
//     return false;
//   }
// };

// exports.verifyLike = async (userTwitterId, tweetId, accessToken) => {
//   try {
//     const res = await axios.get(`https://api.twitter.com/2/tweets/${tweetId}/liking_users`, {
//       headers: { Authorization: `Bearer ${accessToken}` }
//     });
//     return res.data.data?.some(u => u.id === userTwitterId) || false;
//   } catch (err) {
//     console.error('Like verify error:', err.response?.data || err.message);
//     return false;
//   }
// };

// exports.verifyRepost = async (userTwitterId, tweetId, accessToken) => {
//   try {
//     const res = await axios.get(`https://api.twitter.com/2/tweets/${tweetId}/retweeted_by`, {
//       headers: { Authorization: `Bearer ${accessToken}` }
//     });
//     return res.data.data?.some(u => u.id === userTwitterId) || false;
//   } catch (err) {
//     console.error('Repost verify error:', err.response?.data || err.message);
//     return false;
//   }
// };

// exports.verifyComment = async (userTwitterId, tweetId, accessToken) => {
//   try {
//     const res = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
//       headers: { Authorization: `Bearer ${accessToken}` },
//       params: {
//         query: `conversation_id:${tweetId} from:${userTwitterId}`,
//         max_results: 10
//       }
//     });
//     return res.data.data?.length > 0 || false;
//   } catch (err) {
//     console.error('Comment verify error:', err.response?.data || err.message);
//     return false;
//   }
// };


