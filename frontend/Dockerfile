# ============================================================
# Stage 1: Builder — install deps and build
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Cache node_modules separately
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build the production bundle
COPY . .
RUN npm run build

# ============================================================
# Stage 2: Runtime — serve with nginx
# ============================================================
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config for SPA serving
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1
