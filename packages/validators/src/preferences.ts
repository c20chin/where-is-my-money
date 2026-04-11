import { z } from "zod";

export const userPreferencesSchema = z.object({
  userId: z.string().uuid(),
  displayCurrency: z.string().length(3),
  language: z.string().min(2).max(10),
});

export const updatePreferencesSchema = z.object({
  displayCurrency: z.string().length(3),
  language: z.string().min(2).max(10),
});
