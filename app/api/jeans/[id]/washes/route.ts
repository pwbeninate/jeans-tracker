import { desc, eq } from "drizzle-orm";
import { db, washLogs } from "@/db";
import { idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { ownedJean } from "@/lib/queries";
import { washSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const rows = await db
    .select()
    .from(washLogs)
    .where(eq(washLogs.jeanId, jean.id))
    .orderBy(desc(washLogs.washedOn));
  return json(rows);
});

export const POST = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const body = await parseBody(req, washSchema);
  const [created] = await db
    .insert(washLogs)
    .values({ ...body, jeanId: jean.id })
    .returning();
  return json(created, 201);
});
