# Insighta Labs — Backend

A secure REST API for the Insighta Labs platform. Handles GitHub OAuth authentication, role-based access control, demographic profile management, and serves both the CLI tool and web portal.

---

## System Architecture

The platform is split into three repositories:

- **Backend** (this repo) — Express.js API, PostgreSQL via Prisma, deployed on Vercel
- **CLI** — Globally installable terminal tool
- **Web Portal** — Browser-based interface

All interfaces share this backend as a single source of truth.

---

## Tech Stack

- **Runtime:** Node.js (>=18)
- **Framework:** Express
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** GitHub OAuth with PKCE, JWT (access + refresh tokens)
- **External APIs:** Genderize, Agify, Nationalize
- **Deployment:** Vercel

---

## Authentication Flow

### CLI Flow (PKCE)

1. CLI generates `code_verifier` and derives `code_challenge` (SHA-256)
2. CLI calls `GET /auth/github` with `code_challenge` and `redirect_uri` (localhost)
3. Backend stores the state with `code_challenge` and `redirect_uri`, builds GitHub OAuth URL using the backend callback URL
4. User authenticates on GitHub
5. GitHub redirects to `GET /auth/github/callback` on the backend
6. Backend detects CLI flow (via stored `redirect_uri`) and redirects browser to CLI's localhost server with the `code` and `state`
7. CLI sends `code`, `state`, and `code_verifier` to `POST /auth/github/token`
8. Backend verifies PKCE, exchanges code with GitHub, upserts user, issues tokens
9. CLI stores tokens at `~/.insighta/credentials.json`

### Web Flow

1. User clicks "Continue with GitHub"
2. Browser is redirected to `GET /auth/github`
3. GitHub redirects to `GET /auth/github/callback`
4. Backend exchanges code, upserts user, sets HTTP-only cookies
5. Browser is redirected to the frontend dashboard

---

## Token Handling

| Token | Expiry | Storage |
|---|---|---|
| Access token | 3 minutes | CLI: `~/.insighta/credentials.json` / Web: HTTP-only cookie |
| Refresh token | 5 minutes | CLI: `~/.insighta/credentials.json` / Web: HTTP-only cookie |

- Each refresh issues a new access + refresh token pair
- The old refresh token is invalidated immediately on use
- Refresh tokens are stored in the database and validated server-side

---

## Role Enforcement

Two roles are supported:

| Role | Permissions |
|---|---|
| `admin` | Create profiles, delete profiles, list, search, export |
| `analyst` | List, search, export profiles (read-only) |

- Default role on signup: `analyst`
- Role is embedded in the JWT and enforced via `requireRole` middleware on every protected route
- Inactive users (`is_active: false`) receive `403 Forbidden` on all requests

---

## API Reference

### Auth Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/auth/github` | Initiate GitHub OAuth |
| GET | `/auth/github/callback` | GitHub OAuth callback |
| POST | `/auth/github/token` | Exchange code for tokens (CLI) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/auth/me` | Get current user |

### Profile Endpoints

All profile endpoints require:
- `Authorization: Bearer <token>` header
- `X-API-Version: 1` header

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/profiles` | admin, analyst | List profiles with filters |
| GET | `/api/profiles/search` | admin, analyst | Natural language search |
| GET | `/api/profiles/export` | admin, analyst | Export profiles as CSV |
| GET | `/api/profiles/:id` | admin, analyst | Get profile by ID |
| POST | `/api/profiles` | admin | Create a profile |
| DELETE | `/api/profiles/:id` | admin | Delete a profile |

### Pagination Shape

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "total_pages": 203,
  "links": {
    "self": "/api/profiles?page=1&limit=10",
    "next": "/api/profiles?page=2&limit=10",
    "prev": null
  },
  "data": []
}
```

---

## Rate Limiting

| Scope | Limit |
|---|---|
| Auth endpoints (`/auth/*`) | 10 requests / minute |
| All other endpoints | 60 requests / minute per user |

Returns `429 Too Many Requests` when exceeded.

---

## Request Logging

Every request logs: method, endpoint, status code, and response time.

---

## Natural Language Parsing

The `/api/profiles/search?q=` endpoint uses a rule-based parser:

| Query | Filters applied |
|---|---|
| `young males` | `gender=male`, `min_age=16`, `max_age=24` |
| `females above 30` | `gender=female`, `min_age=30` |
| `people from nigeria` | `country_id=NG` |
| `adult males from kenya` | `gender=male`, `age_group=adult`, `country_id=KE` |

Supported keywords:
- **Gender:** male, female, men, women, boy, girl
- **Age group:** child, teenager, adult, senior, elderly
- **Age range:** young, above N, below N, between N and M
- **Country:** `from [country name]`

---

## Environment Variables

```env
DATABASE_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
JWT_SECRET=
BACKEND_URL=
FRONTEND_URL=
```

---

## Getting Started

```bash
git clone https://github.com/OluchiEzeifedikwa/MESH-DATA-PERSISTENCE
cd MESH-DATA-PERSISTENCE
npm install
cp .env.example .env  # fill in your values
npx prisma migrate deploy
npx prisma generate
npm run dev
```

---

## Deployment

Deployed on Vercel. On every push to `main`, Vercel runs `prisma migrate deploy && prisma generate` then starts the server via `api/index.js`.
