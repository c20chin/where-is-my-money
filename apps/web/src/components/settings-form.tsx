"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Currency = { code: string; name: string; symbol: string };

type Props = {
  currencies: Currency[];
  currentDisplayCurrency: string;
};

export function SettingsForm({ currencies, currentDisplayCurrency }: Props) {
  const router = useRouter();
  const [displayCurrency, setDisplayCurrency] = useState(currentDisplayCurrency);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast({
          title: "Error",
          description: error?.error ?? "Failed to save settings. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Settings saved" });
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayCurrency">Default Base Currency</Label>
        <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
          <SelectTrigger id="displayCurrency" className="w-64">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Dashboard totals will be converted and displayed in this currency.
        </p>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}
