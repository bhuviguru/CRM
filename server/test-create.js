const axios = require('axios');

async function testCreate() {
    try {
        console.log('🧪 Testing Customer Creation...');

        // Login first
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@sahayakcrm.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;

        // Create Customer
        const res = await axios.post('http://localhost:5000/api/customers', {
            account_name: 'Test Corp',
            email: 'test@corp.com',
            contract_value: 12000
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Response Status:', res.status);
        console.log('Created Customer:', res.data);

        if (res.data.id === 'cust-6') {
            console.log('✅ SUCCESS: ID is cust-6');
        } else {
            console.error('❌ FAILURE: ID is ' + res.data.id);
        }

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

testCreate();
