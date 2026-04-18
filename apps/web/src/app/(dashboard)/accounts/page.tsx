import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, savingTypes, currencies, investments } from "@wimm/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import dynamicImport from "next/dynamic";

const AccountsList = dynamicImport(() => import("@/components/accounts-list").then(mod => ({ default: mod.AccountsList })), {
  loading: () => <div className="space-y-4"><div className="h-12 bg-muted animate-pulse rounded"></div></div>,
  ssr: false,
});

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userAccounts = await db
    .select({
      id: accounts.id,
      accountName: accounts.accountName,
      bankName: accounts.bankName,
      savingTypeId: accounts.savingTypeId,
      savingTypeName: savingTypes.name,
      savingTypeLabel: savingTypes.label,
      currencyCode: accounts.currencyCode,
      currencySymbol: currencies.symbol,
      isActive: accounts.isActive,
    })
    .from(accounts)
    .leftJoin(savingTypes, eq(accounts.savingTypeId, savingTypes.id))
    .leftJoin(currencies, eq(accounts.currencyCode, currencies.code))
    .where(and(eq(accounts.userId, session.user.id), isNull(accounts.deletedAt)));

  // Fetch investments for all accounts
  const accountIds = userAccounts.map(a => a.id);
  const allInvestments = accountIds.length > 0
    ? await db.select().from(investments).where(inArray(investments.accountId, accountIds))
    : [];

  // Group investments by accountId
  const investmentsByAccount: Record<string, any[]> = {};
  for (const account of userAccounts) {
    investmentsByAccount[account.id] = [];
  }
  for (const inv of allInvestments) {
    if (investmentsByAccount[inv.accountId]) {
      investmentsByAccount[inv.accountId].push(inv);
    }
  }

  const allSavingTypes = await db.select().from(savingTypes);
  const allCurrencies = await db.select().from(currencies);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Accounts</h1>
      <AccountsList
        accounts={userAccounts}
        savingTypes={allSavingTypes}
        currencies={allCurrencies}
        investmentsByAccount={investmentsByAccount}
      />
    </div>
  );
}
