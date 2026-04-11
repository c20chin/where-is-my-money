import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { savingTypes } from "./saving-types";
import { currencies } from "./currencies";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountName: varchar("account_name", { length: 255 }).notNull(),
    bankName: varchar("bank_name", { length: 255 }).notNull(),
    savingTypeId: integer("saving_type_id")
      .notNull()
      .references(() => savingTypes.id),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currencies.code),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (table) => [
    unique().on(table.userId, table.accountName, table.bankName),
  ]
);
