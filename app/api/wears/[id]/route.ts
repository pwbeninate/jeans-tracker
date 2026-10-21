import { eq } from "drizzle-orm";
import { db, wearLogs } from "@/db";
import { idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { ownedWear } from "@/lib/queries";
import { wearPatchSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  return json(await ownedWear(userId, await idParam(ctx)));
});

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedWear(userId, await idParam(ctx));
  const body = await parseBody(req, wearPatchSchema);
  const [updated] = await db
    .update(wearLogs)
    .set(body)
    .where(eq(wearLogs.id, existing.id))
    .returning();
  return json(updated);
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedWear(userId, await idParam(ctx));
  await db.delete(wearLogs).where(eq(wearLogs.id, existing.id));
  return new Response(null, { status: 204 });
});
