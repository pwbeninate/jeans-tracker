import { DIMENSIONS, type Dimension } from "@/lib/validators";

const DAY = 86_400_000;
const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function ageOf(purchaseDate: string | null, today = todayIso()) {
  if (!purchaseDate) return null;
  const days = Math.max(0, Math.round((toUtc(today) - toUtc(purchaseDate)) / DAY));
  const [py, pm, pd] = purchaseDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let months = (ty - py) * 12 + (tm - pm) - (td < pd ? 1 : 0);
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const m = months % 12;
  const label =
    years > 0 ? `${years}y ${m}m` : months > 0 ? `${months}m` : `${days}d`;
  return { days, label };
}

type JeanLike = {
  purchasePrice: string | null;
  purchaseDate: string | null;
  initialWashCount: number;
  initialWearCount: number;
};

export function statsFor(
  jean: JeanLike,
  wearDates: string[],
  washDates: string[],
  today = todayIso(),
) {
  const lastWorn = wearDates.reduce<string | null>(
    (a, d) => (!a || d > a ? d : a),
    null,
  );
  const lastWashed = washDates.reduce<string | null>(
    (a, d) => (!a || d > a ? d : a),
    null,
  );
  const totalWears = jean.initialWearCount + wearDates.length;
  const totalWashes = jean.initialWashCount + washDates.length;
  const wearsSinceWash = lastWashed
    ? wearDates.filter((d) => d > lastWashed).length
    : totalWears;
  const price = jean.purchasePrice == null ? null : Number(jean.purchasePrice);
  return {
    age: ageOf(jean.purchaseDate, today),
    totalWears,
    totalWashes,
    wearsSinceWash,
    lastWorn,
    lastWashed,
    costPerWear: price != null && totalWears > 0 ? price / totalWears : null,
  };
}

type MeasurementLike = { [K in Dimension]: string | number | null } & {
  measuredOn: string;
  isOriginal: boolean;
};

export type Deltas = Record<Dimension, number | null>;

/** latest minus original, per dimension; null when either side is missing. */
export function deltaFromOriginal(
  original: MeasurementLike | undefined,
  latest: MeasurementLike | undefined,
): Deltas | null {
  if (!original || !latest || original === latest) return null;
  const out = {} as Deltas;
  for (const d of DIMENSIONS) {
    const a = original[d];
    const b = latest[d];
    out[d] =
      a == null || b == null ? null : Math.round((Number(b) - Number(a)) * 100) / 100;
  }
  return out;
}

type PhotoLike = { isCover: boolean; takenOn: string; createdAt: Date };

/** The chosen cover, else the most recent photo, else null. */
export function coverFor<P extends PhotoLike>(photos: P[]): P | null {
  return (
    photos.find((p) => p.isCover) ??
    photos.reduce<P | null>(
      (a, p) =>
        !a || p.takenOn > a.takenOn || (p.takenOn === a.takenOn && p.createdAt > a.createdAt)
          ? p
          : a,
      null,
    )
  );
}

export function numericize<T extends Record<string, unknown>>(
  row: T,
  keys: readonly string[],
): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of keys) if (out[k] != null) out[k] = Number(out[k]);
  return out as T;
}
