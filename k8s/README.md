# Kubernetes Deployment

This directory contains the manifests to deploy the system to Kubernetes (e.g., Minikube).

## Prerequisites
- Minikube installed
- `kubectl` installed

## How to Deploy

1.  **Start Minikube**:
    ```bash
    minikube start
    ```

2.  **Point your shell to Minikube's Docker daemon**:
    This is critical so Minikube can find the local images you build.
    ```bash
    eval $(minikube docker-env)
    ```

3.  **Build Images**:
    Build the images *inside* Minikube's Docker environment.
    ```bash
    docker build -t api-gateway:latest ./apps/api-gateway
    docker build -t auth-service:latest ./apps/auth-service
    docker build -t report-service:latest ./apps/report-service
    docker build -t notification-service:latest ./apps/notification-service
    docker build -t analytics-service:latest ./apps/analytics-service
    docker build -t multimedia-service:latest ./apps/multimedia-service
    ```

4.  **Apply Manifests**:
    ```bash
    kubectl apply -f k8s/00-namespace.yaml
    kubectl apply -f k8s/01-config.yaml
    kubectl apply -f k8s/02-infrastructure.yaml
    kubectl apply -f k8s/03-apps.yaml
    kubectl apply -f k8s/04-observability.yaml
    ```

5.  **Access the API Gateway**:
    Since we use `LoadBalancer` type for the gateway:
    ```bash
    minikube service api-gateway -n citizen-reporting --url
    ```
    Use the returned URL to send requests.

## Observability (Prometheus + Grafana)

After deploying, access the monitoring tools:

1.  **Prometheus UI**:
    ```bash
    minikube service prometheus -n citizen-reporting --url
    ```
    - Query metrics at `/graph`
    - Check targets at `/targets`

2.  **Grafana Dashboard**:
    ```bash
    minikube service grafana -n citizen-reporting --url
    ```
    - Login: `admin` / `admin123`
    - Prometheus datasource is pre-configured
    - Create dashboards to visualize HTTP request metrics

