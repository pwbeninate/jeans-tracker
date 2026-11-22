/**
 * Off-platform backup of the database (pg_dump) and the photo Blob store.
 *
 *   npm run backup                      # reads .env.backup (production)
 *   npm run backup -- --env .env.local  # any env file with the same keys
 *
 * Writes backups/<timestamp>/{db.dump,manifest.json} and mirrors every blob
 * into backups/blobs/<pathname>. Blob pathnames carry a random suffix, so a
 * file already on disk never changes and later runs only fetch new photos.
 * Read-only against the source: pg_dump plus Blob list() and GET.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { list, type ListBlobResultBlob } from "@vercel/blob";

const TABLES = ["users", "jeans", "measurements", "wash_logs", "wear_logs", "photos", "rate_limits"];
const ROOT = path.resolve("backups");
const BLOB_DIR = path.join(ROOT, "blobs");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set in the env file`);
  return v;
}

/** pg_dump needs a direct connection; Neon's pooled host is the same name with "-pooler". */
function directUrl(raw: string): URL {
  const url = new URL(raw);
  url.hostname = url.hostname.replace("-pooler.", ".");
  return url;
}

function findPgDump(): string {
  for (const p of ["/opt/homebrew/opt/libpq/bin/pg_dump", "/usr/local/opt/libpq/bin/pg_dump"]) {
    if (existsSync(p)) return p;
  }
  return "pg_dump"; // fall back to PATH
}

/** Credentials go through PG* env vars, not argv, so they don't show up in `ps`. */
function pgDump(url: URL, outFile: string): Promise<void> {
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1),
    PGSSLMODE: url.searchParams.get("sslmode") ?? "require",
  };
  return new Promise((resolve, reject) => {
    const child = spawn(findPgDump(), ["--format=custom", "--no-owner", "--no-acl", "--file", outFile], {
      env,
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", (e: NodeJS.ErrnoException) =>
      reject(e.code === "ENOENT" ? new Error("pg_dump not found: run `brew install libpq`") : e),
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exited with ${code}`))));
  });
}

async function rowCounts(url: URL): Promise<Record<string, number>> {
  const sql = neon(url.toString());
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const rows = (await sql.query(`select count(*)::int as n from "${t}"`)) as { n: number }[];
    counts[t] = rows[0].n;
  }
  return counts;
}

async function listAllBlobs(token: string): Promise<ListBlobResultBlob[]> {
  const all: ListBlobResultBlob[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ token, cursor, limit: 1000 });
    all.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return all;
}

async function mirrorBlob(blob: ListBlobResultBlob): Promise<"skipped" | "downloaded"> {
  const dest = path.join(BLOB_DIR, blob.pathname);
  if (!dest.startsWith(BLOB_DIR + path.sep)) throw new Error(`Unsafe pathname: ${blob.pathname}`);
  const existing = await stat(dest).catch(() => null);
  if (existing?.size === blob.size) return "skipped";

  const res = await fetch(blob.url);
  if (!res.ok) throw new Error(`GET ${blob.pathname}: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length !== blob.size) throw new Error(`${blob.pathname}: got ${bytes.length} bytes, expected ${blob.size}`);

  await mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  await writeFile(tmp, bytes);
  await rename(tmp, dest);
  return "downloaded";
}

/** Runs fn over items with a small fixed concurrency. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const envFile = arg("--env") ?? ".env.backup";
  if (!existsSync(envFile)) throw new Error(`${envFile} not found (copy .env.backup.example)`);
  config({ path: envFile, override: true, quiet: true });

  const dbUrl = directUrl(required("DATABASE_URL"));
  const blobToken = required("BLOB_READ_WRITE_TOKEN");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(ROOT, stamp);
  await mkdir(runDir, { recursive: true });

  console.log(`Backing up ${dbUrl.hostname} (env: ${envFile}) → ${path.relative(process.cwd(), runDir)}`);

  console.log("Dumping database…");
  try {
    await pgDump(dbUrl, path.join(runDir, "db.dump"));
  } catch (e) {
    await rm(runDir, { recursive: true, force: true }); // don't leave a half-written run behind
    throw e;
  }
  const counts = await rowCounts(dbUrl);

  console.log("Listing blobs…");
  const blobs = await listAllBlobs(blobToken);
  const results = await pool(blobs, 4, mirrorBlob);
  const downloaded = results.filter((r) => r === "downloaded").length;

  const manifest = {
    createdAt: new Date().toISOString(),
    envFile,
    dbHost: dbUrl.hostname,
    rowCounts: counts,
    blobs: {
      count: blobs.length,
      totalBytes: blobs.reduce((n, b) => n + b.size, 0),
      downloadedThisRun: downloaded,
      dir: path.relative(runDir, BLOB_DIR),
    },
    blobIndex: blobs.map((b) => ({ pathname: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt })),
  };
  await writeFile(path.join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("Rows:", counts);
  console.log(`Blobs: ${blobs.length} total, ${downloaded} downloaded, ${blobs.length - downloaded} already present`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(`Backup failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
