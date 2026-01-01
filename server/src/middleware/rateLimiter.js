const rateLimit = require('express-rate-limit');

// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

// Strict rate limiter for authentication - 5 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        error: 'Too many login attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many login attempts',
            message:
                'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

// Moderate rate limiter for AI predictions - 20 per hour
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
        error: 'Too many AI prediction requests',
        retryAfter: '1 hour'
    }
});

// Lenient rate limiter for read operations - 200 per 15 minutes
const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
    }
});

// Strict rate limiter for write operations - 50 per 15 minutes
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        error: 'Too many write requests',
        retryAfter: '15 minutes'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    aiLimiter,
    readLimiter,
    writeLimiter
};
