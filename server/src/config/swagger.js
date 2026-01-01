const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SahayakCRM API Documentation',
            version: '1.0.0',
            description: 'AI-Powered Customer Retention CRM with Churn Prediction',
            contact: {
                name: 'SahayakCRM',
                email: 'support@sahayakcrm.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server'
            },
            {
                url: 'https://api.sahayakcrm.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            { name: 'Authentication', description: 'User authentication endpoints' },
            { name: 'Customers', description: 'Customer management' },
            { name: 'Contacts', description: 'Contact management' },
            { name: 'Tasks', description: 'Task management' },
            { name: 'AI', description: 'AI churn prediction' },
            { name: 'Email Templates', description: 'Email template management' },
            { name: 'Import/Export', description: 'Data import and export' },
            { name: 'Dashboard', description: 'Dashboard metrics' }
        ]
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
