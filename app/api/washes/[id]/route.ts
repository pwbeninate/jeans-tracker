import { eq } from "drizzle-orm";
import { db, washLogs } from "@/db";
import { idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { ownedWash } from "@/lib/queries";
import { washPatchSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  return json(await ownedWash(userId, await idParam(ctx)));
});

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedWash(userId, await idParam(ctx));
  const body = await parseBody(req, washPatchSchema);
  const [updated] = await db
    .update(washLogs)
    .set(body)
    .where(eq(washLogs.id, existing.id))
    .returning();
  return json(updated);
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedWash(userId, await idParam(ctx));
  await db.delete(washLogs).where(eq(washLogs.id, existing.id));
  return new Response(null, { status: 204 });
});
