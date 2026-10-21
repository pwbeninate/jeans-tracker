import { and, eq, ne } from "drizzle-orm";
import { db, measurements } from "@/db";
import { idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { numericize } from "@/lib/derive";
import { ownedMeasurement } from "@/lib/queries";
import { DIMENSIONS, measurementPatchSchema } from "@/lib/validators";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const m = await ownedMeasurement(userId, await idParam(ctx));
  return json(numericize(m, DIMENSIONS));
});

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedMeasurement(userId, await idParam(ctx));
  const body = await parseBody(req, measurementPatchSchema);
  const values = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [
      k,
      (DIMENSIONS as readonly string[]).includes(k) && v != null ? String(v) : v,
    ]),
  ) as Partial<typeof measurements.$inferInsert>;
  const update = db
    .update(measurements)
    .set(values)
    .where(eq(measurements.id, existing.id))
    .returning();

  const [, updated] = body.isOriginal
    ? await db.batch([
        db
          .update(measurements)
          .set({ isOriginal: false })
          .where(
            and(
              eq(measurements.jeanId, existing.jeanId),
              eq(measurements.isOriginal, true),
              ne(measurements.id, existing.id),
            ),
          ),
        update,
      ])
    : [null, await update];
  return json(numericize(updated[0], DIMENSIONS));
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const existing = await ownedMeasurement(userId, await idParam(ctx));
  await db.delete(measurements).where(eq(measurements.id, existing.id));
  return new Response(null, { status: 204 });
});
