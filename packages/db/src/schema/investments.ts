import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";

export const investments = pgTable("investments", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  targetName: varchar("target_name", { length: 255 }).notNull(), // Investment target name
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(), // Percentage allocation (0-100)
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
