# Testing Scenario Guide

This document outlines the testing strategies implemented for the Distributed Citizen Reporting System PoC.

## 1. End-to-End (E2E) Integration Test

This test verifies the complete user flow across multiple microservices (`Auth` -> `Report` -> `Multimedia` -> `Notification` -> `Analytics`).

### Scenario Covered:
1.  **Citizen Registration**: A new citizen registers.
2.  **Authority Registration**: A new authority registers for 'Dinas Kebersihan'.
3.  **Login**: Both users obtain JWT tokens.
4.  **Report Creation**: Citizen creates a public report (Trash issue).
5.  **Department Isolation Check**: 
    - Authority (Kebersihan) **SHOULD** see the report.
    - Authority (Other Dept) **SHOULD NOT** see the report.
6.  **Status Update**: Authority updates status to 'IN_PROGRESS'.
7.  **Verification**: Check if status is updated and Notification is triggered.

### How to Run:
Ensure the system is running in Kubernetes and exposed at `http://localhost:30080` (tunneling may be required for local dev).

```bash
# Install dependencies
npm install axios

# Run the script
node tests/integration/e2e-flow.js
```

---

## 2. Low-Level Stress / Load Test

This test simulates high concurrency to validate the system's stability and the effectiveness of **Redis Caching**.

### Scenario:
- **Concurrent Users**: 500 (Simulated)
- **Duration**: Continuous bursts
- **Target**: `GET /api/v1/auth/health` (Can be modified to target `GET /reports` to test Redis).

### Strategy:
The script uses `Promise.all` to fire hundreds of requests in parallel, measuring:
- Success Rate
- Average Latency
- Errors

### How to Run:
```bash
node tests/stress/load-test.js
```

## 3. Manual Verification Steps

### Redis Caching Check
1.  Create a Report as Citizen.
2.  Call `GET /api/v1/reports` as Citizen. (Response 1: Cache Miss -> DB -> Redis).
3.  Call `GET /api/v1/reports` again immediately. (Response 2: **Cache Hit** -> Faster).
4.  Check logs of `report-service` pod:
    ```bash
    kubectl logs -l app=report-service -f
    ```
    Look for `⚡️ [Redis] Cache Hit`.

### Real-time Notification Check
1.  Connect a Socket.IO client to `ws://<HOST>:30080`.
2.  Listen to `notification` event.
3.  Trigger an update on a report you follow.
4.  Verify event is received instantly.
