// services/multiPlatformVerify.js - Multi-platform task verification service

const axios = require('axios');

// ============ TIKTOK VERIFICATION ============
const tiktokClient = axios.create({
  baseURL: 'https://open.tiktokapis.com/v1',
  timeout: 10000
});

exports.verifyTikTokFollow = async (userTikTokId, targetId, accessToken) => {
  try {
    const res = await tiktokClient.get(
      `/user/followers/list`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'id,username'
        }
      }
    );

    return res.data?.data?.some(u => u.id === targetId) || false;
  } catch (err) {
    console.error('TikTok follow verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyTikTokLike = async (userTikTokId, videoId, accessToken) => {
  try {
    const res = await tiktokClient.get(
      `/user/liked_videos`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'id,video_description'
        }
      }
    );

    return res.data?.data?.some(v => v.id === videoId) || false;
  } catch (err) {
    console.error('TikTok like verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyTikTokShare = async (userTikTokId, videoId, accessToken) => {
  // Note: TikTok API doesn't provide direct share verification
  // This would require manual verification via screenshots
  console.log('TikTok share verification requires manual admin review');
  return false; // Falls back to screenshot-based verification
};

exports.verifyTikTokComment = async (userTikTokId, videoId, accessToken) => {
  try {
    const res = await tiktokClient.get(
      `/video/${videoId}/comments`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'id,text,author_id'
        }
      }
    );

    return res.data?.data?.some(c => c.author_id === userTikTokId) || false;
  } catch (err) {
    console.error('TikTok comment verify error:', err.response?.data || err.message);
    return false;
  }
};

// ============ INSTAGRAM VERIFICATION ============
const instagramClient = axios.create({
  baseURL: 'https://graph.instagram.com/v18.0',
  timeout: 10000
});

