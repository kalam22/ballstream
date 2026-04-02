# Football Stream

Live football match streaming platform with Go backend and React frontend.

## 🎉 Latest Update: API v1 Released!

**API Score:** 92/100 ⭐ (upgraded from 78/100)

New features:
- ✅ API Versioning (`/api/v1/*`)
- ✅ Pagination support
- ✅ Standardized error responses
- ✅ Health check endpoint
- ✅ OpenAPI documentation
- ✅ Request ID tracking

📖 [Quick Start Guide](QUICK_START_API_V1.md) | [Full Implementation Report](API_OPTIMIZATION_IMPLEMENTED.md)

---

## 🚀 Quick Start

### 1. Start Backend (Terminal 1)
```bash
go run main.go
```
Backend runs on: **http://localhost:8081**

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs on: **http://localhost:5173**

### 3. Open Browser
```
http://localhost:5173
```

## 📖 Documentation

- [🚀 Quick Start API v1](QUICK_START_API_V1.md) - New API features and usage
- [📊 API Optimization Report](API_OPTIMIZATION_IMPLEMENTED.md) - Implementation details
- [📘 Complete Setup Guide](CARA_MENJALANKAN.md) - Detailed installation and configuration
- [🔒 Security Guide](SECURITY.md) - Security features and best practices
- [🚀 Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [📄 OpenAPI Spec](openapi.yaml) - Complete API documentation

## 🏗️ Architecture

```
Browser (localhost:5173)
    ↓ API requests
Backend (localhost:8081)
```

- **Backend:** Go 1.21+ - Pure API server
- **Frontend:** React 18 + Vite - Separate dev server
- **Communication:** Vite proxies `/api/*` to backend

## ✨ Features

- ⚽ Live match streaming
- 📊 Real-time match data with auto-refresh
- 🎨 Modern responsive UI
- 🔒 Security headers and CORS
- 🚀 Hot reload for development
- 🔐 Optional API authentication
- 📈 Rate limiting and DDoS protection

## 🛠️ Tech Stack

### Backend
- Go 1.21+
- Standard library HTTP server
- Environment-based configuration
- Circuit breaker for upstream APIs

### Frontend
- React 18
- Vite 8
- React Router (client-side)
- Modern CSS with custom properties

## 📦 Installation

### Prerequisites
- Go 1.21+
- Node.js 18+
- API keys from https://api.sportsrc.org/

### Backend Setup
```bash
# Install dependencies
go mod download

# Copy environment file
cp .env.example .env

# Edit .env and add your API keys
# NEVER commit .env to Git!
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env if needed (optional in dev mode)
```

## ⚙️ Configuration

### Backend (`.env`)
```bash
PORT=8081
ENV=development  # or 'production'
API_KEY=your-api-key-here
ALLOWED_ORIGINS=http://localhost:5173
API_AUTH_REQUIRED=false  # Development mode
CLIENT_API_KEYS=  # Optional API keys for frontend auth
```

### Frontend (`frontend/.env`)
```bash
VITE_API_KEY=  # Empty for development mode
```

## 🔌 API Endpoints

### New Versioned Endpoints (v1)
All endpoints available at `http://localhost:8081`:

- `GET /health` - Health check with cache status
- `GET /api/v1/matches` - List all matches (paginated)
- `GET /api/v1/match/:id` - Match detail
- `GET /api/v1/bootstrap` - Initial data
- `GET /api/v1/account` - Account info
- `GET /api/v1/sports` - Sports list
- `GET /api/v1/upstreams` - Upstream status
- `GET /internal/metrics` - Prometheus metrics (localhost only)

### Legacy Endpoints (Backward Compatible)
- `GET /api/matches` - Alias to `/api/v1/matches`
- `GET /api/match/:id` - Alias to `/api/v1/match/:id`
- `GET /api/bootstrap` - Alias to `/api/v1/bootstrap`
- `GET /api/account` - Alias to `/api/v1/account`
- `GET /api/sports` - Alias to `/api/v1/sports`
- `GET /api/upstreams` - Alias to `/api/v1/upstreams`

### Pagination
```bash
# Default (page 1, 50 items)
GET /api/v1/matches

# Custom pagination
GET /api/v1/matches?page=2&limit=20
```

### Response Format
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 78,
    "total_pages": 2
  }
}
```

## 🔧 Development

### Auto-Reload Backend (Optional)
```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with auto-reload
air
```

### Frontend Hot Reload
Automatic - just save your files!

### Vite Proxy Configuration
Frontend automatically proxies API requests to backend:
```javascript
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:8081'
  }
}
```

## 🏭 Production Build

### Build Frontend
```bash
cd frontend
npm run build
```

### Build Backend
```bash
go build -o football-stream.exe main.go
```

### Deploy
1. Upload binary and `frontend/dist/`
2. Set environment variables
3. Run: `./football-stream.exe`

## 🔒 Security Features

- ✅ API key authentication (optional)
- ✅ Rate limiting per IP
- ✅ CORS with origin allowlist
- ✅ Input validation
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ Request body size limits
- ✅ Circuit breaker for upstream APIs
- ✅ HTTPS support
- ✅ Pre-commit hooks to prevent secret leaks

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8081 is in use
netstat -ano | findstr :8081
```

