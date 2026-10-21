import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const optText = z.string().trim().max(2000).nullish();
const dim = z.number().min(0).max(100).nullish();

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const signupSchema = credentialsSchema.extend({
  name: z.string().trim().max(100).optional(),
});

export const jeanSchema = z.object({
  brand: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  fit: optText,
  color: optText,
  tagSize: z.string().trim().min(1).max(20),
  purchasePrice: z.number().min(0).max(100000).nullish(),
  purchaseDate: isoDate.nullish(),
  purchasedUsed: z.boolean().default(false),
  initialWashCount: z.number().int().min(0).default(0),
  initialWearCount: z.number().int().min(0).default(0),
  status: z.enum(["active", "retired", "sold"]).default("active"),
  retiredDate: isoDate.nullish(),
  notes: optText,
});
export const jeanPatchSchema = jeanSchema.partial();

export const measurementSchema = z.object({
  measuredOn: isoDate,
  isOriginal: z.boolean().default(false),
  waist: dim,
  rise: dim,
  inseam: dim,
  thigh: dim,
  knee: dim,
  legOpening: dim,
  hip: dim,
  notes: optText,
});
export const measurementPatchSchema = measurementSchema.partial();

export const washSchema = z.object({
  washedOn: isoDate,
  method: z.string().trim().max(100).nullish(),
  notes: optText,
});
export const washPatchSchema = washSchema.partial();

export const wearSchema = z.object({
  wornOn: isoDate,
  notes: optText,
});
export const wearPatchSchema = wearSchema.partial();

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
