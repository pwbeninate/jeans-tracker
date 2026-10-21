import { del } from "@vercel/blob";
import { and, eq, ne } from "drizzle-orm";
import { db, photos } from "@/db";
import { idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { ownedPhoto } from "@/lib/queries";
import { photoPatchSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  return json(await ownedPhoto(userId, await idParam(ctx)));
});

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedPhoto(userId, await idParam(ctx));
  const body = await parseBody(req, photoPatchSchema);
  const update = db
    .update(photos)
    .set(body)
    .where(eq(photos.id, existing.id))
    .returning();

  const [, updated] = body.isCover
    ? await db.batch([
        db
          .update(photos)
          .set({ isCover: false })
          .where(
            and(
              eq(photos.jeanId, existing.jeanId),
              eq(photos.isCover, true),
              ne(photos.id, existing.id),
            ),
          ),
        update,
      ])
    : [null, await update];
  return json(updated[0]);
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedPhoto(userId, await idParam(ctx));
  await db.delete(photos).where(eq(photos.id, existing.id));
  await del(existing.url);
  return new Response(null, { status: 204 });
});