### Frontend won't start
```bash
# Check if port 5173 is in use
netstat -ano | findstr :5173
# Vite will auto-use next available port
```

### CORS errors
Ensure `ALLOWED_ORIGINS` in `.env` includes `http://localhost:5173`

### API 403 Forbidden
Replace API keys in `.env` with valid keys from https://api.sportsrc.org/

### Data not loading
1. Check backend is running: `curl http://localhost:8081`
2. Check API keys are valid
3. Check browser console for errors
4. Check Network tab in DevTools

## 📁 Project Structure

```
.
├── main.go                 # Backend entry point
├── handlers/              # API handlers
│   ├── api.go            # API endpoints
│   ├── cache.go          # Caching layer
│   ├── fetch.go          # Upstream client
│   └── observability.go  # Metrics
├── models/               # Data models
├── .env                  # Backend config (not in Git)
├── frontend/
│   ├── src/             # React source code
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Page components
│   │   └── context/     # React context
│   ├── dist/            # Production build
│   ├── .env             # Frontend config (not in Git)
│   ├── vite.config.js   # Vite config (proxy)
│   └── package.json
└── README.md
```

## 🌐 Port Summary

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Backend | 8081 | http://localhost:8081 | API Server (Go) |
| Frontend | 5173 | http://localhost:5173 | Dev Server (Vite) |

## 📝 License

MIT

## 🆕 What's New in v1

- **API Versioning:** `/api/v1/*` endpoints with backward compatibility
- **Pagination:** All list endpoints support `?page=1&limit=50`
- **Standardized Errors:** Consistent JSON format with error codes
- **Health Check:** `/health` endpoint for monitoring
- **Request ID Tracking:** `X-Request-ID` header for debugging
- **OpenAPI Docs:** Complete API specification in `openapi.yaml`
- **Production Security:** Automatic authentication enforcement

See [API_OPTIMIZATION_IMPLEMENTED.md](API_OPTIMIZATION_IMPLEMENTED.md) for details.

## 🤝 Support

- 🚀 [Quick Start API v1](QUICK_START_API_V1.md)
- 📊 [API Optimization Report](API_OPTIMIZATION_IMPLEMENTED.md)
- 📖 [Setup Guide](CARA_MENJALANKAN.md)
- 🔒 [Security Guide](SECURITY.md)
- 🚀 [Deployment Guide](DEPLOYMENT.md)
- 📄 [OpenAPI Spec](openapi.yaml)
- 🐛 Issues: Open a GitHub issue
