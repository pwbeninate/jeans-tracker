import { eq, inArray } from "drizzle-orm";
import { db, jeans, measurements, washLogs, wearLogs } from "@/db";
import { requireUser, route } from "@/lib/http";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Prefix formula-triggering characters so spreadsheets don't execute them.
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = (rows: Record<string, unknown>[]) =>
  rows.length
    ? [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).map(esc).join(","))].join("\n")
    : "";

export const GET = route(async () => {
  const userId = await requireUser();
  const js = await db.select().from(jeans).where(eq(jeans.userId, userId));
  const ids = js.map((j) => j.id);
  const [ms, ws, wr] = ids.length
    ? await Promise.all([
        db.select().from(measurements).where(inArray(measurements.jeanId, ids)),
        db.select().from(washLogs).where(inArray(washLogs.jeanId, ids)),
        db.select().from(wearLogs).where(inArray(wearLogs.jeanId, ids)),
      ])
    : [[], [], []];
  const body = [
    "# jeans", csv(js), "", "# measurements", csv(ms), "", "# washes", csv(ws), "", "# wears", csv(wr),
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jeans-export.csv"',
    },
  });
});
