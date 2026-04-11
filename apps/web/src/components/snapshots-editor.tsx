"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getMonthName } from "@/lib/utils";
import { Save } from "lucide-react";

type AccountSnapshot = {
  id: string;
  accountName: string;
  bankName: string;
  currencyCode: string;
  currencySymbol: string | null;
  savingTypeLabel: string | null;
  snapshotId: string | null;
  amount: string;
  notes: string;
};

type Props = {
  accounts: AccountSnapshot[];
  year: number;
  month: number;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: getMonthName(i + 1),
}));

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 5 + i;
  return { value: String(y), label: String(y) };
});

export function SnapshotsEditor({ accounts, year, month }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [snapshots, setSnapshots] = useState(
    accounts.map((a) => ({
      accountId: a.id,
      amount: a.amount,
      notes: a.notes,
    }))
  );

  function updateSnapshot(index: number, field: "amount" | "notes", value: string) {
    setSnapshots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function navigateTo(newYear: string, newMonth: string) {
    router.push(`/snapshots?year=${newYear}&month=${newMonth}`);
  }

  async function handleSave() {
    setSaving(true);

    const toSave = snapshots.filter((s) => s.amount !== "");

    if (toSave.length === 0) {
      toast({ title: "Nothing to save", variant: "destructive" });
      setSaving(false);
      return;
    }

    const res = await fetch("/api/snapshots/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, snapshots: toSave }),
    });

    if (!res.ok) {
      const error = await res.json();
      toast({ title: "Error", description: JSON.stringify(error.error), variant: "destructive" });
    } else {
      toast({ title: "Snapshots saved" });
      router.refresh();
    }

    setSaving(false);
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Month</Label>
          <Select value={String(month)} onValueChange={(v) => navigateTo(String(year), v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Year</Label>
          <Select value={String(year)} onValueChange={(v) => navigateTo(v, String(month))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No accounts yet. Create accounts first to enter snapshots.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {getMonthName(month)} {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map((account, index) => (
                  <div
                    key={account.id}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.bankName} · {account.savingTypeLabel} · {account.currencySymbol}{" "}
                        {account.currencyCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {account.currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-[150px]"
                        value={snapshots[index].amount}
                        onChange={(e) => updateSnapshot(index, "amount", e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Notes (optional)"
                      value={snapshots[index].notes}
                      onChange={(e) => updateSnapshot(index, "notes", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </>
      )}
    </>
  );
}
