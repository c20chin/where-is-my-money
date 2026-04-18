import { z } from "zod";

export const investmentSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  targetName: z.string().min(1).max(255),
  percentage: z.string().regex(/^\d+(\.\d+)?$/),
});

export const createInvestmentSchema = investmentSchema.omit({ id: true });

export const updateInvestmentSchema = investmentSchema
  .partial()
  .omit({ id: true, accountId: true });
