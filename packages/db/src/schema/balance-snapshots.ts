import {
  pgTable,
  uuid,
  smallint,
  numeric,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";

export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    year: smallint("year").notNull(),
    month: smallint("month").notNull(),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.accountId, table.year, table.month),
  ]
);
