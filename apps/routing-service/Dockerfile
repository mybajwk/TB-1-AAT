# Build Stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./ # No dependencies yet so go.sum might not exist
# RUN go mod download 

COPY . .

RUN go build -o routing-service main.go

# Run Stage
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/routing-service .

EXPOSE 8080

CMD ["./routing-service"]
