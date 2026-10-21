import { desc, eq } from "drizzle-orm";
import { db, wearLogs } from "@/db";
import { idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { ownedJean } from "@/lib/queries";
import { wearSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const rows = await db
    .select()
    .from(wearLogs)
    .where(eq(wearLogs.jeanId, jean.id))
    .orderBy(desc(wearLogs.wornOn));
  return json(rows);
});

export const POST = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const body = await parseBody(req, wearSchema);
  const [created] = await db
    .insert(wearLogs)
    .values({ ...body, jeanId: jean.id })
    .returning();
  return json(created, 201);
});
