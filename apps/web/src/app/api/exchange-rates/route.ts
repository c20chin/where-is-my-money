import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeRates } from "@wimm/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const base = searchParams.get("base");
  const date = searchParams.get("date");

  if (!base) {
    return NextResponse.json({ error: "base currency is required" }, { status: 400 });
  }

  let query = db
    .select()
    .from(exchangeRates)
    .where(
      date
        ? and(eq(exchangeRates.baseCurrency, base), eq(exchangeRates.date, date))
        : eq(exchangeRates.baseCurrency, base)
    );

  const result = await query;
  return NextResponse.json(result);
}
