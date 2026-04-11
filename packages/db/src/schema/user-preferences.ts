import { pgTable, uuid, char, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { currencies } from "./currencies";

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayCurrency: char("display_currency", { length: 3 })
    .notNull()
    .default("USD")
    .references(() => currencies.code),
  language: varchar("language", { length: 10 })
    .notNull()
    .default("en-US"),
});
