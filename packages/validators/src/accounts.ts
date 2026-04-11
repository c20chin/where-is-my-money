import { z } from "zod";

export const accountSchema = z.object({
  id: z.string().uuid(),
  accountName: z.string().min(1).max(255),
  bankName: z.string().min(1).max(255),
  savingTypeId: z.number().int().positive(),
  currencyCode: z.string().length(3),
  isActive: z.boolean(),
});

export const createAccountSchema = accountSchema.omit({ id: true, isActive: true });

export const updateAccountSchema = accountSchema.partial().omit({ id: true });
