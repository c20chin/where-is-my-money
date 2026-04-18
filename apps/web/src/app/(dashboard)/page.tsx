import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences, accounts, balanceSnapshots, savingTypes, investments } from "@wimm/db/schema";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { convertAmount } from "@/lib/exchange-rates";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/components/dashboard-charts").then(mod => ({ default: mod.DashboardCharts })), {
  loading: () => <div className="grid gap-4 md:grid-cols-2"><Card><CardContent className="h-[300px] flex items-center justify-center">Loading charts...</CardContent></Card></div>,
  ssr: false,
});

const InvestmentPieChart = dynamic(() => import("@/components/investment-pie-chart").then(mod => ({ default: mod.InvestmentPieChart })), {
  loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>,
  ssr: false,
});

export const revalidate = 30; // Cache for 30 seconds

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

  // Get active accounts
  const activeAccounts = await db
    .select({
      id: accounts.id,
      accountName: accounts.accountName,
      bankName: accounts.bankName,
      currencyCode: accounts.currencyCode,
      savingTypeLabel: savingTypes.label,
    })
    .from(accounts)
    .leftJoin(savingTypes, eq(accounts.savingTypeId, savingTypes.id))
    .where(and(eq(accounts.userId, session.user.id), isNull(accounts.deletedAt)));

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

  // Fetch investments for investment accounts
  const investmentAccounts = await db
    .select({
      id: accounts.id,
      accountName: accounts.accountName,
      bankName: accounts.bankName,
      savingTypeId: accounts.savingTypeId,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), isNull(accounts.deletedAt), eq(accounts.savingTypeId, 4)));

  const accountIds = investmentAccounts.map(a => a.id);
  const allInvestments = accountIds.length > 0
    ? await db.select().from(investments).where(inArray(investments.accountId, accountIds))
    : [];

  const investmentsByAccount = new Map<string, typeof allInvestments>();
  for (const account of investmentAccounts) {
    investmentsByAccount.set(account.id, []);
  }
  for (const inv of allInvestments) {
    const list = investmentsByAccount.get(inv.accountId);
    if (list) list.push(inv);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">{year}</p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            {activeAccounts.length === 0 ? (
              <p className="text-muted-foreground">
                No accounts yet. Go to Accounts page to add your first account.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You have {activeAccounts.length} account{activeAccounts.length !== 1 ? "s" : ""} but no balance snapshots yet.
                </p>
                <div className="grid gap-2 max-w-md mx-auto text-left">
                  {activeAccounts.map((account) => (
                    <div key={account.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.bankName} · {account.savingTypeLabel} · {account.currencyCode}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground mt-4">
                  Go to Snapshots page to enter monthly balances.
                </p>
              </div>
            )}
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

          {/* Investment Pie Charts */}
          {investmentAccounts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Investment Allocations</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {investmentAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="pt-6">
                      <InvestmentPieChart
                        investments={investmentsByAccount.get(account.id) || []}
                        accountName={`${account.accountName} (${account.bankName})`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
