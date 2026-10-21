import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  ...timestamps,
});

export const jeans = pgTable(
  "jeans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brand: text("brand").notNull(),
    name: text("name").notNull(),
    fit: text("fit"),
    color: text("color"),
    tagSize: text("tag_size").notNull(),
    purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
    purchaseDate: date("purchase_date", { mode: "string" }),
    purchasedUsed: boolean("purchased_used").notNull().default(false),
    initialWashCount: integer("initial_wash_count").notNull().default(0),
    initialWearCount: integer("initial_wear_count").notNull().default(0),
    status: text("status", { enum: ["active", "retired", "sold"] })
      .notNull()
      .default("active"),
    retiredDate: date("retired_date", { mode: "string" }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("jeans_user_idx").on(t.userId)],
);

const dim = (name: string) => numeric(name, { precision: 5, scale: 2 });

export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jeanId: uuid("jean_id")
      .notNull()
      .references(() => jeans.id, { onDelete: "cascade" }),
    measuredOn: date("measured_on", { mode: "string" }).notNull(),
    isOriginal: boolean("is_original").notNull().default(false),
    waist: dim("waist"),
    rise: dim("rise"),
    inseam: dim("inseam"),
    thigh: dim("thigh"),
    knee: dim("knee"),
    legOpening: dim("leg_opening"),
    hip: dim("hip"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("measurements_jean_idx").on(t.jeanId),
    uniqueIndex("measurements_one_original")
      .on(t.jeanId)
      .where(sql`${t.isOriginal}`),
  ],
);

export const washLogs = pgTable(
  "wash_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jeanId: uuid("jean_id")
      .notNull()
      .references(() => jeans.id, { onDelete: "cascade" }),
    washedOn: date("washed_on", { mode: "string" }).notNull(),
    method: text("method"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("wash_logs_jean_idx").on(t.jeanId)],
);

export const wearLogs = pgTable(
  "wear_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jeanId: uuid("jean_id")
      .notNull()
      .references(() => jeans.id, { onDelete: "cascade" }),
    wornOn: date("worn_on", { mode: "string" }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("wear_logs_jean_idx").on(t.jeanId)],
);
