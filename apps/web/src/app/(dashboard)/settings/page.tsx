import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { currencies, userPreferences } from "@wimm/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));

  const displayCurrency = prefs?.displayCurrency || "USD";

  const allCurrencies = await db.select().from(currencies);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm currencies={allCurrencies} currentDisplayCurrency={displayCurrency} />
        </CardContent>
      </Card>
    </div>
  );
}
