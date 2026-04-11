import "server-only";
import { db } from "./db";
import { exchangeRates, currencies } from "@wimm/db/schema";
import { and, eq, lte, desc } from "drizzle-orm";

const EXCHANGE_API = "https://open.er-api.com/v6/latest";

type ExchangeRateResponse = {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
};

export async function syncExchangeRates(date?: string): Promise<number> {
  const targetDate = date || new Date().toISOString().split("T")[0];

  // open.er-api.com only serves latest rates (free tier), so we use EUR as base
  const response = await fetch(`${EXCHANGE_API}/EUR`);
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
  }

  const data: ExchangeRateResponse = await response.json();
  if (data.result !== "success") {
    throw new Error("Exchange rate API returned non-success result");
  }

  // Only insert rates for currencies that exist in our currencies table
  const knownCurrencies = await db.select({ code: currencies.code }).from(currencies);
  const knownCodes = new Set(knownCurrencies.map((c) => c.code));

  const values = Object.entries(data.rates)
    .filter(([currency]) => knownCodes.has(currency) && currency !== "EUR")
    .map(([currency, rate]) => ({
      baseCurrency: "EUR",
      targetCurrency: currency,
      rate: rate.toFixed(10),
      date: targetDate,
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
 * Ensures exchange rates are available in the database for the given date.
 * Syncs if no rates exist, or if existing rates are more than 1 day old.
 */
async function ensureRatesAvailable(date: string): Promise<void> {
  const [existing] = await db
    .select({ date: exchangeRates.date })
    .from(exchangeRates)
    .orderBy(desc(exchangeRates.date))
    .limit(1);

  // Sync if no rates exist, or if latest rate is older than requested date
  const needsSync = !existing || existing.date < date;
  if (needsSync) {
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
