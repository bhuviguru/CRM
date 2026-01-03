const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const securityMiddleware = require('./middleware/security');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

// Load env vars
dotenv.config();

const app = express();

// Security middleware (Helmet, compression, security headers)
securityMiddleware(app);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
    app.use(logger.requestLogger);
}

// Rate limiting - apply to all API routes (skip in test)
if (process.env.NODE_ENV !== 'test') {
    app.use('/api/', apiLimiter);
}

// Log startup
if (process.env.NODE_ENV !== 'test') {
    logger.info('Server initializing...');
}

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.get('/', (req, res) => {
    res.send('SahayakCRM Pro Backend Running - Visit /api-docs for API documentation');
});

app.get('/api/health', async (req, res) => {
    const { pool } = require('./db');
    try {
        // Use SELECT 1 instead of SELECT NOW() for cross-DB compatibility (Postgres/SQLite)
        await pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'backend',
            timestamp: new Date().toISOString(),
            // dbResponse: dbRes.rows[0].now,
            websocket: 'enabled',
            features: {
                emailTemplates: true,
                importExport: true,
                bulkOperations: true,
                advancedSearch: true,
                apiDocs: true,
                security: true
            }
        });
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            logger.error('Database health check failed', { error: err.message });
        }
        res.status(500).json({ status: 'error', service: 'backend', db: 'disconnected' });
    }
});

// Import Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const customerRoutes = require('./routes/customers');
app.use('/api/customers', customerRoutes);

const contactRoutes = require('./routes/contacts');
app.use('/api/contacts', contactRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const aiRoutes = require('./routes/ai');
app.use('/api/predict', aiRoutes);

const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);

const emailRoutes = require('./routes/email');
app.use('/api/email', emailRoutes);

// NEW: Email Templates
const emailTemplatesRoutes = require('./routes/emailTemplates');
app.use('/api/email-templates', emailTemplatesRoutes);

// NEW: Import/Export & Bulk Operations
const importExportRoutes = require('./routes/importExport');
app.use('/api/data', importExportRoutes);

module.exports = app;
