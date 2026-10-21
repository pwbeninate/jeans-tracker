import { and, eq } from "drizzle-orm";
import { db, jeans, measurements, washLogs, wearLogs } from "@/db";
import {
  idParam,
  json,
  notFound,
  parseBody,
  requireUser,
  route,
  type IdCtx,
} from "@/lib/http";
import { deltaFromOriginal, numericize, statsFor } from "@/lib/derive";
import { ownedJean } from "@/lib/queries";
import { DIMENSIONS, jeanPatchSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const [ms, wears, washes] = await Promise.all([
    db.select().from(measurements).where(eq(measurements.jeanId, jean.id)),
    db.select().from(wearLogs).where(eq(wearLogs.jeanId, jean.id)),
    db.select().from(washLogs).where(eq(washLogs.jeanId, jean.id)),
  ]);
  const sorted = [...ms].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
  const original = sorted.find((m) => m.isOriginal);
  const latest = sorted.at(-1);
  return json({
    ...numericize(jean, ["purchasePrice"]),
    ...statsFor(jean, wears.map((w) => w.wornOn), washes.map((w) => w.washedOn)),
    originalMeasurement: original ? numericize(original, DIMENSIONS) : null,
    latestMeasurement: latest ? numericize(latest, DIMENSIONS) : null,
    shrinkage: deltaFromOriginal(original, latest),
  });
});

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const id = await idParam(ctx);
  await ownedJean(userId, id);
  const body = await parseBody(req, jeanPatchSchema);
  const { purchasePrice, ...rest } = body;
  const [updated] = await db
    .update(jeans)
    .set({
      ...rest,
      ...(purchasePrice !== undefined && {
        purchasePrice: purchasePrice == null ? null : String(purchasePrice),
      }),
    })
    .where(and(eq(jeans.id, id), eq(jeans.userId, userId)))
    .returning();
  if (!updated) throw notFound();
  return json(numericize(updated, ["purchasePrice"]));
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const id = await idParam(ctx);
  const deleted = await db
    .delete(jeans)
    .where(and(eq(jeans.id, id), eq(jeans.userId, userId)))
    .returning({ id: jeans.id });
  if (!deleted.length) throw notFound();
  return new Response(null, { status: 204 });
});
