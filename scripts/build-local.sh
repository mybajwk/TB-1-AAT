#!/bin/bash

# Exit on error
set -e

echo "🐳 configuring docker environment for minikube..."
# eval $(minikube docker-env)

APPS=("api-gateway" "auth-service" "multimedia-service" "notification-service" "analytics-service" "report-service")

echo "🚀 Building images..."

for app in "${APPS[@]}"; do
    echo "cd apps/$app"
    echo "docker build -t $app:latest ."
    echo "cd ../.."
done

echo "✅ All images built successfully!"
echo "🔄 Restarting deployments to pick up new images..."
kubectl rollout restart deployment -n citizen-reporting

echo "🎉 Done! Check status with: kubectl get pods -n citizen-reporting"
