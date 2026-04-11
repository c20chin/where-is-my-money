import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@wimm/db/schema";
import { eq } from "drizzle-orm";
import { updatePreferencesSchema } from "@wimm/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));

  return NextResponse.json(prefs || { userId: session.user.id, displayCurrency: "USD", language: "en-US" });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updatePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [result] = await db
    .insert(userPreferences)
    .values({
      userId: session.user.id,
      displayCurrency: parsed.data.displayCurrency,
      language: parsed.data.language,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        displayCurrency: parsed.data.displayCurrency,
        language: parsed.data.language,
      },
    })
    .returning();

  return NextResponse.json(result);
}
