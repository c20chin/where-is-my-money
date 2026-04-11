import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  accounts,
  balanceSnapshots,
  savingTypes,
  userPreferences,
} from "@wimm/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { convertAmount } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year")
    ? parseInt(searchParams.get("year")!)
    : new Date().getFullYear();

  // Get user's display currency preference
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));
  const displayCurrency = searchParams.get("displayCurrency") || prefs?.displayCurrency || "USD";

  // Get the latest snapshot for each account (most recent month in the year)
  const latestSnapshots = await db
    .select({
      accountId: balanceSnapshots.accountId,
      accountName: accounts.accountName,
      bankName: accounts.bankName,
      currencyCode: accounts.currencyCode,
      savingTypeId: accounts.savingTypeId,
      savingTypeName: savingTypes.name,
      savingTypeLabel: savingTypes.label,
      year: balanceSnapshots.year,
      month: balanceSnapshots.month,
      amount: balanceSnapshots.amount,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .leftJoin(savingTypes, eq(accounts.savingTypeId, savingTypes.id))
    .where(
      and(
        eq(accounts.userId, session.user.id),
        isNull(accounts.deletedAt),
        eq(balanceSnapshots.year, year)
      )
    )
    .orderBy(desc(balanceSnapshots.month));

  // Find latest month per account
  const latestByAccount = new Map<string, (typeof latestSnapshots)[0]>();
  for (const snap of latestSnapshots) {
    if (!latestByAccount.has(snap.accountId)) {
      latestByAccount.set(snap.accountId, snap);
    }
  }

  const latestDate = `${year}-${String(
    Math.max(...[...latestByAccount.values()].map((s) => s.month), 1)
  ).padStart(2, "0")}-01`;

  // Totals by currency
  const byCurrency = new Map<string, number>();
  for (const snap of latestByAccount.values()) {
    const current = byCurrency.get(snap.currencyCode) || 0;
    byCurrency.set(snap.currencyCode, current + parseFloat(snap.amount));
  }

  const totalsByCurrency = [];
  let convertedGrandTotal = 0;
  for (const [currency, total] of byCurrency) {
    const converted = await convertAmount(
      total.toFixed(4),
      currency,
      displayCurrency,
      latestDate
    );
    totalsByCurrency.push({
      currency,
      total: total.toFixed(4),
      convertedTotal: converted,
    });
    convertedGrandTotal += parseFloat(converted);
  }

  // Totals by saving type
  const byType = new Map<string, { savingType: { name: string; label: string; id: number }; total: number; currency: string }>();
  for (const snap of latestByAccount.values()) {
    const key = `${snap.savingTypeId}-${snap.currencyCode}`;
    const current = byType.get(key);
    if (current) {
      current.total += parseFloat(snap.amount);
    } else {
      byType.set(key, {
        savingType: {
          id: snap.savingTypeId,
          name: snap.savingTypeName || "unknown",
          label: snap.savingTypeLabel || "Unknown",
        },
        total: parseFloat(snap.amount),
        currency: snap.currencyCode,
      });
    }
  }

  const totalsByType = [...byType.values()].map((v) => ({
    savingType: v.savingType,
    total: v.total.toFixed(4),
    currency: v.currency,
  }));

  // Monthly trends (totals per month, converted to display currency)
  const monthlyMap = new Map<number, Map<string, number>>();
  for (const snap of latestSnapshots) {
    if (!monthlyMap.has(snap.month)) {
      monthlyMap.set(snap.month, new Map());
    }
    const currMap = monthlyMap.get(snap.month)!;
    const current = currMap.get(snap.currencyCode) || 0;
    currMap.set(snap.currencyCode, current + parseFloat(snap.amount));
  }

  const monthlyTrends = [];
  for (const [month, currMap] of [...monthlyMap.entries()].sort((a, b) => a[0] - b[0])) {
    let total = 0;
    const monthDate = `${year}-${String(month).padStart(2, "0")}-01`;
    for (const [currency, amount] of currMap) {
      const converted = await convertAmount(
        amount.toFixed(4),
        currency,
        displayCurrency,
        monthDate
      );
      total += parseFloat(converted);
    }
    monthlyTrends.push({ year, month, total: total.toFixed(4) });
  }

  return NextResponse.json({
    totalsByType,
    totalsByCurrency,
    convertedGrandTotal: convertedGrandTotal.toFixed(4),
    displayCurrency,
    monthlyTrends,
  });
}
