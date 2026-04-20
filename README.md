# Mesh Data Persistence

A REST API that accepts a name, fetches data from three external APIs (Genderize, Agify, Nationalize), aggregates and classifies the results, and stores the profile in a PostgreSQL database. Stage 2 adds advanced filtering, sorting, pagination, and a natural language search endpoint.

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
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

### 4. Run database migrations

```bash
npx prisma migrate deploy
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Seed the database

Place the seed file at `data/profiles.json`, then run:

```bash
npm run seed
```

Re-running the seed will skip duplicate records automatically.

### 7. Start the server

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
{ "name": "john" }
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
    "age": 38,
    "age_group": "adult",
    "country_id": "US",
    "country_name": "United States",
    "country_probability": 0.85,
    "created_at": "2026-04-14T10:00:00Z"
  }
}
```

**Idempotency — 200 OK**

Submitting the same name more than once returns the existing profile.

```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { ... }
}
```

---

### GET /api/profiles

Returns profiles with filtering, sorting, and pagination.

**Query Parameters**

All filter values are case-insensitive.

| Parameter | Type | Description |
|---|---|---|
| `gender` | string | `male` or `female` |
| `age_group` | string | `child`, `teenager`, `adult`, `senior` |
| `country_id` | string | ISO country code e.g. `NG`, `US` |
| `min_age` | number | Minimum age (inclusive) |
| `max_age` | number | Maximum age (inclusive) |
| `min_gender_probability` | number | Minimum gender probability (0–1) |
| `min_country_probability` | number | Minimum country probability (0–1) |
| `sort_by` | string | `age`, `created_at`, or `gender_probability` |
| `order` | string | `asc` or `desc` (default: `asc`) |
| `page` | number | Page number (default: `1`) |
| `limit` | number | Results per page (default: `10`, max: `50`) |

**Success Response — 200 OK**

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": [ { ... } ]
}
```

---

### GET /api/profiles/search

Natural language query endpoint. Parses a plain English query string into filters.

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Plain English query |
| `page` | number | Page number (default: `1`) |
| `limit` | number | Results per page (default: `10`, max: `50`) |

**Example**

```
GET /api/profiles/search?q=young males from nigeria
```

**Success Response — 200 OK** — same structure as GET /api/profiles.

**Uninterpretable query — 400**

```json
{ "status": "error", "message": "Unable to interpret query" }
```

---

### GET /api/profiles/:id

Returns a single profile by its UUID.

**Success Response — 200 OK** / **404 Not Found**

---

### DELETE /api/profiles/:id

Deletes a profile by UUID. Returns **204 No Content** on success, **404** if not found.

---

## Natural Language Parsing

### How it works

The `/api/profiles/search` endpoint uses a rule-based parser — no AI or LLMs. The query string is lowercased and matched against a set of regex patterns to extract filters.

### Supported keywords and mappings

**Gender**

| Keyword | Maps to |
|---|---|
| male, males, men, man, boy, boys | `gender=male` |
| female, females, women, woman, girl, girls | `gender=female` |
| both genders mentioned | no gender filter applied |

**Age groups**

| Keyword | Maps to |
|---|---|
| child, children, kids | `age_group=child` |
| teenager, teenagers, teen, teens | `age_group=teenager` |
| adult, adults | `age_group=adult` |
| senior, seniors, elderly | `age_group=senior` |

**Age ranges**

| Pattern | Maps to |
|---|---|
| young | `min_age=16`, `max_age=24` (parsing only, not a stored group) |
| above N / over N / older than N | `min_age=N` |
| below N / under N / younger than N | `max_age=N` |
| between N and M | `min_age=N`, `max_age=M` |
| aged N / age N | `min_age=N`, `max_age=N` |

**Country**

| Pattern | Maps to |
|---|---|
| from [country name] | `country_id=[ISO code]` |

Examples: `from nigeria` → `NG`, `from kenya` → `KE`, `from angola` → `AO`

### Example query mappings

| Query | Filters applied |
|---|---|
| `young males` | `gender=male`, `min_age=16`, `max_age=24` |
| `females above 30` | `gender=female`, `min_age=30` |
| `people from angola` | `country_id=AO` |
| `adult males from kenya` | `gender=male`, `age_group=adult`, `country_id=KE` |
| `male and female teenagers above 17` | `age_group=teenager`, `min_age=17` |

### Limitations

- **Country matching is exact name only** — partial names, adjectives, or demonyms are not supported (e.g. `"Nigerian"` or `"Nigerians"` will not match — use `"from nigeria"`)
- **No synonym resolution** — `"elderly"` maps to `senior` but `"old people"` does not
- **"young" overrides age range filters** — if `young` appears with `above N`, the `above N` takes precedence for `min_age`
- **Multi-country queries not supported** — `"from nigeria or ghana"` will not parse correctly
- **Spelling errors not handled** — `"malle"` or `"femal"` will not match
- **Queries with no recognisable keyword return 400** — `"show me everyone"` cannot be interpreted

---

## Processing Rules

- **Name normalization** — trimmed and lowercased before storage; `"John"` and `"john"` are the same profile
- **Gender** — from Genderize: `gender`, `gender_probability`
- **Age** — from Agify, classified into age groups: `0–12` → `child`, `13–19` → `teenager`, `20–59` → `adult`, `60+` → `senior`
- **Nationality** — from Nationalize, highest-probability country used as `country_id`; `country_name` resolved from ISO code
- **ID** — UUID v7 (time-ordered)
- **Timestamp** — auto-generated by database, returned as UTC ISO 8601

---

## Error Responses

Most errors:
```json
{ "status": "error", "message": "<error message>" }
```

502 errors from external API failures:
```json
{ "status": "502", "message": "<ExternalApi> returned an invalid response" }
```

| Scenario | Status Code |
|---|---|
| Missing or empty name | 400 |
| Invalid query parameters | 400 |
| Unable to interpret NL query | 400 |
| Non-string name | 422 |
| Profile not found | 404 |
| External API unreachable | 502 |
| Genderize returns null gender or count 0 | 502 |
| Agify returns null age | 502 |
| Nationalize returns no country data | 502 |
| Internal server error | 500 |

---

## Database Schema

```prisma
model Profile {
  id                  String   @id
  name                String   @unique
  gender              String
  gender_probability  Float
  age                 Int
  age_group           String
  country_id          String
  country_name        String
  country_probability Float
  created_at          DateTime @default(now())

  @@map("profiles")
}
```

---

## CORS

All responses include the header:

```
Access-Control-Allow-Origin: *
```
