const express = require('express');
const cors = require('cors');
require('dotenv').config();
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('./config/passport');
const authRoutes = require('./routes/authRoutes');

// Initialize passport
app.use(passport.initialize());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
const videoRoutes = require('./routes/videoRoutes');
app.use('/api/videos', videoRoutes);

// Start BullMQ Worker
require('./workers/videoWorker');

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
