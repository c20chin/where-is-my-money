import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, savingTypes, currencies } from "@wimm/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createAccountSchema } from "@wimm/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db
    .select({
      id: accounts.id,
      accountName: accounts.accountName,
      bankName: accounts.bankName,
      savingTypeId: accounts.savingTypeId,
      savingTypeName: savingTypes.name,
      savingTypeLabel: savingTypes.label,
      currencyCode: accounts.currencyCode,
      currencySymbol: currencies.symbol,
      isActive: accounts.isActive,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts)
    .leftJoin(savingTypes, eq(accounts.savingTypeId, savingTypes.id))
    .leftJoin(currencies, eq(accounts.currencyCode, currencies.code))
    .where(and(eq(accounts.userId, session.user.id), isNull(accounts.deletedAt)));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [account] = await db
    .insert(accounts)
    .values({
      userId: session.user.id,
      ...parsed.data,
    })
    .returning();

  return NextResponse.json(account, { status: 201 });
}
