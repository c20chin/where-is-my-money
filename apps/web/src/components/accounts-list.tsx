"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Account = {
  id: string;
  accountName: string;
  bankName: string;
  savingTypeId: number;
  savingTypeName: string | null;
  savingTypeLabel: string | null;
  currencyCode: string;
  currencySymbol: string | null;
  isActive: boolean;
};

type SavingType = { id: number; name: string; label: string };
type Currency = { code: string; name: string; symbol: string; decimalPlaces: number };

type Props = {
  accounts: Account[];
  savingTypes: SavingType[];
  currencies: Currency[];
};

export function AccountsList({ accounts, savingTypes, currencies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({
    accountName: "",
    bankName: "",
    savingTypeId: "",
    currencyCode: "",
  });

  function resetForm() {
    setForm({ accountName: "", bankName: "", savingTypeId: "", currencyCode: "" });
    setEditing(null);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      accountName: account.accountName,
      bankName: account.bankName,
      savingTypeId: String(account.savingTypeId),
      currencyCode: account.currencyCode,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      accountName: form.accountName,
      bankName: form.bankName,
      savingTypeId: parseInt(form.savingTypeId),
      currencyCode: form.currencyCode,
    };

    const url = editing ? `/api/accounts/${editing.id}` : "/api/accounts";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json();
      toast({ title: "Error", description: JSON.stringify(error.error), variant: "destructive" });
      return;
    }

    toast({ title: editing ? "Account updated" : "Account created" });
    setOpen(false);
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this account?")) return;

    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
      return;
    }

    toast({ title: "Account deleted" });
    router.refresh();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "New Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Saving Type</Label>
              <Select
                value={form.savingTypeId}
                onValueChange={(v) => setForm((f) => ({ ...f, savingTypeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {savingTypes.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currencyCode}
                onValueChange={(v) => setForm((f) => ({ ...f, currencyCode: v }))}
              >
                <SelectTrigger>
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
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No accounts yet. Add your first account above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{account.accountName}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.bankName} · {account.savingTypeLabel} · {account.currencySymbol}{" "}
                    {account.currencyCode}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(account)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
