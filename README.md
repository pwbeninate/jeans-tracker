# Jeans Tracker

Track a denim collection: purchase info, age, tag size, measurements over time (one marked original), a dated photo timeline (one marked cover), and wash/wear logs with starting counts for used or existing pairs. Multi-user, with a REST API and web UI. The collection can be browsed as cards or as a sortable, filterable table (`/table`).

Stack: Next.js 15 (App Router) + TypeScript, Neon Postgres, Drizzle ORM, Vercel Blob (photos), Auth.js (email + password), Tailwind, SWR, Recharts.

## Local setup
```bash
npm install
cp .env.example .env.local   # set DATABASE_URL (Neon), AUTH_SECRET (openssl rand -base64 32), BLOB_READ_WRITE_TOKEN
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
| Photos | `GET/POST /api/jeans/:id/photos`, `POST /api/jeans/:id/photos/upload` (Blob client-upload token), `GET/PATCH/DELETE /api/photos/:id` |
| Export | `GET /api/export` (CSV) |

## Deploy to Vercel
1. Import the repo, then add Neon from the Marketplace (sets `DATABASE_URL`).
2. Set `AUTH_SECRET`. Signup is closed unless `ALLOW_SIGNUP=true`: set it to create your account, then remove it.
3. Storage → create a **public** Blob store and connect it to the project (sets `BLOB_READ_WRITE_TOKEN`). The Hobby plan includes 1 GB, and photos are resized to ~2000px JPEG in the browser before upload.
4. Run `npm run db:migrate` against the production database before the first deploy and after schema changes.

## Backups & restore
Production data is the Neon database plus the photo files in Vercel Blob. `/api/export` is a per-user CSV, not a backup.

- **Neon history**: Neon can restore or branch the database to any point inside its history window (the length depends on your plan). Create a branch before running prod migrations.
- **Off-platform copy**: `brew install libpq` (for `pg_dump`), copy `.env.backup.example` to `.env.backup` with the production values, then run `npm run backup`. Each run writes `backups/<timestamp>/db.dump` and `manifest.json` (row counts and a blob index), and mirrors photos into `backups/blobs/`. Only new photos are downloaded. The script only reads from the source. `--env <file>` points it at another env file, such as `.env.local` for dev.

Restore:
1. Database: `pg_restore --clean --if-exists --no-owner --no-acl -d "<direct target url>" backups/<timestamp>/db.dump`. Try it on a fresh Neon branch first.
2. Photos: re-upload each file under `backups/blobs/` with `put(pathname, file, { access: "public", addRandomSuffix: false })` so pathnames match. If the photos went into a new Blob store, its hostname differs, so update the rows: `update photos set url = replace(url, '<old host>', '<new host>');`.
