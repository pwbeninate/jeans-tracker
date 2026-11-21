import { head } from "@vercel/blob";
import { count, desc, eq } from "drizzle-orm";
import { db, photos } from "@/db";
import { isOwnedBlob, MAX_PHOTOS_PER_JEAN } from "@/lib/blob";
import { HttpError, idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { writeLimit } from "@/lib/rate-limit";
import { ownedJean } from "@/lib/queries";
import { photoSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const rows = await db
    .select()
    .from(photos)
    .where(eq(photos.jeanId, jean.id))
    .orderBy(desc(photos.takenOn), desc(photos.createdAt));
  return json(rows);
});

export const POST = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  await writeLimit(userId);
  const jean = await ownedJean(userId, await idParam(ctx));
  const body = await parseBody(req, photoSchema);
  if (!isOwnedBlob(jean.id, body.url, body.pathname)) {
    throw new HttpError(400, "Photo must be uploaded to this pair");
  }
  // head() uses our token, so it only finds blobs that are in this app's store.
  const stored = await head(body.url).catch(() => null);
  if (stored?.pathname !== body.pathname) {
    throw new HttpError(400, "Photo must be uploaded to this pair");
  }
  const [{ n }] = await db
    .select({ n: count() })
    .from(photos)
    .where(eq(photos.jeanId, jean.id));
  if (n >= MAX_PHOTOS_PER_JEAN) throw new HttpError(400, "Photo limit reached for this pair");
  const [created] = await db
    .insert(photos)
    .values({ ...body, url: stored.url, jeanId: jean.id, isCover: n === 0 })
    .returning();
  return json(created, 201);
});
