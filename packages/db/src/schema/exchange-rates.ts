import {
  pgTable,
  serial,
  char,
  numeric,
  date,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies";

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    baseCurrency: char("base_currency", { length: 3 })
      .notNull()
      .references(() => currencies.code),
    targetCurrency: char("target_currency", { length: 3 })
      .notNull()
      .references(() => currencies.code),
    rate: numeric("rate", { precision: 19, scale: 10 }).notNull(),
    date: date("date").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.baseCurrency, table.targetCurrency, table.date),
  ]
);
