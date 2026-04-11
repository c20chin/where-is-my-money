import { db } from "./db";
import { exchangeRates } from "@wimm/db/schema";
import { and, eq } from "drizzle-orm";

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

  const [rate] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, fromCurrency),
        eq(exchangeRates.targetCurrency, toCurrency),
        eq(exchangeRates.date, date)
      )
    );

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
        eq(exchangeRates.date, date)
      )
    );

  if (reverseRate) {
    return (parseFloat(amount) / parseFloat(reverseRate.rate)).toFixed(4);
  }

  // Try via EUR (frankfurter uses EUR as base)
  return await convertViaEur(amount, fromCurrency, toCurrency, date);
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
        eq(exchangeRates.date, date)
      )
    );

  const [toRate] = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.baseCurrency, "EUR"),
        eq(exchangeRates.targetCurrency, toCurrency),
        eq(exchangeRates.date, date)
      )
    );

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
