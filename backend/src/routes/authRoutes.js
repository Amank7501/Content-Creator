const express = require('express');
const passport = require('passport');
const { generateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Google OAuth Login
router.get(
  '/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/youtube.upload' // Important for uploading videos
    ],
    accessType: 'offline', // Request refresh token
    prompt: 'consent'      // Force consent to get refresh token
  })
);

// Google OAuth Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, generate JWT
    const token = generateToken(req.user.id);
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/login?token=${token}`);
  }
);

// Dummy Login for Testing
router.get('/dummy', async (req, res) => {
  const prisma = require('../models/prismaClient');
  try {
    const user = await prisma.user.upsert({
      where: { email: 'dummy@example.com' },
      update: {},
      create: {
        googleId: 'dummy_guest_123',
        email: 'dummy@example.com',
        name: 'Guest User',
      }
    });
    const token = generateToken(user.id);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?token=${token}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Dummy login failed' });
  }
});

module.exports = router;
