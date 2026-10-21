# Jeans Tracker

Track a denim collection: purchase info, age, tag size, measurements over time (one marked original), and wash/wear logs with starting counts for used or existing pairs. Multi-user, with a REST API and web UI.

Stack: Next.js 15 (App Router) + TypeScript, Neon Postgres, Drizzle ORM, Auth.js (email + password), Tailwind, SWR, Recharts.

## Local setup
```bash
npm install
cp .env.example .env.local   # set DATABASE_URL (Neon) and AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate           # apply drizzle/ migrations
npm run dev
```

## Scripts
`npm test` (unit tests), `npm run db:generate` (after schema changes), `npm run db:migrate`, `npm run build`.

## API
All routes need a session cookie and return JSON; errors are `{ error, details? }`. Other users' rows return 404.

| Resource | Routes |
|---|---|
| Signup | `POST /api/auth/signup` |
| Jeans | `GET/POST /api/jeans` (`?status=&sort=`), `GET/PATCH/DELETE /api/jeans/:id` |
| Measurements | `GET/POST /api/jeans/:id/measurements`, `GET/PATCH/DELETE /api/measurements/:id` |
| Washes | `GET/POST /api/jeans/:id/washes`, `GET/PATCH/DELETE /api/washes/:id` |
| Wears | `GET/POST /api/jeans/:id/wears`, `GET/PATCH/DELETE /api/wears/:id` |
| Export | `GET /api/export` (CSV) |

## Deploy to Vercel
1. Import the repo, then add Neon from the Marketplace (sets `DATABASE_URL`).
2. Set `AUTH_SECRET`.
3. Run `npm run db:migrate` against the production database before the first deploy and after schema changes.
