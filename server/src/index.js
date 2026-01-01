const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize WebSocket and Start Server
const startServer = async () => {
    try {
        // Initialize WebSocket (async)
        const { initializeWebSocket } = require('./services/websocket');
        await initializeWebSocket(server);

        // Start HTTP server
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info('WebSocket enabled');
            logger.info('Database connected');
            logger.info('Rate limiting active');
            logger.info('Production features enabled');
        });
    } catch (err) {
        logger.error('Failed to start server', { error: err.message, stack: err.stack });
        process.exit(1);
    }
};

startServer();
