import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, savingTypes, currencies } from "@wimm/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { AccountsList } from "@/components/accounts-list";

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

  const allSavingTypes = await db.select().from(savingTypes);
  const allCurrencies = await db.select().from(currencies);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Accounts</h1>
      <AccountsList
        accounts={userAccounts}
        savingTypes={allSavingTypes}
        currencies={allCurrencies}
      />
    </div>
  );
}
