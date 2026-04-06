const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');
const prisma = require('../models/prismaClient');

const { transcribeAudio } = require('../services/transcription.service');
const { detectClips } = require('../services/gemini.service');
const { extractAudio, createClip, getVideoDuration } = require('../services/ffmpeg.service');

const MAX_VIDEO_DURATION_MINUTES = parseInt(process.env.MAX_VIDEO_DURATION_MINUTES || '30', 10);

const worker = new Worker('videoProcessing', async (job) => {
  console.log(`Processing job ${job.id} of type ${job.name}`);
  const { videoId, localUrl } = job.data;

  try {
    // Basic verification and skip check
    const videoData = await prisma.video.findUnique({ where: { id: videoId }, include: { clips: true } });
    if (!videoData) throw new Error("Video metadata missing from DB.");
    if (videoData.status === 'processed') {
      console.log(`[Job ${job.id}] Video already processed completely. Skipping.`);
      return; // Avoid reprocessing same video
    }

    // Performance Optimization: Restrict duration bounds
    const durationSecs = await getVideoDuration(localUrl);
    if (durationSecs > MAX_VIDEO_DURATION_MINUTES * 60) {
      throw new Error(`Video exceeds maximum allowed duration of ${MAX_VIDEO_DURATION_MINUTES} minutes.`);
    }

    let transcriptData = null;
    let transcriptText = '';
    const audioPath = path.join(__dirname, `../../uploads/audio_${videoId}.mp3`);
    let srtAvailablePath = path.join(__dirname, `../../uploads/audio_${videoId}.srt`);

    // 1. Audio Extraction & Transcription (Caching check)
    if (videoData.transcriptJson) {
      console.log(`[Job ${job.id}] Cached transcript found! Bypassing Whisper.`);
      transcriptData = JSON.parse(videoData.transcriptJson);
      transcriptText = transcriptData.text; 
      // Note: If cached, we might not have the .srt file on disk if server rebooted. 
      // We will softly skip burning if .srt is mysteriously dead.
    } else {
      console.log(`[Job ${job.id}] Extracting audio...`);
      await extractAudio(localUrl, audioPath);

      await prisma.video.update({ where: { id: videoId }, data: { status: 'transcribing' } });
      console.log(`[Job ${job.id}] Transcribing via local Whisper...`);
      transcriptData = await transcribeAudio(audioPath);
      transcriptText = transcriptData.text;
      
      // Save transcript locally or in DB (Cache it)
      await prisma.video.update({
        where: { id: videoId },
        data: { transcriptJson: JSON.stringify(transcriptData) },
      });
      
      // Cleanup the extracted mp3
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    }

    // 2. Clip Detection via Gemini (Caching check)
    await prisma.video.update({ where: { id: videoId }, data: { status: 'clipping' } });
    console.log(`[Job ${job.id}] Detecting clips via Gemini...`);
    let clips = [];
    
    // We limit transcript characters sent to prevent payload explosions
    const safeTranscriptSlice = transcriptText.substring(0, 150000); 
    clips = await detectClips(safeTranscriptSlice);

    // 3. Rendering
    await prisma.video.update({ where: { id: videoId }, data: { status: 'rendering' } });
    console.log(`[Job ${job.id}] Rendering clips via FFmpeg...`);
    
    // Check if Whisper generated the SRT specifically
    const useSrt = fs.existsSync(srtAvailablePath) ? srtAvailablePath : null;

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipPath = path.join(__dirname, `../../uploads/clip_${videoId}_${i}.mp4`);
      
      console.log(`[Job ${job.id}] Rendering Clip ${i+1}/${clips.length} (${clip.start}s - ${clip.end}s)`);
      await createClip(localUrl, clip.start, clip.end, clipPath, useSrt);
      
      // Save clip metadata to DB
      await prisma.clip.create({
        data: {
          videoId,
          startTime: parseFloat(clip.start) || 0,
          endTime: parseFloat(clip.end) || 15,
          title: clip.title || 'Untitled Clip',
          reason: clip.reason || '',
          localUrl: clipPath,
          status: 'completed'
        }
      });
    }

    // Cleanup lingering SRT explicitly if we made it
    if (useSrt) {
      try { fs.unlinkSync(useSrt) } catch(e){}
    }

    // End Process
    await prisma.video.update({ where: { id: videoId }, data: { status: 'processed' } });
    console.log(`[Job ${job.id}] Process completed successfully.`);
  } catch (error) {
    console.error(`[Job ${job.id}] Failed processing:`, error.message);
    await prisma.video.update({ where: { id: videoId }, data: { status: 'error' } });
    throw error;
  }
}, {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

worker.on('completed', (job) => {
  console.log(`Worker tracking completion: job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`Worker tracking failure: job ${job.id} resulted in an error: ${err.message}`);
});

module.exports = { worker };
