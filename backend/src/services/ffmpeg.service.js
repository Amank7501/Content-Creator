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

const createEditedShort = (videoPath, musicPath, outputPath, options) => {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath);

    // Only apply hard trim here if there are NO cuts arrays.
    // If cuts array exists, we use complex `select` filters instead.
    if (!options.cuts || options.cuts.length === 0) {
      if (options.trimStart !== undefined && options.trimStart !== null) {
        command = command.setStartTime(options.trimStart);
      }
      if (options.trimEnd !== undefined && options.trimEnd !== null) {
        const duration = options.trimEnd - (options.trimStart || 0);
        command = command.setDuration(duration);
      }
    }

    if (musicPath) {
      command = command.input(musicPath);
    }

    let filters = [];

    // [0:v] is original video. Apply crop
    filters.push({
      filter: 'crop',
      options: 'ih*(9/16):ih',
      inputs: '0:v',
      outputs: 'v_cropped'
    });

    let currentVideoNode = 'v_cropped';
    
    // Add captions BEFORE jump cuts so timestamps properly align with original transcript
    if (options.captions && options.captions.length > 0) {
      options.captions.forEach((cap, i) => {
        const safeText = cap.text.replace(/'/g, "\\'").replace(/:/g, '\\:');
        const color = cap.style?.color || 'white';
        const fontSize = cap.style?.fontSize || 24;
        
        let yPos = '(h-text_h)/2';
        if (cap.style?.position === 'bottom') yPos = 'h-text_h-100';
        else if (cap.style?.position === 'top') yPos = '100';

        const nextNode = `v_cap_${i}`;
        
        filters.push({
          filter: 'drawtext',
          options: {
            text: safeText,
            fontsize: fontSize,
            fontcolor: color,
            x: '(w-text_w)/2',
            y: yPos,
            enable: `between(t,${cap.start},${cap.end})`,
            box: 1,
            boxcolor: 'black@0.5',
            boxborderw: 5
          },
          inputs: currentVideoNode,
          outputs: nextNode
        });
        currentVideoNode = nextNode;
      });
    }

    let finalOriginalAudioNode = '0:a';

    // Apply cuts selection if available (Jump Cuts)
    if (options.cuts && options.cuts.length > 0) {
      const selectExpr = options.cuts.map(c => `between(t,${c.start},${c.end})`).join('+');
      
      filters.push({
        filter: 'select',
        options: `'${selectExpr}'`,
        inputs: currentVideoNode,
        outputs: 'v_selected'
      });
      filters.push({
        filter: 'setpts',
        options: 'N/FRAME_RATE/TB',
        inputs: 'v_selected',
        outputs: 'v_cut_seq'
      });
      
      filters.push({
        filter: 'aselect',
        options: `'${selectExpr}'`,
        inputs: '0:a',
        outputs: 'a_selected'
      });
      filters.push({
        filter: 'asetpts',
        options: 'N/SR/TB',
        inputs: 'a_selected',
        outputs: 'a_cut_seq'
      });

      currentVideoNode = 'v_cut_seq';
      finalOriginalAudioNode = 'a_cut_seq';
    }

    // Audio processing
    if (musicPath) {
      // Normalize original audio
      filters.push({
        filter: 'loudnorm',
        inputs: finalOriginalAudioNode,
        outputs: 'a_norm'
      });
      // Lower music volume
      filters.push({
        filter: 'volume',
        options: '0.3',
        inputs: '1:a',
        outputs: 'a_music'
      });
      // Mix
      filters.push({
        filter: 'amix',
        options: { inputs: 2, duration: 'first', dropout_transition: 2 },
        inputs: ['a_norm', 'a_music'],
        outputs: 'a_out'
      });
    } else {
      filters.push({
        filter: 'loudnorm',
        inputs: finalOriginalAudioNode,
        outputs: 'a_out'
      });
    }

    command.complexFilter(filters, [currentVideoNode, 'a_out']);

    command
      .outputOptions('-c:v libx264')
      .outputOptions('-c:a aac')
      .outputOptions('-b:a 128k')
      .outputOptions('-vsync 1')
      .outputOptions('-async 1')
      .outputOptions('-y')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));

    command.run();
  });
};

module.exports = { extractAudio, createClip, getVideoDuration, createEditedShort };
