const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
const { uploadVideo, getVideos, uploadClipToYoutube, deleteVideo, processShortVideo, uploadMusic, generateEditPlanRoute } = require('../controllers/videoController');

const router = express.Router();

const os = require('os');

// Multer Config (Use OS Temp Dir)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for long videos
});

router.post('/upload', verifyToken, upload.single('video'), uploadVideo);
router.get('/', verifyToken, getVideos);
router.delete('/:videoId', verifyToken, deleteVideo);
router.post('/youtube/:clipId', verifyToken, uploadClipToYoutube);
router.post('/process-short', verifyToken, processShortVideo);
router.post('/upload-music', verifyToken, upload.single('music'), uploadMusic);
router.post('/generate-edit-plan', verifyToken, generateEditPlanRoute);

// Optionally, endpoint to serve static processed videos / clips (e.g., streaming) //
router.use('/serve', express.static(path.join(__dirname, '../../uploads')));

module.exports = router;
