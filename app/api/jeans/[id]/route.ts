import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { db, jeans, measurements, photos, washLogs, wearLogs } from "@/db";
import {
  idParam,
  json,
  notFound,
  parseBody,
  requireUser,
  route,
  type IdCtx,
} from "@/lib/http";
import { coverFor, deltaFromOriginal, numericize, statsFor } from "@/lib/derive";
import { ownedJean } from "@/lib/queries";
import { DIMENSIONS, jeanPatchSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const [ms, wears, washes, pics] = await Promise.all([
    db.select().from(measurements).where(eq(measurements.jeanId, jean.id)),
    db.select().from(wearLogs).where(eq(wearLogs.jeanId, jean.id)),
    db.select().from(washLogs).where(eq(washLogs.jeanId, jean.id)),
    db.select().from(photos).where(eq(photos.jeanId, jean.id)),
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
    coverUrl: coverFor(pics)?.url ?? null,
    photoCount: pics.length,
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
  await ownedJean(userId, id);
  const urls = (
    await db.select({ url: photos.url }).from(photos).where(eq(photos.jeanId, id))
  ).map((p) => p.url);
  const deleted = await db
    .delete(jeans)
    .where(and(eq(jeans.id, id), eq(jeans.userId, userId)))
    .returning({ id: jeans.id });
  if (!deleted.length) throw notFound();
  // The FK cascade drops photo rows; the files in Blob have to go separately.
  if (urls.length) await del(urls);
  return new Response(null, { status: 204 });
});
