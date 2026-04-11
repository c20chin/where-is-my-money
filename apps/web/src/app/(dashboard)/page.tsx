import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences, accounts, balanceSnapshots, savingTypes } from "@wimm/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { convertAmount } from "@/lib/exchange-rates";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));
  const displayCurrency = prefs?.displayCurrency || "EUR";

  // Get all snapshots for the year
  const snapshots = await db
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

  // Latest snapshot per account
  const latestByAccount = new Map<string, (typeof snapshots)[0]>();
  for (const snap of snapshots) {
    if (!latestByAccount.has(snap.accountId)) {
      latestByAccount.set(snap.accountId, snap);
    }
  }

  const latestMonth = Math.max(...[...latestByAccount.values()].map((s) => s.month), 1);
  const latestDate = `${year}-${String(latestMonth).padStart(2, "0")}-01`;

  // Compute totals by currency
  const byCurrency = new Map<string, number>();
  for (const snap of latestByAccount.values()) {
    byCurrency.set(snap.currencyCode, (byCurrency.get(snap.currencyCode) || 0) + parseFloat(snap.amount));
  }

  let convertedGrandTotal = 0;
  const totalsByCurrency = await Promise.all(
    [...byCurrency.entries()].map(async ([currency, total]) => {
      const convertedTotal = await convertAmount(total.toFixed(4), currency, displayCurrency, latestDate);
      return { currency, total: total.toFixed(4), convertedTotal };
    })
  );
  for (const { convertedTotal } of totalsByCurrency) {
    convertedGrandTotal += parseFloat(convertedTotal);
  }

  // Compute totals by type (converted to display currency)
  const byType = new Map<string, { label: string; total: number }>();
  const byTypeEntries = [...latestByAccount.values()];
  const byTypeConverted = await Promise.all(
    byTypeEntries.map((snap) =>
      convertAmount(snap.amount, snap.currencyCode, displayCurrency, latestDate)
    )
  );
  for (let i = 0; i < byTypeEntries.length; i++) {
    const snap = byTypeEntries[i];
    const key = snap.savingTypeLabel || "Other";
    const convertedAmount = parseFloat(byTypeConverted[i]);
    const current = byType.get(key);
    if (current) {
      current.total += convertedAmount;
    } else {
      byType.set(key, { label: key, total: convertedAmount });
    }
  }

  // Per-account monthly trends (converted to display currency)
  // Build account list and group snapshots by accountId → month
  const accountList: { id: string; name: string; bankName: string | null }[] = [];
  const seenAccountIds = new Set<string>();
  const snapByAccountMonth = new Map<string, Map<number, (typeof snapshots)[0]>>();
  for (const snap of snapshots) {
    if (!seenAccountIds.has(snap.accountId)) {
      seenAccountIds.add(snap.accountId);
      accountList.push({ id: snap.accountId, name: snap.accountName, bankName: snap.bankName });
    }
    if (!snapByAccountMonth.has(snap.accountId)) {
      snapByAccountMonth.set(snap.accountId, new Map());
    }
    snapByAccountMonth.get(snap.accountId)!.set(snap.month, snap);
  }

  const allMonths = [...new Set(snapshots.map((s) => s.month))].sort((a, b) => a - b);
  const accountTrends: Array<Record<string, number | string>> = [];

  for (const month of allMonths) {
    const monthDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const entry: Record<string, string | number> = { month: getMonthName(month) };
    await Promise.all(
      [...snapByAccountMonth.entries()].map(async ([accountId, monthMap]) => {
        const snap = monthMap.get(month);
        if (snap) {
          const converted = await convertAmount(snap.amount, snap.currencyCode, displayCurrency, monthDate);
          entry[accountId] = parseFloat(converted);
        }
      })
    );
    accountTrends.push(entry as Record<string, number | string>);
  }

  const hasData = latestByAccount.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">{year}</p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No data yet. Add accounts and enter monthly balances to see your dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Net Worth Card */}
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Total Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {formatCurrency(convertedGrandTotal, displayCurrency)}
              </p>
              <p className="mt-1 text-sm opacity-80">
                in {displayCurrency} as of {getMonthName(latestMonth)} {year}
              </p>
            </CardContent>
          </Card>

          {/* Currency Breakdown */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {totalsByCurrency.map(({ currency, total, convertedTotal }) => (
              <Card key={currency}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {currency}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(total, currency)}</p>
                  {currency !== displayCurrency && (
                    <p className="text-sm text-muted-foreground">
                      ~ {formatCurrency(convertedTotal, displayCurrency)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <DashboardCharts
            accountTrends={accountTrends}
            accounts={accountList}
            typeBreakdown={[...byType.values()]}
            displayCurrency={displayCurrency}
          />
        </>
      )}
    </div>
  );
}
