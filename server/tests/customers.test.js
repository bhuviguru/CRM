const request = require('supertest');
const app = require('../src/app');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = 'true';

describe('Customers API', () => {
    let authToken;
    let testCustomerId;

    beforeAll(async () => {
        // Login to get auth token
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@sahayakcrm.com',
                password: 'admin123'
            });
        authToken = res.body.token;
    });

    describe('GET /api/customers', () => {
        it('should get all customers with auth', async () => {
            const res = await request(app)
                .get('/api/customers')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should reject without auth token', async () => {
            const res = await request(app)
                .get('/api/customers');

            expect(res.statusCode).toBe(401);
        });
    });

    describe('POST /api/customers', () => {
        it('should create customer with valid data', async () => {
            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    account_name: 'Test Company',
                    industry: 'Technology',
                    tier: 'Growth',
                    mrr: 1000,
                    status: 'Active'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.account_name).toBe('Test Company');

            testCustomerId = res.body.id;
        });

        it('should reject without account_name', async () => {
            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    industry: 'Technology'
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('PUT /api/customers/:id', () => {
        it('should update customer', async () => {
            if (!testCustomerId) {
                // Create test customer first
                const createRes = await request(app)
                    .post('/api/customers')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        account_name: 'Update Test',
                        status: 'Active'
                    });
                testCustomerId = createRes.body.id;
            }

            const res = await request(app)
                .put(`/api/customers/${testCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    mrr: 2000,
                    status: 'At Risk'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.mrr).toBe(2000);
        });
    });
});
