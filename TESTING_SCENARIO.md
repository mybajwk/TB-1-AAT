# Testing Scenarios

## 1. Functional Testing (Integration)

These scenarios verify that the microservices communicate correctly to fulfill the business requirements.

### Scenario A: Public Report Submission (End-to-End)
**Goal**: Verify a user can submit a report and it gets classified and notified.
1.  **Request**: `POST /reports`
    *   Body: `{"title": "Broken light", "description": "Lampu jalan mati", "location": {...}, "visibility": "public"}`
2.  **Expected Behavior**:
    *   **Routing Service**: Receives description "Lampu jalan mati", returns category "infrastructure" (or similar).
    *   **Report Service**: Saves report with status "submitted".
    *   **Notification Service**: Receives request to notify "Dinas PU" (Infrastructure authority).
3.  **Verification**: Response should include `report_id` and `category: "infrastructure"`.

### Scenario B: Anonymous Reporting
**Goal**: Verify privacy requirement (S1d).
1.  **Request**: `POST /reports`
    *   Body: `{"..., "visibility": "anonymous", "user_id": "user-123"}`
2.  **Expected Behavior**:
    *   **Report Service**: Saves the report but forces `user_id` to `null`.
3.  **Verification**: creating the report should return a `user_id: null` in the response body.

### Scenario C: System Health
**Goal**: Verify all services are reachable via Gateway.
1.  **Request**: `GET /health` (Gateway) -> 200 OK.
2.  **Request**: `GET /report/health` (via Gateway or port forwarding) -> 200 OK.

---

## 2. Load Testing (Scalability)

**Goal**: Demonstrate the system can handle high concurrency (simulating 2.5m user base traffic spikes).

**Tool**: k6
**Script**: `tests/load/k6-script.js`

### Configuration
*   **Virtual Users (VUs)**: Ramp up to 100-500 VUs.
*   **Duration**: 2-5 minutes.
*   **Target**: API Gateway URL.

### Success Metrics
*   **Error Rate**: < 1%
*   **P95 Latency**: < 500ms for Writes, < 200ms for Reads.
