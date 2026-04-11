import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncExchangeRates } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const date = body.date as string | undefined;

  const count = await syncExchangeRates(date);
  return NextResponse.json({ synced: count, date: date || new Date().toISOString().split("T")[0] });
}
