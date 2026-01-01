const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { auditLog } = require('../db/helpers');

// CRITICAL: JWT_SECRET must be set in environment variables
// This is enforced in middleware/auth.js at startup
const { generateToken } = require('../middleware/auth');

// Constants
const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Default role is 'user' unless specified (and you might want to restrict who can set 'admin')
        const role = 'user';

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Email, password, and name are required'
            });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must be at least 8 characters long'
            });
        }

        // Password must contain both letters and numbers
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasLetter || !hasNumber) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must contain both letters and numbers'
            });
        }

        // Check if user exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'User already exists',
                message: 'A user with this email already exists'
            });
        }

        // Hash password
        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate ID
        const userId = require('crypto').randomUUID();

        // Create user
        await pool.query(
            `INSERT INTO users (id, email, password_hash, name, role, is_active)
             VALUES ($1, $2, $3, $4, $5, TRUE)`,
            [userId, email, hashedPassword, name, role]
        );

        const user = {
            id: userId,
            email,
            name,
            role
        };

        // Generate JWT token
        const token = generateToken({ id: user.id, email: user.email, role: user.role });

        // Audit log
        await auditLog('user', user.id, 'registered', user.id, { after: user }, req);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);

        // Prevent leaking implementation details (like "cannot read property") to frontend
        const errorMessage = error.code === '23505' // Unique violation
            ? 'A user with this email already exists'
            : 'Registration completed with warnings - please try logging in.';

        // If we crashed AFTER insert but BEFORE response, the user exists now.
        // It's safer to tell them to login.

        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred during registration. Please try logging in if you believe the account was created.',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


/**
 * GitHub OAuth callback
 * @route GET /api/auth/github/callback
 */
exports.githubCallback = async (req, res) => {
    try {
        const user = req.user;

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        const userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profile_picture: user.profile_picture
        };

        // Redirect to frontend with token and user data
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`);
    } catch (error) {
        console.error('GitHub callback error:', error);
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
};


/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [
            user.id
        ]);

        // Generate token
        const { generateToken } = require('../middleware/auth');
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Audit log
        await auditLog('user', user.id, 'logged_in', user.id, {}, req);

        // SUCCESS RESPONSE
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get current user
 * @route GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT id, email, name, role, created_at, last_login FROM users WHERE id = $1 AND is_active = TRUE',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            error: 'Failed to get user',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        // Audit log
        await auditLog('user', req.user.id, 'logged_out', req.user.id, {}, req);

        res.json({
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Change password
 * @route POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'New password must be at least 8 characters long'
            });
        }

        // Get user
        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid current password'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedPassword, userId]
        );

        // Audit log
        await auditLog('user', userId, 'password_changed', userId, {}, req);

        res.json({
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Failed to change password',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
