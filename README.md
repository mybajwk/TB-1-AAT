# Distributed Citizen Reporting System (PoC)

## Overview
This is a Proof-of-Concept for a scalable, distributed citizen reporting system designed for a city with 2.5 million inhabitants. It uses a **Microservices Architecture** with an **API Gateway**, implemented using **Node.js** and **Go**.

## Architecture

### Services
1.  **API Gateway (Node.js)**: Entry point, handles routing to other services.
    - Port: `8000`
2.  **Auth Service (Node.js)**: Manages user registration and JWT authentication.
    - Port: `3001`
3.  **Routing & Classification Service (Go)**: Classifies reports using mock logic.
    - Port: `8080`
4.  **Notification Service (Node.js)**: Simulates sending email/push notifications.
    - Port: `3002`
5.  **Analytics Service (Go)**: Provides dashboard statistics.
    - Port: `8081`

### Infrastructure
- **Docker Compose**: Orchestrates all services and databases.
- **PostgreSQL**: Database for Auth and (future) Report services.
- **Redis**: For caching (setup in compose, ready for integration).

## Tech Stack
- **Node.js**: API Gateway, Auth, Notification
- **Go (Golang)**: Routing, Analytics
- **Docker**: Containerization

## Setup & Run

### Prerequisites
- Docker & Docker Compose
- Node.js (for local dev)
- Go (for local dev)

### Run with Docker Compose
```bash
docker-compose up --build
```

### API Endpoints (via Gateway)

- **Auth**: `POST http://localhost:8000/auth/register`, `POST http://localhost:8000/auth/login`
- **Classify**: `POST http://localhost:8000/classify/classify`
- **Notify**: `POST http://localhost:8000/notify/send`
- **Analytics**: `GET http://localhost:8000/analytics/stats`

### Kubernetes (Minikube)
See [k8s/README.md](k8s/README.md) for instructions on how to deploy to Minikube.
