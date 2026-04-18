import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, balanceSnapshots, savingTypes, currencies } from "@wimm/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentYearMonth } from "@/lib/utils";
import dynamicImport from "next/dynamic";

const SnapshotsEditor = dynamicImport(() => import("@/components/snapshots-editor").then(mod => ({ default: mod.SnapshotsEditor })), {
  loading: () => <div className="space-y-4"><div className="h-96 bg-muted animate-pulse rounded"></div></div>,
  ssr: false,
});

export const dynamic = "force-dynamic";

export default async function SnapshotsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { year: defaultYear, month: defaultMonth } = getCurrentYearMonth();
  const year = searchParams.year ? parseInt(searchParams.year) : defaultYear;
  const month = searchParams.month ? parseInt(searchParams.month) : defaultMonth;

  // Get all active accounts
  const userAccounts = await db
    .select({
      id: accounts.id,
      accountName: accounts.accountName,
      bankName: accounts.bankName,
      currencyCode: accounts.currencyCode,
      currencySymbol: currencies.symbol,
      savingTypeLabel: savingTypes.label,
    })
    .from(accounts)
    .leftJoin(savingTypes, eq(accounts.savingTypeId, savingTypes.id))
    .leftJoin(currencies, eq(accounts.currencyCode, currencies.code))
    .where(and(eq(accounts.userId, session.user.id), isNull(accounts.deletedAt)));

  // Get existing snapshots for this month
  const existingSnapshots = await db
    .select()
    .from(balanceSnapshots)
    .where(
      and(
        eq(balanceSnapshots.year, year),
        eq(balanceSnapshots.month, month)
      )
    );

  // Build snapshot map by accountId
  const snapshotMap = new Map(existingSnapshots.map((s) => [s.accountId, s]));

  const accountsWithSnapshots = userAccounts.map((account) => {
    const snapshot = snapshotMap.get(account.id);
    return {
      ...account,
      snapshotId: snapshot?.id || null,
      amount: snapshot?.amount || "",
      notes: snapshot?.notes || "",
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Monthly Snapshots</h1>
      <SnapshotsEditor
        key={`${year}-${month}`}
        accounts={accountsWithSnapshots}
        year={year}
        month={month}
      />
    </div>
  );
}
