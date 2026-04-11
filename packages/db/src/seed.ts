import { config } from "dotenv";
config({ path: "../../apps/web/.env.local" });
config({ path: "../../.env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { currencies } from "./schema/currencies";
import { savingTypes } from "./schema/saving-types";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log("Seeding currencies...");
  await db
    .insert(currencies)
    .values([
      { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
      { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
      { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2 },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", decimalPlaces: 0 },
      { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimalPlaces: 2 },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimalPlaces: 2 },
      { code: "AUD", name: "Australian Dollar", symbol: "A$", decimalPlaces: 2 },
      { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimalPlaces: 2 },
      { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimalPlaces: 2 },
      { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimalPlaces: 2 },
      { code: "SEK", name: "Swedish Krona", symbol: "kr", decimalPlaces: 2 },
      { code: "NOK", name: "Norwegian Krone", symbol: "kr", decimalPlaces: 2 },
      { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimalPlaces: 2 },
      { code: "KRW", name: "South Korean Won", symbol: "₩", decimalPlaces: 0 },
      { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPlaces: 2 },
      { code: "BRL", name: "Brazilian Real", symbol: "R$", decimalPlaces: 2 },
      { code: "MXN", name: "Mexican Peso", symbol: "$", decimalPlaces: 2 },
      { code: "PLN", name: "Polish Zloty", symbol: "zł", decimalPlaces: 2 },
      { code: "THB", name: "Thai Baht", symbol: "฿", decimalPlaces: 2 },
      { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", decimalPlaces: 2 },
    ])
    .onConflictDoNothing();

  console.log("Seeding saving types...");
  await db
    .insert(savingTypes)
    .values([
      { name: "cash", label: "Cash" },
      { name: "checking", label: "Checking" },
      { name: "savings", label: "Savings" },
      { name: "investments", label: "Investments" },
      { name: "retirement", label: "Retirement" },
      { name: "crypto", label: "Crypto" },
      { name: "other", label: "Other" },
    ])
    .onConflictDoNothing();

  console.log("Seed complete!");
}

seed().catch(console.error);
