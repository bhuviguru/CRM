const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/simpleRateLimiter');
const passport = require('../config/passport');

// Public routes with strict rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// GitHub OAuth routes
router.get('/github',
    passport.authenticate('github', {
        scope: ['user:email'],
        session: false
    })
);

router.get('/github/callback',
    passport.authenticate('github', {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=github_auth_failed`
    }),
    authController.githubCallback
);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;

