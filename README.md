# ⚽ BallStream

Live football match center — real-time scores, schedules, and results from global leagues. Built with **Go** backend + **React 19** frontend.

## 🚀 Quick Start

```bash
# Terminal 1 — Backend (http://localhost:8081)
go run main.go

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open **http://localhost:5173**

---

## 🏗️ Architecture

```
Browser (localhost:5173)
    ↓ /api/* proxied by Vite
Backend (localhost:8081)
    ↓
PostgreSQL ─── Upstream API (sportsrc.org)
```

| Layer | Tech | Notes |
|-------|------|-------|
| Backend | Go 1.21+ stdlib | REST API, JWT auth, circuit breaker |
| Frontend | React 19 + Vite 8 | SPA, client-side routing, TailwindCSS |
| DB | PostgreSQL | Sessions, cache, user data |
| Cache | In-memory (Go) | Auto-refresh from upstream API |

---

## ✨ Features

- **Live matches** — real-time scores with auto-refresh countdown
- **Upcoming & finished** — full schedule and results
- **Auth system** — JWT login/logout, session polling (30s), auto-logout on concurrent login
- **User management** (super_admin) — CRUD, password reset, session reset
- **Role-based access** — `user` / `super_admin` roles
- **Dark/light theme** — persisted to localStorage
- **CSRF protection** — single-use tokens on mutating requests
- **Responsive design** — mobile-first, glassmorphism UI

---

## 🛠️ Tech Stack

### Backend
- Go standard library HTTP server
- JWT (golang-jwt) — access + refresh token flow
- PostgreSQL (lib/pq) — users, sessions
- In-memory cache with TTL + circuit breaker
- Gzip compression, rate limiting, security headers
- Request ID logging middleware

### Frontend
- React 19 with hooks + context
- Vite 8 (dev server + build)
- TailwindCSS v4
- SweetAlert2 — themed toast/dialogs
- lucide-react — icon set
- Custom SVG icons (inline)

---

## 👤 Auth System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Login with email/password |
| `/api/v1/auth/logout` | POST | Invalidate session |
| `/api/v1/auth/verify` | GET | Session health check (polled every 30s) |
| `/api/v1/auth/csrf` | GET | Get single-use CSRF token |

- Passwords: bcrypt, min 8 chars, must have upper+lower+digit+special
- Sessions tracked in DB — concurrent login from another device invalidates this session
- Token expiry read from JWT payload → auto-logout on expiry

---

## 👥 User Management (Super Admin)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/users` | GET | List all users |
| `/api/v1/users` | POST | Create user |
| `/api/v1/users/:id` | PUT | Update user |
| `/api/v1/users/:id` | DELETE | Delete user |
| `/api/v1/users/:id/reset-password` | POST | Reset to default |
| `/api/v1/users/:id/reset-session` | POST | Force logout all devices |

---

## 📁 Project Structure

```
.
├── main.go                 # Entry point
├── internal/
│   ├── handlers/          # HTTP handlers
│   ├── middleware/        # Auth, CORS, rate limit, logging, gzip, security
│   ├── models/           # Data models
│   ├── config/           # Env-based config
│   └── services/         # Business logic
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components (Navbar, Icons, UI, etc.)
│   │   ├── context/      # React providers (Auth, Data, Theme)
│   │   ├── hooks/        # Custom hooks (useApi, useCountdown)
│   │   ├── pages/        # Page components
│   │   ├── routes/       # Client-side routing
│   │   ├── services/     # API client layer
│   │   └── utils/        # Helpers (format, security, swal)
│   ├── vite.config.js    # Vite config + proxy
│   └── package.json
├── .env                   # Backend config (not in Git)
└── README.md
```

---

## ⚙️ Configuration

### Backend (`.env`)
```env
PORT=8081
ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/ballstream
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173,https://ball-stream.kana.my.id
```

### Frontend (`frontend/.env`)
```env
VITE_API_KEY=  # Empty for dev, set for production
```

---

## 🔒 Security

- JWT access token with expiry
- bcrypt password hashing
- CSRF tokens (single-use, per-request)
- Session tracking — detect concurrent logins
- Rate limiting per IP
- CORS origin allowlist
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Request body size limits
- Gzip compression

---

## 🌐 Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/bootstrap` | Initial data (sports, account, refresh config) |
| `GET /api/v1/account` | Account usage info |
| `GET /api/v1/matches` | All matches |
| `GET /api/v1/match/:id` | Match detail |
| `GET /api/v1/sports` | Sports list |
| `GET /api/v1/upstreams` | Upstream status |
| `GET /api/v1/users` | User list (super_admin) |

---

## 🖥️ Port Summary

| Service | Port | URL |
|---------|------|-----|
| Backend | 8081 | http://localhost:8081 |
| Frontend | 5173 | http://localhost:5173 |

---

## 📝 License

MIT
