import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { investments, accounts } from "@wimm/db/schema";
import { eq, and } from "drizzle-orm";
import { createInvestmentSchema } from "@wimm/validators";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify account ownership
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, params.id), eq(accounts.userId, session.user.id)));

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const investmentsList = await db
    .select()
    .from(investments)
    .where(eq(investments.accountId, params.id));

  return NextResponse.json(investmentsList);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify account ownership
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, params.id), eq(accounts.userId, session.user.id)));

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createInvestmentSchema.safeParse({
    ...body,
    accountId: params.id,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db.insert(investments).values(parsed.data).returning();

  return NextResponse.json(created, { status: 201 });
}
