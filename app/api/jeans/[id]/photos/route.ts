import { desc, eq } from "drizzle-orm";
import { db, photos } from "@/db";
import { isOwnedBlob } from "@/lib/blob";
import { HttpError, idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
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
  const jean = await ownedJean(userId, await idParam(ctx));
  const body = await parseBody(req, photoSchema);
  if (!isOwnedBlob(jean.id, body.url, body.pathname)) {
    throw new HttpError(400, "Photo must be uploaded to this pair");
  }
  const [existing] = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.jeanId, jean.id))
    .limit(1);
  const [created] = await db
    .insert(photos)
    .values({ ...body, jeanId: jean.id, isCover: !existing })
    .returning();
  return json(created, 201);
});
