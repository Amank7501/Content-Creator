const { Queue } = require('bullmq');

const videoQueue = new Queue('videoProcessing', {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

const addVideoJob = async (videoId, type, data) => {
  return await videoQueue.add(type, { videoId, ...data });
};

module.exports = { videoQueue, addVideoJob };
