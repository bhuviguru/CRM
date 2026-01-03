const aiService = require('./src/services/ai');

async function test() {
    console.log('Testing AI Service Fallback...');
    try {
        const result = await aiService.getChurnPrediction({
            support_tickets: 5,
            email_response_time: 24,
            usage_frequency: 10,
            contract_value: 1000
        });
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

test();
