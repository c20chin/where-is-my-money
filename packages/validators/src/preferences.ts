import { z } from "zod";

export const userPreferencesSchema = z.object({
  userId: z.string().uuid(),
  displayCurrency: z.string().length(3),
});

export const updatePreferencesSchema = z.object({
  displayCurrency: z.string().length(3),
});
