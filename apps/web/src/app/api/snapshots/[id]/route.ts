import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { balanceSnapshots, accounts } from "@wimm/db/schema";
import { eq, and } from "drizzle-orm";
import { updateSnapshotSchema } from "@wimm/validators";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [snapshot] = await db
    .select()
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .where(
      and(eq(balanceSnapshots.id, params.id), eq(accounts.userId, session.user.id))
    );

  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot.balance_snapshots);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify ownership via account
  const [existing] = await db
    .select()
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .where(
      and(eq(balanceSnapshots.id, params.id), eq(accounts.userId, session.user.id))
    );

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(balanceSnapshots)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(balanceSnapshots.id, params.id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [existing] = await db
    .select()
    .from(balanceSnapshots)
    .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
    .where(
      and(eq(balanceSnapshots.id, params.id), eq(accounts.userId, session.user.id))
    );

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(balanceSnapshots).where(eq(balanceSnapshots.id, params.id));

  return NextResponse.json({ success: true });
}
