import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { balanceSnapshots, accounts } from "@wimm/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { bulkUpsertSnapshotsSchema } from "@wimm/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkUpsertSnapshotsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { year, month, snapshots } = parsed.data;

  // Verify all accounts belong to user
  const accountIds = snapshots.map((s) => s.accountId);
  const userAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), inArray(accounts.id, accountIds)));

  const validAccountIds = new Set(userAccounts.map((a) => a.id));
  const invalidIds = accountIds.filter((id) => !validAccountIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Invalid account IDs: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  const results = [];
  for (const snapshot of snapshots) {
    const [result] = await db
      .insert(balanceSnapshots)
      .values({
        accountId: snapshot.accountId,
        year,
        month,
        amount: snapshot.amount,
        notes: snapshot.notes,
      })
      .onConflictDoUpdate({
        target: [balanceSnapshots.accountId, balanceSnapshots.year, balanceSnapshots.month],
        set: {
          amount: snapshot.amount,
          notes: snapshot.notes,
          updatedAt: new Date(),
        },
      })
      .returning();
    results.push(result);
  }

  return NextResponse.json(results, { status: 201 });
}
