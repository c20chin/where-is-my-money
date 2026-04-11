import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { balanceSnapshots, accounts } from "@wimm/db/schema";
import { eq, and } from "drizzle-orm";
import { createSnapshotSchema } from "@wimm/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  const result = await db
    .select({
      id: balanceSnapshots.id,
      accountId: balanceSnapshots.accountId,
      accountName: accounts.accountName,
      bankName: accounts.bankName,
      currencyCode: accounts.currencyCode,
      year: balanceSnapshots.year,
      month: balanceSnapshots.month,
      amount: balanceSnapshots.amount,
      notes: balanceSnapshots.notes,
      createdAt: balanceSnapshots.createdAt,
      updatedAt: balanceSnapshots.updatedAt,
    })
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .where(
      and(
        eq(accounts.userId, session.user.id),
        eq(balanceSnapshots.year, parseInt(year)),
        eq(balanceSnapshots.month, parseInt(month))
      )
    );

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify account belongs to user
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.userId, session.user.id)));

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const [snapshot] = await db
    .insert(balanceSnapshots)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: [balanceSnapshots.accountId, balanceSnapshots.year, balanceSnapshots.month],
      set: {
        amount: parsed.data.amount,
        notes: parsed.data.notes,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(snapshot, { status: 201 });
}
