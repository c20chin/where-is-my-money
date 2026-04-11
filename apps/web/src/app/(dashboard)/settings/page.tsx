import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences, currencies } from "@wimm/db/schema";
import { eq } from "drizzle-orm";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));

  const allCurrencies = await db.select().from(currencies);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <SettingsForm
        currencies={allCurrencies}
        currentCurrency={prefs?.displayCurrency ?? "USD"}
        currentLanguage={prefs?.language ?? "en-US"}
      />
    </div>
  );
}
