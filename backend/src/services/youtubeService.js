const { google } = require('googleapis');
const fs = require('fs');

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  '/api/auth/google/callback'
);

const uploadToYouTube = async (user, clip) => {
  try {
    oAuth2Client.setCredentials({
      access_token: user.youtubeAccessToken,
      refresh_token: user.youtubeRefreshToken,
    });

    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    const fileSize = fs.statSync(clip.localUrl).size;
    const res = await youtube.videos.insert({
      part: 'id,snippet,status',
      notifySubscribers: false,
      requestBody: {
        snippet: {
          title: clip.title || 'My YouTube Short',
          description: '#shorts ' + (clip.reason || ''),
          tags: ['shorts', 'ai', 'clip'],
        },
        status: {
          privacyStatus: 'private', // Upload as private for MVP / Safety
        },
      },
      media: {
        body: fs.createReadStream(clip.localUrl),
      },
    });

    return res.data;
  } catch (error) {
    console.error('YouTube Upload Error:', error);
    throw error;
  }
};

module.exports = { uploadToYouTube };
