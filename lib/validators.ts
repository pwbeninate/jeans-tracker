import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const optText = z.string().trim().max(2000).nullish();
const dim = z.number().min(0).max(100).nullish();

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

// bcrypt only reads the first 72 bytes, so anything longer would be silently cut.
const newPassword = z
  .string()
  .min(8)
  .refine((p) => new TextEncoder().encode(p).length <= 72, "Use at most 72 bytes");

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword,
});

export const signupSchema = credentialsSchema.extend({
  password: newPassword,
  name: z.string().trim().max(100).optional(),
});

/**
 * PATCH schemas are built from the default-free fields: a default on a partial
 * schema would fill in every omitted field and overwrite what is stored.
 */
const patchOf = <T extends z.ZodObject>(fields: T) =>
  fields.partial().refine((v) => Object.keys(v).length > 0, "No fields to update");

const jeanFields = z.object({
  brand: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  fit: optText,
  color: optText,
  tagSize: z.string().trim().min(1).max(20),
  purchasePrice: z.number().min(0).max(100000).nullish(),
  purchaseDate: isoDate.nullish(),
  purchasedUsed: z.boolean(),
  initialWashCount: z.number().int().min(0),
  initialWearCount: z.number().int().min(0),
  status: z.enum(["active", "retired", "sold"]),
  retiredDate: isoDate.nullish(),
  notes: optText,
});
export const jeanSchema = jeanFields.extend({
  purchasedUsed: jeanFields.shape.purchasedUsed.default(false),
  initialWashCount: jeanFields.shape.initialWashCount.default(0),
  initialWearCount: jeanFields.shape.initialWearCount.default(0),
  status: jeanFields.shape.status.default("active"),
});
export const jeanPatchSchema = patchOf(jeanFields);

const measurementFields = z.object({
  measuredOn: isoDate,
  isOriginal: z.boolean(),
  waist: dim,
  rise: dim,
  inseam: dim,
  thigh: dim,
  knee: dim,
  legOpening: dim,
  hip: dim,
  notes: optText,
});
export const measurementSchema = measurementFields.extend({
  isOriginal: measurementFields.shape.isOriginal.default(false),
});
export const measurementPatchSchema = patchOf(measurementFields);

export const washSchema = z.object({
  washedOn: isoDate,
  method: z.string().trim().max(100).nullish(),
  notes: optText,
});
export const washPatchSchema = patchOf(washSchema);

export const wearSchema = z.object({
  wornOn: isoDate,
  notes: optText,
});
export const wearPatchSchema = patchOf(wearSchema);

const px = z.number().int().min(1).max(20000).nullish();
export const photoSchema = z.object({
  url: z.string().url().max(1000),
  pathname: z.string().min(1).max(500),
  takenOn: isoDate,
  caption: optText,
  width: px,
  height: px,
});
export const photoPatchSchema = z.object({
  takenOn: isoDate.optional(),
  caption: optText,
  isCover: z.literal(true).optional(),
});

export const DIMENSIONS = [
  "waist",
  "rise",
  "inseam",
  "thigh",
  "knee",
  "legOpening",
  "hip",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];
