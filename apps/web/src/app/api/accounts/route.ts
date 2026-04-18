import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, savingTypes, currencies } from "@wimm/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createAccountSchema, bulkCreateAccountsSchema } from "@wimm/validators";

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

  try {
    const body = await request.json();
    console.log("[POST /api/accounts] Request body:", JSON.stringify(body, null, 2));

    // Bulk creation: body is an array
    if (Array.isArray(body)) {
      const parsed = bulkCreateAccountsSchema.safeParse(body);
      if (!parsed.success) {
        console.log("[POST /api/accounts] Validation failed:", parsed.error);
        const rowErrors: Record<number, Record<string, string[]>> = {};
        for (const issue of parsed.error.issues) {
          const rowIndex = issue.path[0] as number;
          const field = issue.path.slice(1).join(".") || "root";
          if (!rowErrors[rowIndex]) rowErrors[rowIndex] = {};
          if (!rowErrors[rowIndex][field]) rowErrors[rowIndex][field] = [];
          rowErrors[rowIndex][field].push(issue.message);
        }
        return NextResponse.json({ rowErrors }, { status: 400 });
      }

      console.log("[POST /api/accounts] Validation passed, inserting accounts");
      try {
        const created = await db
          .insert(accounts)
          .values(parsed.data.map((account) => ({ userId: session.user.id, ...account })))
          .returning();

        console.log("[POST /api/accounts] Successfully created:", created.length, "accounts");
        return NextResponse.json(created, { status: 201 });
      } catch (dbError: any) {
        console.error("[POST /api/accounts] Database error:", dbError);
        return NextResponse.json(
          { error: "Database error", message: dbError.message, detail: dbError.detail || dbError },
          { status: 500 }
        );
      }
    }

    // Single account creation
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      console.log("[POST /api/accounts] Validation failed:", parsed.error);
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    console.log("[POST /api/accounts] Validation passed, inserting single account");
    try {
      const [account] = await db
        .insert(accounts)
        .values({
          userId: session.user.id,
          ...parsed.data,
        })
        .returning();

      console.log("[POST /api/accounts] Successfully created account:", account.id);
      return NextResponse.json(account, { status: 201 });
    } catch (dbError: any) {
      console.error("[POST /api/accounts] Database error:", dbError);
      return NextResponse.json(
        { error: "Database error", message: dbError.message, detail: dbError.detail || dbError },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[POST /api/accounts] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
