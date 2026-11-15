import { lt, sql } from "drizzle-orm";
import { db, rateLimits } from "@/db";
import { HttpError } from "@/lib/http";

/**
 * Fixed-window counter kept in Postgres so it holds across serverless instances.
 * Counts this call and returns false once `key` is over `limit` for the window.
 */
export async function hit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const expired = sql`${rateLimits.windowStart} < now() - ${windowSec}::int * interval '1 second'`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  // Occasionally sweep rows whose window is long over so the table stays small.
  if (Math.random() < 0.01) {
    await db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, sql`now() - interval '1 day'`));
  }
  return row.count <= limit;
}

export async function rateLimit(key: string, limit: number, windowSec: number) {
  if (!(await hit(key, limit, windowSec))) {
    throw new HttpError(429, "Too many requests. Try again later.");
  }
}

/** Vercel sets x-forwarded-for; the first entry is the client. */
export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
