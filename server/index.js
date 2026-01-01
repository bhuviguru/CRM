const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Self-Healing CRM Backend is running');
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard Stats Endpoint
app.get('/api/dashboard/stats', (req, res) => {
    console.log('Dashboard stats requested');
    res.json({
        healthScore: 85,
        healthTrend: 'up',
        activeCustomers: 1240,
        churnRiskCount: 12,
        revenueAtRisk: 45000
    });
});

// Proxy to Python AI Engine
app.post('/api/predict/churn', async (req, res) => {
    try {
        const response = await fetch('http://localhost:8000/predict/churn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`AI Engine responded with ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error connecting to AI Engine:', error);
        res.status(503).json({ error: 'AI Engine unavailable', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
