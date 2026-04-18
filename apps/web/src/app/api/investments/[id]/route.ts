import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { investments, accounts } from "@wimm/db/schema";
import { eq, and } from "drizzle-orm";
import { updateInvestmentSchema } from "@wimm/validators";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get investment with account ownership check
  const [investment] = await db
    .select({
      investment: investments,
      accountUserId: accounts.userId,
    })
    .from(investments)
    .innerJoin(accounts, eq(investments.accountId, accounts.id))
    .where(eq(investments.id, params.id));

  if (!investment || investment.accountUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateInvestmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(investments)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(investments.id, params.id))
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

  // Get investment with account ownership check
  const [investment] = await db
    .select({
      investment: investments,
      accountUserId: accounts.userId,
    })
    .from(investments)
    .innerJoin(accounts, eq(investments.accountId, accounts.id))
    .where(eq(investments.id, params.id));

  if (!investment || investment.accountUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(investments).where(eq(investments.id, params.id));

  return NextResponse.json({ success: true });
}
