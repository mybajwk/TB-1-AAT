import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 50 },  // Ramp up to 50 users
        { duration: '1m', target: 100 },  // Stay at 100 users
        { duration: '10s', target: 0 },   // Scale down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
        http_req_failed: ['rate<0.01'],   // <1% errors
    },
};

const BASE_URL = 'http://localhost:8000'; // Change if Minikube IP differs

export default function () {
    // 1. Health Check (Lightweight)
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, { 'health check status is 200': (r) => r.status === 200 });

    // 2. Submit Report (Write Heavy)
    const reportPayload = JSON.stringify({
        title: 'Load Test Report',
        description: 'Road is broken at location X',
        location: { lat: -6.2, long: 106.8 },
        visibility: 'public',
        user_id: 'load-tester'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const reportRes = http.post(`${BASE_URL}/reports/`, reportPayload, params);
    check(reportRes, {
        'create report status is 201': (r) => r.status === 201,
        'classification worked': (r) => r.json('category') !== undefined,
    });

    // 3. Upvote (Interaction)
    if (Math.random() < 0.3) { // 30% chance to upvote
        const upvoteRes = http.post(`${BASE_URL}/reports/mock-id/upvote`, null, params);
        // specific check can be done if we parse a real ID, but for load testing mock is fine or handled by setup
    }

    sleep(1);
}