exports.verifyInstagramFollow = async (userInstagramId, targetId, accessToken) => {
  try {
    const res = await instagramClient.get(
      `/${userInstagramId}/follows`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,username'
        }
      }
    );

    return res.data?.data?.some(u => u.id === targetId) || false;
  } catch (err) {
    console.error('Instagram follow verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyInstagramLike = async (userInstagramId, postId, accessToken) => {
  try {
    const res = await instagramClient.get(
      `/${postId}/likes`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,username'
        }
      }
    );

    return res.data?.data?.some(u => u.id === userInstagramId) || false;
  } catch (err) {
    console.error('Instagram like verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyInstagramComment = async (userInstagramId, postId, accessToken) => {
  try {
    const res = await instagramClient.get(
      `/${postId}/comments`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,from'
        }
      }
    );

    return res.data?.data?.some(c => c.from?.id === userInstagramId) || false;
  } catch (err) {
    console.error('Instagram comment verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyInstagramShare = async (userInstagramId, postId, accessToken) => {
  // Instagram API doesn't provide share verification
  console.log('Instagram share verification requires manual admin review');
  return false;
};

// ============ FACEBOOK VERIFICATION ============
const facebookClient = axios.create({
  baseURL: 'https://graph.facebook.com/v18.0',
  timeout: 10000
});

exports.verifyFacebookFollow = async (userFacebookId, pageId, accessToken) => {
  try {
    const res = await facebookClient.get(
      `/${userFacebookId}/friends`,
      {
        params: {
          access_token: accessToken,
          fields: 'id'
        }
      }
    );

    return res.data?.data?.some(u => u.id === pageId) || false;
  } catch (err) {
    console.error('Facebook follow verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyFacebookLike = async (userFacebookId, postId, accessToken) => {
  try {
    const res = await facebookClient.get(
      `/${postId}/likes`,
      {
        params: {
          access_token: accessToken,
          summary: true
        }
      }
    );

    return res.data?.data?.some(u => u.id === userFacebookId) || false;
  } catch (err) {
    console.error('Facebook like verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyFacebookComment = async (userFacebookId, postId, accessToken) => {
  try {
    const res = await facebookClient.get(
      `/${postId}/comments`,
      {
        params: {
          access_token: accessToken,
          fields: 'from'
        }
      }
    );

    return res.data?.data?.some(c => c.from?.id === userFacebookId) || false;
  } catch (err) {
    console.error('Facebook comment verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyFacebookShare = async (userFacebookId, postId, accessToken) => {
  // Facebook share verification requires manual review
  console.log('Facebook share verification requires manual admin review');
  return false;
};

// ============ YOUTUBE VERIFICATION ============
const youtubeClient = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3',
  timeout: 10000
});

exports.verifyYouTubeSubscribe = async (userYouTubeId, channelId, accessToken) => {
  try {
    const res = await youtubeClient.get(
      `/subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          part: 'snippet',
          mine: true,
          maxResults: 50
        }
      }
    );

    return res.data?.items?.some(sub => sub.snippet?.resourceId?.channelId === channelId) || false;
  } catch (err) {
    console.error('YouTube subscribe verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyYouTubeLike = async (userYouTubeId, videoId, accessToken) => {
  try {
    const res = await youtubeClient.get(
      `/videos`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          part: 'id',
          myRating: 'like'
        }
      }
    );

    return res.data?.items?.some(v => v.id === videoId) || false;
  } catch (err) {
    console.error('YouTube like verify error:', err.response?.data || err.message);
    return false;
  }
};

exports.verifyYouTubeComment = async (userYouTubeId, videoId, accessToken) => {
  try {
    const res = await youtubeClient.get(
      `/commentThreads`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          part: 'snippet',
          videoId: videoId,
          mine: true,
          maxResults: 20
        }
      }
    );

    return res.data?.items?.length > 0 || false;
  } catch (err) {
    console.error('YouTube comment verify error:', err.response?.data || err.message);
    return false;
  }
};

// ============ GENERAL VERIFICATION DISPATCHER ============
exports.verifyTask = async (platform, verificationType, userSocialId, targetId, accessToken) => {
  platform = (platform || '').toLowerCase();
  verificationType = (verificationType || '').toLowerCase();

  try {
    // Twitter/X verification
    if (platform === 'x' || platform === 'twitter') {
      const twitterVerify = require('./twitterVerify');
      if (verificationType === 'follow') {
        return await twitterVerify.verifyFollow(userSocialId, targetId, accessToken);
      } else if (verificationType === 'like') {
        return await twitterVerify.verifyLike(userSocialId, targetId, accessToken);
      } else if (verificationType === 'repost' || verificationType === 'retweet') {
        return await twitterVerify.verifyRepost(userSocialId, targetId, accessToken);
      } else if (verificationType === 'comment' || verificationType === 'reply') {
        return await twitterVerify.verifyComment(userSocialId, targetId, accessToken);
      }
    }

    // TikTok verification
    if (platform === 'tiktok') {
      if (verificationType === 'follow') {
        return await exports.verifyTikTokFollow(userSocialId, targetId, accessToken);
      } else if (verificationType === 'like') {
        return await exports.verifyTikTokLike(userSocialId, targetId, accessToken);
      } else if (verificationType === 'comment') {
        return await exports.verifyTikTokComment(userSocialId, targetId, accessToken);
      } else if (verificationType === 'share') {
        return await exports.verifyTikTokShare(userSocialId, targetId, accessToken);
      }
    }

    // Instagram verification
    if (platform === 'instagram') {
      if (verificationType === 'follow') {
        return await exports.verifyInstagramFollow(userSocialId, targetId, accessToken);
      } else if (verificationType === 'like') {
        return await exports.verifyInstagramLike(userSocialId, targetId, accessToken);
      } else if (verificationType === 'comment') {
        return await exports.verifyInstagramComment(userSocialId, targetId, accessToken);
      } else if (verificationType === 'share') {
        return await exports.verifyInstagramShare(userSocialId, targetId, accessToken);
      }
    }

    // Facebook verification
    if (platform === 'facebook') {
      if (verificationType === 'follow') {
        return await exports.verifyFacebookFollow(userSocialId, targetId, accessToken);
      } else if (verificationType === 'like') {
        return await exports.verifyFacebookLike(userSocialId, targetId, accessToken);
      } else if (verificationType === 'comment') {
        return await exports.verifyFacebookComment(userSocialId, targetId, accessToken);
      } else if (verificationType === 'share') {
        return await exports.verifyFacebookShare(userSocialId, targetId, accessToken);
      }
    }

    // YouTube verification
    if (platform === 'youtube') {
      if (verificationType === 'subscribe') {
        return await exports.verifyYouTubeSubscribe(userSocialId, targetId, accessToken);
      } else if (verificationType === 'like') {
        return await exports.verifyYouTubeLike(userSocialId, targetId, accessToken);
      } else if (verificationType === 'comment') {
        return await exports.verifyYouTubeComment(userSocialId, targetId, accessToken);
      }
    }

    console.log(`No verification found for ${platform}/${verificationType}`);
    return false;
  } catch (error) {
    console.error(`Verification error for ${platform}:`, error.message);
    return false;
  }
};
