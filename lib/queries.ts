import { and, eq } from "drizzle-orm";
import { db, jeans, measurements, photos, washLogs, wearLogs } from "@/db";
import { notFound } from "@/lib/http";

export async function ownedJean(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(jeans)
    .where(and(eq(jeans.id, id), eq(jeans.userId, userId)));
  if (!row) throw notFound();
  return row;
}

/** Child-row lookups join through jeans so ownership is always enforced. */
export async function ownedMeasurement(userId: string, id: string) {
  const [row] = await db
    .select({ m: measurements })
    .from(measurements)
    .innerJoin(jeans, eq(jeans.id, measurements.jeanId))
    .where(and(eq(measurements.id, id), eq(jeans.userId, userId)));
  if (!row) throw notFound();
  return row.m;
}

export async function ownedWash(userId: string, id: string) {
  const [row] = await db
    .select({ w: washLogs })
    .from(washLogs)
    .innerJoin(jeans, eq(jeans.id, washLogs.jeanId))
    .where(and(eq(washLogs.id, id), eq(jeans.userId, userId)));
  if (!row) throw notFound();
  return row.w;
}

export async function ownedWear(userId: string, id: string) {
  const [row] = await db
    .select({ w: wearLogs })
    .from(wearLogs)
    .innerJoin(jeans, eq(jeans.id, wearLogs.jeanId))
    .where(and(eq(wearLogs.id, id), eq(jeans.userId, userId)));
  if (!row) throw notFound();
  return row.w;
}

export async function ownedPhoto(userId: string, id: string) {
  const [row] = await db
    .select({ p: photos })
    .from(photos)
    .innerJoin(jeans, eq(jeans.id, photos.jeanId))
    .where(and(eq(photos.id, id), eq(jeans.userId, userId)));
  if (!row) throw notFound();
  return row.p;
}
