# Build Stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod ./
# COPY go.sum ./

COPY . .

RUN go build -o analytics-service main.go

# Run Stage
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/analytics-service .

EXPOSE 8081

CMD ["./analytics-service"]
