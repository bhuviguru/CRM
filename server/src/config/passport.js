const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { pool } = require('../db');

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Step 1: Check if user exists with this GitHub ID
            let result = await pool.query(
                'SELECT * FROM users WHERE github_id = ?',
                [profile.id]
            );

            if (result.rows.length > 0) {
                // User exists with this GitHub ID - login
                return done(null, result.rows[0]);
            }

            // Step 2: Get email from GitHub profile
            const email = profile.emails?.[0]?.value;

            if (!email) {
                // GitHub didn't provide email - reject
                return done(new Error('GitHub account must have a verified email address'), null);
            }

            // Step 3: Check if user exists with this email (account linking)
            const existingUser = await pool.query(
                'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
                [email]
            );

            if (existingUser.rows.length > 0) {
                // Link GitHub account to existing user
                await pool.query(
                    'UPDATE users SET github_id = ?, auth_provider = ?, profile_picture = ? WHERE id = ?',
                    [profile.id, 'github', profile.photos?.[0]?.value, existingUser.rows[0].id]
                );

                // Return updated user
                const updatedUser = await pool.query('SELECT * FROM users WHERE id = ?', [existingUser.rows[0].id]);
                return done(null, updatedUser.rows[0]);
            }

            // Step 4: Create new user with GitHub account
            result = await pool.query(
                `INSERT INTO users (email, name, github_id, auth_provider, profile_picture, is_active, role, password_hash)
         VALUES (?, ?, ?, 'github', ?, TRUE, 'user', NULL)
         RETURNING *`,
                [
                    email,
                    profile.displayName || profile.username || 'GitHub User',
                    profile.id,
                    profile.photos?.[0]?.value || null
                ]
            );

            return done(null, result.rows[0]);
        } catch (error) {
            console.error('❌ GitHub OAuth error:', error);
            return done(error, null);
        }
    }
));

module.exports = passport;
