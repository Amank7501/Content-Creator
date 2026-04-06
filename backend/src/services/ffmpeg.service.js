const ffmpeg = require('fluent-ffmpeg');
const defaultFfmpegPath = require('ffmpeg-static');
const path = require('path');

// Allow environment override or fallback to ffmpeg-static
const ffmpegExe = process.env.FFMPEG_PATH || defaultFfmpegPath;
ffmpeg.setFfmpegPath(ffmpegExe);

// Explicitly register ffprobe for duration metadata
const ffprobePath = require('ffprobe-static').path;
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Extracts a low-bitrate MP3 audio from the video for Whisper CLI compatibility.
 */
const extractAudio = (videoPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('64k')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
};

/**
 * Crops the video to 9:16 vertical format, cuts a specific segment, and conditionally burns subtitles.
 */
const createClip = (videoPath, start, end, outputPath, srtFilePath = null) => {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath)
      .setStartTime(start)
      .setDuration(end - start);

    // Filter array
    let filters = [];

    // 1. Crop to 9:16
    filters.push({
      filter: 'crop',
      options: 'ih*(9/16):ih'
    });

    // 2. Subtitles burn-in if available
    // WARNING: ffmpeg subtitles filter requires absolute paths but strictly escaped in windows
    // e.g., C:/path/to.srt -> C\:/path/to.srt wrapped securely in single quotes
    if (srtFilePath) {
      // Escape for Windows and wrap in single quotes to block whitespace crashes
      const sanitizedPath = srtFilePath.replace(/\\/g, '/').replace(/:/g, '\\:');
      filters.push({
        filter: 'subtitles',
        options: `'${sanitizedPath}'`
      });
    }

    command = command.videoFilters(filters)
      .outputOptions('-c:a aac')
      .outputOptions('-b:a 128k')
      .outputOptions('-y') // Overwrite if exists
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));

    command.run();
  });
};

const getVideoDuration = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return resolve(0); // Safely fallback to 0 if ffprobe isn't installed locally
      resolve(metadata.format.duration); // duration in seconds
    });
  });
};

module.exports = { extractAudio, createClip, getVideoDuration };
