const jwt = require('jsonwebtoken');

// CRITICAL: JWT_SECRET must be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set');
    console.error('Set JWT_SECRET before starting the server');
    process.exit(1);
}

// Token expiry: 24 hours
const TOKEN_EXPIRY = '24h';

/**
 * Generate JWT token
 */
exports.generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
exports.authenticate = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NO_TOKEN',
                    message: 'Authentication required',
                    details: 'No token provided'
                }
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token || token.trim().length === 0) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'EMPTY_TOKEN',
                    message: 'Authentication required',
                    details: 'Token is empty'
                }
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Validate token payload
        if (!decoded.id || !decoded.email) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN_PAYLOAD',
                    message: 'Invalid token',
                    details: 'Token payload is malformed'
                }
            });
        }

        // Attach user to request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role || 'user'
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token expired',
                    details: 'Please login again'
                }
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid token',
                    details: 'Authentication failed'
                }
            });
        }

        console.error('❌ Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
exports.authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NO_USER',
                    message: 'Authentication required'
                }
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied',
                    details: 'You do not have permission to access this resource'
                }
            });
        }

        next();
    };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
exports.optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            if (token && token.trim().length > 0) {
                const decoded = jwt.verify(token, JWT_SECRET);

                if (decoded.id && decoded.email) {
                    req.user = {
                        id: decoded.id,
                        email: decoded.email,
                        role: decoded.role || 'user'
                    };
                }
            }
        }

        next();
    } catch {
        // Ignore errors for optional auth
        next();
    }
};
