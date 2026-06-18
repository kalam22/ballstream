# ============================================================
# Stage 1: Builder — compile the Go binary
# ============================================================
FROM golang:1.24-alpine AS builder

# Install build deps
RUN apk add --no-cache git ca-certificates tzdata

# Allow go to auto-download newer toolchain versions as declared in go.mod
ENV GOTOOLCHAIN=auto

WORKDIR /build

# Cache module downloads as a separate layer
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a statically-linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" \
    -o /app/football-stream .

# ============================================================
# Stage 2: Runtime — minimal alpine (has wget for healthcheck)
# ============================================================
FROM alpine:3.21

# Security + timezone support
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY --from=builder /app/football-stream /usr/local/bin/football-stream

USER appuser

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:8081/health || exit 1

ENTRYPOINT ["football-stream"]
