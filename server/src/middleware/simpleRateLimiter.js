/**
 * Simple In-Memory Rate Limiter
 * Prevents abuse and accidental overload
 */

const requestCounts = new Map();

/**
 * Clean up old entries every 5 minutes
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
        if (now - data.resetTime > 300000) { // 5 minutes
            requestCounts.delete(key);
        }
    }
}, 300000);

/**
 * Create rate limiter middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} message - Error message
 */
const createRateLimiter = (maxRequests = 100, windowMs = 60000, message = 'Too many requests') => {
    return (req, res, next) => {
        // Use IP address or user ID as key
        const key = req.user?.id || req.ip || req.connection.remoteAddress;

        if (!key) {
            return next();
        }

        const now = Date.now();
        const data = requestCounts.get(key);

        if (!data || now - data.resetTime > windowMs) {
            // New window
            requestCounts.set(key, {
                count: 1,
                resetTime: now
            });
            return next();
        }

        if (data.count >= maxRequests) {
            // Rate limit exceeded
            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message,
                    details: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
                    retryAfter: Math.ceil((data.resetTime + windowMs - now) / 1000)
                }
            });
        }

        // Increment count
        data.count++;
        next();
    };
};

/**
 * Strict rate limiter for auth routes (100 req/min)
 */
exports.authLimiter = createRateLimiter(
    100,
    60000,
    'Too many authentication attempts'
);

/**
 * Moderate rate limiter for create/update routes (300 req/min)
 */
exports.writeLimiter = createRateLimiter(
    300,
    60000,
    'Too many write requests'
);

/**
 * Lenient rate limiter for read routes (1000 req/min)
 */
exports.readLimiter = createRateLimiter(
    1000,
    60000,
    'Too many read requests'
);

/**
 * Very strict rate limiter for expensive operations (10 req/min)
 */
exports.expensiveLimiter = createRateLimiter(
    10,
    60000,
    'This operation is rate limited to 10 request per minute'
);

module.exports = exports;
