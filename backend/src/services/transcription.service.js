const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Function to delay for retries
const pause = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Transcribe video/audio file using Local Whisper CLI (e.g. Python whisper or whisper.cpp)
 */
const transcribeAudio = async (audioPath, retryCount = 0) => {
  const whisperPath = process.env.WHISPER_PATH || 'whisper';
  const outputDir = path.dirname(audioPath);
  
  // command execution natively without wrapping the executable path in quotes 
  // which broke Windows evaluations of 'python -m whisper'
  const command = `${whisperPath} "${audioPath}" --model base --output_dir "${outputDir}" --output_format all`;
  
  // Extract ffmpeg directory to inject into Python's executable PATH
  const defaultFfmpegPath = require('ffmpeg-static');
  const ffmpegExeDir = path.dirname(process.env.FFMPEG_PATH || defaultFfmpegPath);
  
  // Create an environment override ensuring ffmpeg is accessible
  const env = { 
    ...process.env, 
    PATH: `${ffmpegExeDir}${path.delimiter}${process.env.PATH}` 
  };

  try {
    console.log(`Executing Whisper: ${command}`);
    await exec(command, { env });

    // Python Whisper creates output file matching the input filename + .json
    // e.g. path/to/audio_xyz.mp3 -> path/to/audio_xyz.json
    const parsedPath = path.parse(audioPath);
    const resultJsonPath = path.join(outputDir, `${parsedPath.name}.json`);

    if (!fs.existsSync(resultJsonPath)) {
      throw new Error(`Whisper JSON output not found at ${resultJsonPath}`);
    }

    const rawData = fs.readFileSync(resultJsonPath, 'utf-8');
    const transcriptData = JSON.parse(rawData);

    // Cleanup the generated json file
    fs.unlinkSync(resultJsonPath);

    return transcriptData;
  } catch (error) {
    console.error('Transcription Error:', error.message);
    
    // Retry once if we haven't already
    if (retryCount < 1) {
      console.log('Retrying Whisper execution in 2 seconds...');
      await pause(2000);
      return transcribeAudio(audioPath, retryCount + 1);
    }
    
    throw new Error('Local Whisper generation failed permanently after 1 retry.');
  }
};

module.exports = { transcribeAudio };
