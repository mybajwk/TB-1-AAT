# Distributed Citizen Reporting System (PoC)

## Overview
This is a robust Proof-of-Concept for a scalable, distributed citizen reporting system designed for high concurrency (target 2.5 million inhabitants). It uses a **Microservices Architecture** orchestrated on **Kubernetes**, implemented primarily using **Node.js**.

## Architecture

### Services
1.  **API Gateway (Nginx)**: High-performance entry point, handles routing / load balancing.
    - Node Port: `30080` (mapped to ClusterIPs)
2.  **Auth Service (Node.js)**: 
    - RBAC (Citizen, Authority, Admin).
    - Features: JWT Auth, Department-based Registration.
3.  **Report Service (Node.js)**: 
    - Core logic for reporting.
    - Features: **Redis Caching** (Cache-Aside), **Department Isolation**, **Anonymity Masking**, **Auto-Escalation** (Cron).
4.  **Multimedia Service (Node.js)**: 
    - Handles file uploads to disk storage (pvc).
5.  **Notification Service (Node.js)**: 
    - **Real-time** updates via Socket.IO.
    - **FCM** integration for Push Notifications.
6.  **Analytics Service (Node.js)**: 
    - Aggregates daily stats and performance metrics.

### Infrastructure
- **Kubernetes (Minikube)**: Orchestration.
- **PostgreSQL**: Primary Database (shared instance for PoC).
- **Redis**: Caching layer for high-read endpoints (`GET /reports`).
- **Persistent Volumes**: For database data and multimedia files.

## Tech Stack
- **Runtime**: Node.js (Express)
- **Database**: PostgreSQL (Prisma ORM)
- **Caching**: Redis
- **Real-time**: Socket.IO
- **Containerization**: Docker & Kubernetes

## Key Features Implemented
- **Department Isolation**: Authorities only see reports relevant to their department.
- **Anonymity**: Public/Authority cannot see the identity of anonymous reporters, but system tracks ownership.
- **Reliability (Outbox Pattern)**: Notifications are saved to DB first, then processed by a robust cron job to ensure delivery.
- **Performance**: High-traffic read endpoints are cached.
- **Escalation**: Reports pending > 24h are auto-escalated.

## Setup & Deployment

### Prerequisites
- Docker
- Minikube
- Node.js (for running tests)

### Deployment Steps
1.  **Start Minikube**:
    ```bash
    minikube start
    eval $(minikube docker-env)
    ```
2.  **Build Images**:
    ```bash
    docker build -t auth-service:latest ./apps/auth-service
    docker build -t report-service:latest ./apps/report-service
    docker build -t analytics-service:latest ./apps/analytics-service
    docker build -t notification-service:latest ./apps/notification-service
    docker build -t multimedia-service:latest ./apps/multimedia-service
    docker build -t api-gateway:latest ./apps/api-gateway
    ```
3.  **Apply Manifests**:
    ```bash
    kubectl apply -f k8s/
    ```
4.  **Access System**:
    - URL: `http://<MINIKUBE_IP>:30080/api/v1/...`
    - Swagger Documentation: `docs/swagger.yaml`

### Database Initialization (First Time Only)
Because this is a persistent architecture, you need to initialize the database schema and seed data once after the first deployment.

1.  **Enable UUID Extension**:
    ```bash
    kubectl exec -it -n citizen-reporting deploy/postgres -- psql -U user -d reporting_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
    ```

2.  **Push Prisma Schema (Create Tables)**:
    ```bash
    kubectl exec -it -n citizen-reporting deploy/auth-service -- npx prisma db push
    ```

3.  **Seed Initial Data (Roles, Statuses, Categories)**:
    ```bash
    # Copy seed file to container
    kubectl cp scripts/initial_schema.sql citizen-reporting/$(kubectl get pod -l app=postgres -n citizen-reporting -o jsonpath="{.items[0].metadata.name}"):/tmp/seed.sql
    
    # Execute seed
    kubectl exec -it -n citizen-reporting deploy/postgres -- psql -U user -d reporting_db -f /tmp/seed.sql
    ```

