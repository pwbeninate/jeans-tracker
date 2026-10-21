import { and, asc, eq } from "drizzle-orm";
import { db, measurements } from "@/db";
import { idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { numericize } from "@/lib/derive";
import { ownedJean } from "@/lib/queries";
import { DIMENSIONS, measurementSchema } from "@/lib/validators";

const toDb = <T extends Record<string, unknown>>(v: T) =>
  Object.fromEntries(
    Object.entries(v).map(([k, val]) => [
      k,
      (DIMENSIONS as readonly string[]).includes(k) && val != null ? String(val) : val,
    ]),
  );

export const GET = route<IdCtx>(async (_req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const rows = await db
    .select()
    .from(measurements)
    .where(eq(measurements.jeanId, jean.id))
    .orderBy(asc(measurements.measuredOn));
  return json(rows.map((r) => numericize(r, DIMENSIONS)));
});

export const POST = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  const body = await parseBody(req, measurementSchema);
  const values = { ...toDb(body), jeanId: jean.id } as typeof measurements.$inferInsert;

  // The one-original invariant is enforced atomically: batch runs in a transaction.
  const [, inserted] = body.isOriginal
    ? await db.batch([
        db
          .update(measurements)
          .set({ isOriginal: false })
          .where(and(eq(measurements.jeanId, jean.id), eq(measurements.isOriginal, true))),
        db.insert(measurements).values(values).returning(),
      ])
    : [null, await db.insert(measurements).values(values).returning()];
  return json(numericize(inserted[0], DIMENSIONS), 201);
});
