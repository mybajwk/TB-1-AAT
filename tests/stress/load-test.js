const axios = require('axios');

const BASE_URL = 'http://localhost:8000';
const CONCURRENT_USERS = 50;
const TOTAL_REQUESTS = 200;

async function runBenchmark() {
    console.log(`🚀 Starting Stress Test: ${CONCURRENT_USERS} concurrent users, ${TOTAL_REQUESTS} total reqs...`);

    // Login to get token first
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'citizen_test@example.com', // Ensure this user exists or use e2e to create one
        password: 'password123'
    }).catch(() => null);

    let token = null;
    if (loginRes && loginRes.data.token) {
        token = loginRes.data.token;
        console.log('   Got Token for Authenticated Load Test');
    } else {
        console.log('   ⚠️ Could not login, running as Unauthenticated (might fail for protected routes)');
        // In real scenario, we'd register a temp user first.
        // For now, assuming maybe public endpoints or failing gracefully.
        // Let's create a temp user just in case.
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                email: 'citizen_load@test.com',
                password: 'password123',
                full_name: 'Load Tester'
            });
            const login = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'citizen_load@test.com',
                password: 'password123'
            });
            token = login.data.token;
        } catch (e) { console.log('   User creation failed (maybe exists), trying login...'); }
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const requests = [];
    let success = 0;
    let fail = 0;
    const start = Date.now();

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
        requests.push(
            axios.get(`${BASE_URL}/health`, { headers }) // Hitting Gateway -> Auth Service (Health)
                .then(() => success++)
                .catch(() => fail++)
        );
        // Throttle slightly to batch
        if (i % CONCURRENT_USERS === 0) await new Promise(r => setTimeout(r, 10));
    }

    await Promise.all(requests);
    const duration = (Date.now() - start) / 1000;

    console.log('\n📊 RESULTS:');
    console.log(`   Total Requests: ${TOTAL_REQUESTS}`);
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${fail}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   RPS: ${(TOTAL_REQUESTS / duration).toFixed(2)} req/s`);
}

runBenchmark();
