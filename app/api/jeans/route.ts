import { desc, eq, inArray } from "drizzle-orm";
import { db, jeans, photos, washLogs, wearLogs } from "@/db";
import { json, parseBody, requireUser, route } from "@/lib/http";
import { coverFor, numericize, statsFor } from "@/lib/derive";
import { jeanSchema } from "@/lib/validators";

const toDb = (v: ReturnType<typeof jeanSchema.parse>) => ({
  ...v,
  purchasePrice: v.purchasePrice == null ? null : String(v.purchasePrice),
});

export const GET = route(async (req) => {
  const userId = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const sort = url.searchParams.get("sort") ?? "created";

  let rows = await db
    .select()
    .from(jeans)
    .where(eq(jeans.userId, userId))
    .orderBy(desc(jeans.createdAt));
  if (status) rows = rows.filter((r) => r.status === status);

  const ids = rows.map((r) => r.id);
  const [wears, washes, pics] = ids.length
    ? await Promise.all([
        db.select().from(wearLogs).where(inArray(wearLogs.jeanId, ids)),
        db.select().from(washLogs).where(inArray(washLogs.jeanId, ids)),
        db.select().from(photos).where(inArray(photos.jeanId, ids)),
      ])
    : [[], [], []];

  const out = rows.map((j) => ({
    ...numericize(j, ["purchasePrice"]),
    ...statsFor(
      j,
      wears.filter((w) => w.jeanId === j.id).map((w) => w.wornOn),
      washes.filter((w) => w.jeanId === j.id).map((w) => w.washedOn),
    ),
    coverUrl: coverFor(pics.filter((p) => p.jeanId === j.id))?.url ?? null,
  }));

  const keyed: Record<string, (a: (typeof out)[number], b: (typeof out)[number]) => number> = {
    wears: (a, b) => b.totalWears - a.totalWears,
    age: (a, b) => (b.age?.days ?? -1) - (a.age?.days ?? -1),
    name: (a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`),
    lastWorn: (a, b) => (b.lastWorn ?? "").localeCompare(a.lastWorn ?? ""),
  };
  if (keyed[sort]) out.sort(keyed[sort]);
  return json(out);
});

export const POST = route(async (req) => {
  const userId = await requireUser();
  const body = await parseBody(req, jeanSchema);
  const [created] = await db
    .insert(jeans)
    .values({ ...toDb(body), userId })
    .returning();
  return json(numericize(created, ["purchasePrice"]), 201);
});
