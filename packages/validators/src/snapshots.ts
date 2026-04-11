import { z } from "zod";

export const snapshotSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Invalid amount format"),
  notes: z.string().max(1000).nullable().optional(),
});

export const createSnapshotSchema = snapshotSchema.omit({ id: true });

export const updateSnapshotSchema = snapshotSchema.partial().omit({ id: true });

export const bulkUpsertSnapshotsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  snapshots: z.array(
    z.object({
      accountId: z.string().uuid(),
      amount: z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Invalid amount format"),
      notes: z.string().max(1000).nullable().optional(),
    })
  ),
});
