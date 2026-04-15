# Mesh Data Persistence

A REST API that accepts a name, fetches data from three external APIs (Genderize, Agify, Nationalize), aggregates and classifies the results, and stores the profile in a PostgreSQL database.

---

## Tech Stack

- **Runtime:** Node.js (>=18)
- **Framework:** Express
- **Database:** PostgreSQL via Prisma ORM
- **External APIs:** Genderize, Agify, Nationalize

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/OluchiEzeifedikwa/MESH-DATA-PERSISTENCE
cd mesh-data-persistence
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

### 4. Run database migrations

```bash
npx prisma migrate deploy
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Start the server

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

The server runs on port `3000` by default.

---

## Deploying to Vercel

This project is configured for serverless deployment on Vercel via `api/index.js`.

1. Push to GitHub and import the repo in the Vercel dashboard.
2. Set the `DATABASE_URL` environment variable in **Project Settings → Environment Variables**.
3. Deploy — Vercel will automatically run `npm run vercel-build` (`prisma migrate deploy && prisma generate`) before starting.

All requests are rewritten to `/api/index` by `vercel.json`.

---

## API Reference

### POST /api/profiles

Creates a new profile by aggregating data from Genderize, Agify, and Nationalize.

**Request Body**

```json
{
  "name": "john"
}
```

**Success Response — 201 Created**

```json
{
  "status": "success",
  "data": {
    "id": "019571a2-3c4d-7e1a-b9f0-2d8e4a6c1f05",
    "name": "john",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 123456,
    "age": 38,
    "age_group": "adult",
    "country_id": "US",
    "country_probability": 0.85,
    "created_at": "2026-04-14T10:00:00Z"
  }
}
```

**Idempotency — 200 OK**

Submitting the same name more than once does not create a new record. The existing profile is returned.

```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { ... }
}
```

---

### GET /api/profiles

Returns all stored profiles. Supports optional query parameters to filter results.

**Query Parameters**

All query parameter values are **case-insensitive** (e.g. `gender=Male` and `gender=male` are treated the same).

| Parameter    | Type   | Description                                                      |
|--------------|--------|------------------------------------------------------------------|
| `gender`     | string | Filter by gender (e.g. `male`, `female`)                        |
| `country_id` | string | Filter by country code (e.g. `US`, `NG`)                        |
| `age_group`  | string | Filter by age group (`child`, `teenager`, `adult`, `senior`)    |

**Success Response — 200 OK**

```json
{
  "status": "success",
  "count": 2,
  "data": [ { ... }, { ... } ]
}
```

---

### GET /api/profiles/:id

Returns a single profile by its UUID.

**Success Response — 200 OK**

```json
{
  "status": "success",
  "data": {
    "id": "019571a2-3c4d-7e1a-b9f0-2d8e4a6c1f05",
    "name": "john",
    ...
  }
}
```

**Not Found — 404**

```json
{
  "status": "error",
  "message": "Profile not found"
}
```

---

### DELETE /api/profiles/:id

Deletes a profile by its UUID.

**Success Response — 204 No Content**

No response body.

**Not Found — 404**

```json
{
  "status": "error",
  "message": "Profile not found"
}
```

---

## Processing Rules

- **Name normalization** — the input name is trimmed and lowercased before any processing or storage, so `"John"` and `"john"` resolve to the same profile
- **Gender** — extracted from Genderize: `gender`, `gender_probability`, `count` (renamed to `sample_size`)
- **Age** — extracted from Agify. Classified into age groups:
  - `0–12` → `child`
  - `13–19` → `teenager`
  - `20–59` → `adult`
  - `60+` → `senior`
- **Nationality** — extracted from Nationalize. The country with the highest probability is used as `country_id`
- **ID** — generated as UUID v7 (time-ordered)
- **Timestamp** — stored as UTC ISO 8601

---

## Error Responses

Most errors follow this structure:

```json
{
  "status": "error",
  "message": "<error message>"
}
```

502 errors from external API failures use a different `status` value, per spec:

```json
{
  "status": "502",
  "message": "<ExternalApi> returned an invalid response"
}
```

| Scenario | Status Code |
|---|---|
| Missing or empty name | 400 |
| Non-string name | 422 |
| Profile not found (GET/DELETE by ID) | 404 |
| External API unreachable | 502 |
| Genderize returns null gender or count 0 | 502 |
| Agify returns null age | 502 |
| Nationalize returns no country data | 502 |
| Internal server error | 500 |

---

## Database Schema

```prisma
model Profile {
  id                  String @id
  name                String @unique
  gender              String
  gender_probability  Float
  sample_size         Int
  age                 Int
  age_group           String
  country_id          String
  country_probability Float
  created_at          String

  @@map("profiles")
}
```

---

## CORS

All responses include the header:

```
Access-Control-Allow-Origin: *
```
