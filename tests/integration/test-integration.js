const axios = require('axios');

const BASE_URL = 'http://localhost:8000'; // Gateway URL
const LOG_PASS = (msg) => console.log('\x1b[32m%s\x1b[0m', `✅ PASS: ${msg}`);
const LOG_FAIL = (msg) => { console.error('\x1b[31m%s\x1b[0m', `❌ FAIL: ${msg}`); process.exit(1); };

async function runTests() {
    console.log('🚀 Starting Automated Integration Tests...\n');

    try {
        // 1. Health Check
        try {
            const health = await axios.get(`${BASE_URL}/health`);
            if (health.status === 200) LOG_PASS('System is Healthy');
        } catch (e) {
            LOG_FAIL('System is Unreachable (Gateway down?)');
        }

        // 2. Auth - Register & Login
        let token = '';
        let userId = '';
        try {
            await axios.post(`${BASE_URL}/auth/register`, { email: 'test@citizen.com', password: 'password123' });
            const login = await axios.post(`${BASE_URL}/auth/login`, { email: 'test@citizen.com', password: 'password123' });
            token = login.data.token;
            // Decode mock token for easy user id access
            userId = '1';
            LOG_PASS('Authentication Flow (Register + Login)');
        } catch (e) {
            LOG_FAIL(`Auth Failed: ${e.message}`);
        }

        // 3. Create Public Report
        let reportId = '';
        try {
            const res = await axios.post(`${BASE_URL}/reports`, {
                title: 'Broken Street Light',
                description: 'Lampu jalan mati total gelap gulita',
                location: { lat: -6.2, long: 106.8 },
                visibility: 'public',
                user_id: userId
            });

            if (res.data.category === 'infrastructure') LOG_PASS('Routing Service Classified "infrastructure" correctly');
            else LOG_FAIL(`Classification mismatch: got ${res.data.category}`);

            reportId = res.data.report_id;
            LOG_PASS('Public Report Created');
        } catch (e) {
            LOG_FAIL(`Create Report Failed: ${e.message}`);
        }

        // 4. Create Anonymous Report (Verify S1d)
        try {
            const res = await axios.post(`${BASE_URL}/reports`, {
                title: 'Secret Whistleblow',
                description: 'Somebody stealing cables',
                location: { lat: -6.2, long: 106.8 },
                visibility: 'anonymous',
                user_id: userId
            });

            if (res.data.user_id === null) LOG_PASS('Anonymous Report hides User ID');
            else LOG_FAIL('Anonymous Report failed to hide User ID');
        } catch (e) {
            LOG_FAIL(`Create Anon Report Failed: ${e.message}`);
        }

        // 5. Upvote Report
        try {
            const res = await axios.post(`${BASE_URL}/reports/${reportId}/upvote`);
            if (res.data.upvotes === 1) LOG_PASS('Upvote incremented count');
            else LOG_FAIL('Upvote failed to increment');
        } catch (e) {
            LOG_FAIL(`Upvote Failed: ${e.message}`);
        }

        // 6. Authority Update (Status Change)
        try {
            const res = await axios.patch(`${BASE_URL}/reports/${reportId}/status`, { status: 'RESOLVED' });
            if (res.data.status === 'RESOLVED') LOG_PASS('Status updated to RESOLVED');
            else LOG_FAIL('Status update failed');
        } catch (e) {
            LOG_FAIL(`Status Update Failed: ${e.message}`);
        }

        console.log('\n✨ All Tests Passed Successfully!');

    } catch (error) {
        LOG_FAIL(`Unexpected Error: ${error.message}`);
    }
}

runTests();
