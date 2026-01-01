const request = require('supertest');
const app = require('../src/app');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = 'true';

describe('Authentication API', () => {
    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@sahayakcrm.com',
                    password: 'admin123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe('admin@sahayakcrm.com');
        });

        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@sahayakcrm.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('should reject missing email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    password: 'admin123'
                });

            expect(res.statusCode).toBe(400);
        });

        it('should reject missing password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@sahayakcrm.com'
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/auth/register', () => {
        it('should register new user with valid data', async () => {
            const uniqueEmail = `test${Date.now()}@test.com`;
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: uniqueEmail,
                    password: 'Test123!@#',
                    name: 'Test User'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe(uniqueEmail);
        });

        it('should reject duplicate email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'admin@sahayakcrm.com',
                    password: 'Test123!@#',
                    name: 'Test User'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('already exists');
        });
    });
});
