import {
  pgTable,
  char,
  varchar,
  smallint,
} from "drizzle-orm/pg-core";

export const currencies = pgTable("currencies", {
  code: char("code", { length: 3 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  decimalPlaces: smallint("decimal_places").notNull().default(2),
});
