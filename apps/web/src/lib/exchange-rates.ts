import "server-only";
import { db } from "./db";
import { exchangeRates } from "@wimm/db/schema";
import { and, eq, lte, desc } from "drizzle-orm";

const FRANKFURTER_API = "https://api.frankfurter.dev";

type FrankfurterResponse = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

export async function syncExchangeRates(date?: string): Promise<number> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const url = `${FRANKFURTER_API}/${targetDate}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
  }

  const data: FrankfurterResponse = await response.json();

  const values = Object.entries(data.rates).map(([currency, rate]) => ({
    baseCurrency: data.base,
    targetCurrency: currency,
    rate: rate.toFixed(10),
    date: data.date,
  }));

  if (values.length === 0) return 0;

  await db
    .insert(exchangeRates)
    .values(values)
    .onConflictDoNothing();

  return values.length;
}

export async function convertAmount(
  amount: string,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<string> {
  if (fromCurrency === toCurrency) return amount;

  // Ensure rates exist in the DB; auto-sync if none are available at all
  await ensureRatesAvailable(date);

  // Use lte + desc so we find the most recent available rate on or before the requested date
  const [rate] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, fromCurrency),
        eq(exchangeRates.targetCurrency, toCurrency),
        lte(exchangeRates.date, date)
      )
    )
    .orderBy(desc(exchangeRates.date))
    .limit(1);

  if (rate) {
    return (parseFloat(amount) * parseFloat(rate.rate)).toFixed(4);
  }

  // Try reverse rate
  const [reverseRate] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, toCurrency),
        eq(exchangeRates.targetCurrency, fromCurrency),
        lte(exchangeRates.date, date)
      )
    )
    .orderBy(desc(exchangeRates.date))
    .limit(1);

  if (reverseRate) {
    return (parseFloat(amount) / parseFloat(reverseRate.rate)).toFixed(4);
  }

  // Try via EUR (frankfurter uses EUR as base)
  return await convertViaEur(amount, fromCurrency, toCurrency, date);
}

/**
 * Ensures exchange rates are available in the database.
 * If no rates exist at all, auto-syncs for the given date.
 * Rates from Frankfurter are stored with the actual date returned by the API,
 * which may differ from the requested date (e.g. weekends/holidays map to
 * the nearest prior business day).
 */
async function ensureRatesAvailable(date: string): Promise<void> {
  const [existing] = await db
    .select({ id: exchangeRates.id })
    .from(exchangeRates)
    .limit(1);

  if (!existing) {
    try {
      await syncExchangeRates(date);
    } catch (err) {
      console.error("Failed to auto-sync exchange rates:", err);
    }
  }
}

async function convertViaEur(
  amount: string,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<string> {
  const [fromRate] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, "EUR"),
        eq(exchangeRates.targetCurrency, fromCurrency),
        lte(exchangeRates.date, date)
      )
    )
    .orderBy(desc(exchangeRates.date))
    .limit(1);

  const [toRate] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, "EUR"),
        eq(exchangeRates.targetCurrency, toCurrency),
        lte(exchangeRates.date, date)
      )
    )
    .orderBy(desc(exchangeRates.date))
    .limit(1);

  if (fromRate && toRate) {
    const amountInEur = parseFloat(amount) / parseFloat(fromRate.rate);
    return (amountInEur * parseFloat(toRate.rate)).toFixed(4);
  }

  // Handle when one of the currencies IS EUR
  if (fromCurrency === "EUR" && toRate) {
    return (parseFloat(amount) * parseFloat(toRate.rate)).toFixed(4);
  }
  if (toCurrency === "EUR" && fromRate) {
    return (parseFloat(amount) / parseFloat(fromRate.rate)).toFixed(4);
  }

  return amount; // Fallback: no conversion available
}
