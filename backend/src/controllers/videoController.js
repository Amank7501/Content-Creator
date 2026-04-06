const prisma = require('../models/prismaClient');
const { addVideoJob } = require('../queues/videoQueue');

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const userId = req.user.id;
    const { filename, path, originalname } = req.file;

    // Save to DB
    const video = await prisma.video.create({
      data: {
        userId,
        localUrl: path,
        originalFilename: originalname,
        status: 'pending',
      },
    });

    // Add job to processing queue (Phase 4 integration)
    await addVideoJob(video.id, 'transcribe_process', { localUrl: path });

    res.status(201).json({
      message: 'Video uploaded successfully and queued for processing',
      video,
    });
  } catch (error) {
    console.error('Error in uploadVideo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getVideos = async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: { userId: req.user.id },
      include: { clips: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const { uploadToYouTube } = require('../services/youtubeService');

const uploadClipToYoutube = async (req, res) => {
  try {
    const clipId = req.params.clipId;
    const clip = await prisma.clip.findUnique({ where: { id: clipId }, include: { video: true } });
    
    if (!clip || clip.video.userId !== req.user.id) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.youtubeAccessToken) {
      return res.status(403).json({ error: 'YouTube account not connected' });
    }

    const result = await uploadToYouTube(user, clip);
    res.json({ message: 'Uploaded successfully', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'YouTube Upload Failed' });
  }
};

const fs = require('fs');

const deleteVideo = async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { clips: true }
    });

    if (!video || video.userId !== req.user.id) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Unlink the original MP4 upload safely
    if (video.localUrl && fs.existsSync(video.localUrl)) {
      fs.unlinkSync(video.localUrl);
    }

    // Loop through strictly slicing generated clips
    for (const clip of video.clips) {
      if (clip.localUrl && fs.existsSync(clip.localUrl)) {
        fs.unlinkSync(clip.localUrl);
      }
    }

    // Cascade Delete
    await prisma.clip.deleteMany({ where: { videoId } });
    await prisma.video.delete({ where: { id: videoId } });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};

module.exports = { uploadVideo, getVideos, uploadClipToYoutube, deleteVideo };
