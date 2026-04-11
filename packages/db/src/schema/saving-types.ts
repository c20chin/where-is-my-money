import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const savingTypes = pgTable("saving_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
});
