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
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { InvestmentsManager } from "./investments-manager";

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
  investmentsByAccount: Record<string, any[]>;
};

type RowForm = {
  accountName: string;
  bankName: string;
  savingTypeId: string;
  currencyCode: string;
};

type RowErrors = Record<string, string[]>;

const emptyRow = (): RowForm => ({
  accountName: "",
  bankName: "",
  savingTypeId: "",
  currencyCode: "",
});

export function AccountsList({ accounts, savingTypes, currencies, investmentsByAccount }: Props) {
  const router = useRouter();

  // Edit / single-account dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState<RowForm>(emptyRow());
  const [editErrors, setEditErrors] = useState<RowErrors>({});

  // Bulk create dialog state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rows, setRows] = useState<RowForm[]>([emptyRow()]);
  const [rowErrors, setRowErrors] = useState<Record<number, RowErrors>>({});

  // ── Edit helpers ─────────────────────────────────────────────────────────────

  function openEdit(account: Account) {
    setEditing(account);
    setEditForm({
      accountName: account.accountName,
      bankName: account.bankName,
      savingTypeId: String(account.savingTypeId),
      currencyCode: account.currencyCode,
    });
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditing(null);
    setEditForm(emptyRow());
    setEditErrors({});
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    // Client-side validation for Select fields
    const errors: RowErrors = {};
    if (!editForm.bankName.trim()) errors.bankName = ["Bank name is required"];
    if (!editForm.savingTypeId) errors.savingTypeId = ["Saving type is required"];
    if (!editForm.currencyCode) errors.currencyCode = ["Currency is required"];
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});

    const payload = {
      accountName: editForm.accountName,
      bankName: editForm.bankName,
      savingTypeId: parseInt(editForm.savingTypeId),
      currencyCode: editForm.currencyCode,
    };

    const res = await fetch(`/api/accounts/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      try {
        const error = await res.json();
        toast({ title: "Error", description: JSON.stringify(error.error), variant: "destructive" });
      } catch {
        toast({ title: "Error", description: "Failed to update account", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Account updated" });
    closeEdit();
    router.refresh();
  }

  // ── Bulk create helpers ───────────────────────────────────────────────────────

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
    setRowErrors((prev) => {
      const next: Record<number, RowErrors> = {};
      for (const [k, v] of Object.entries(prev)) {
        const ki = Number(k);
        if (ki === index) continue;
        next[ki < index ? ki : ki - 1] = v;
      }
      return next;
    });
  }

  function updateRow(index: number, field: keyof RowForm, value: string) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    // Clear error for this field when user edits it
    setRowErrors((prev) => {
      if (!prev[index]?.[field]) return prev;
      const updated = { ...prev[index] };
      delete updated[field];
      return { ...prev, [index]: updated };
    });
  }

  function closeBulk() {
    setBulkOpen(false);
    setRows([emptyRow()]);
    setRowErrors({});
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation for Select fields before API call
    const clientErrors: Record<number, RowErrors> = {};
    rows.forEach((row, index) => {
      const errors: RowErrors = {};
      if (!row.bankName.trim()) errors.bankName = ["Bank name is required"];
      if (!row.savingTypeId) errors.savingTypeId = ["Saving type is required"];
      if (!row.currencyCode) errors.currencyCode = ["Currency is required"];
      if (Object.keys(errors).length > 0) clientErrors[index] = errors;
    });
    if (Object.keys(clientErrors).length > 0) {
      setRowErrors(clientErrors);
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }

    const payload = rows.map((row) => ({
      accountName: row.accountName,
      bankName: row.bankName,
      savingTypeId: parseInt(row.savingTypeId),
      currencyCode: row.currencyCode,
    }));

    console.log("Sending payload:", payload);

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", res.status);
    console.log("Response ok:", res.ok);

    if (!res.ok) {
      try {
        const data = await res.json();
        console.log("Error data:", data);
        if (data.rowErrors) {
          setRowErrors(data.rowErrors);
          toast({ title: "Please fix the errors below", variant: "destructive" });
        } else {
          toast({ title: "Error", description: JSON.stringify(data.error), variant: "destructive" });
        }
      } catch (err) {
        console.error("JSON parse error:", err);
        toast({ title: "Error", description: "Failed to create accounts", variant: "destructive" });
      }
      return;
    }

    const created = await res.json();
    console.log("Created accounts:", created);
    toast({ title: `${created.length} account${created.length !== 1 ? "s" : ""} created` });
    closeBulk();
    router.refresh();
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Bulk create dialog */}
      <Dialog open={bulkOpen} onOpenChange={(v) => { if (!v) closeBulk(); setBulkOpen(v); }}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Accounts</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkSubmit}>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {rows.map((row, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Account {index + 1}
                    </span>
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeRow(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`accountName-${index}`}>Account Name</Label>
                      <Input
                        id={`accountName-${index}`}
                        value={row.accountName}
                        onChange={(e) => updateRow(index, "accountName", e.target.value)}
                        required
                      />
                      {rowErrors[index]?.accountName?.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">{msg}</p>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`bankName-${index}`}>Bank Name <span className="text-destructive">*</span></Label>
                      <Input
                        id={`bankName-${index}`}
                        value={row.bankName}
                        onChange={(e) => updateRow(index, "bankName", e.target.value)}
                        required
                      />
                      {rowErrors[index]?.bankName?.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">{msg}</p>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Label>Saving Type <span className="text-destructive">*</span></Label>
                      <Select
                        value={row.savingTypeId}
                        onValueChange={(v) => updateRow(index, "savingTypeId", v)}
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
                      {rowErrors[index]?.savingTypeId?.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">{msg}</p>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Label>Currency <span className="text-destructive">*</span></Label>
                      <Select
                        value={row.currencyCode}
                        onValueChange={(v) => updateRow(index, "currencyCode", v)}
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
                      {rowErrors[index]?.currencyCode?.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive">{msg}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">
                  Save {rows.length > 1 ? `${rows.length} Accounts` : "Account"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => !v && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-accountName">Account Name</Label>
              <Input
                id="edit-accountName"
                value={editForm.accountName}
                onChange={(e) => setEditForm((f) => ({ ...f, accountName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bankName">Bank Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-bankName"
                value={editForm.bankName}
                onChange={(e) => {
                  setEditForm((f) => ({ ...f, bankName: e.target.value }));
                  if (editErrors.bankName) setEditErrors(({ bankName: _, ...rest }) => rest);
                }}
                required
              />
              {editErrors.bankName?.map((msg) => (
                <p key={msg} className="text-xs text-destructive">{msg}</p>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Saving Type <span className="text-destructive">*</span></Label>
              <Select
                value={editForm.savingTypeId}
                onValueChange={(v) => {
                  setEditForm((f) => ({ ...f, savingTypeId: v }));
                  if (editErrors.savingTypeId) setEditErrors(({ savingTypeId: _, ...rest }) => rest);
                }}
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
              {editErrors.savingTypeId?.map((msg) => (
                <p key={msg} className="text-xs text-destructive">{msg}</p>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Currency <span className="text-destructive">*</span></Label>
              <Select
                value={editForm.currencyCode}
                onValueChange={(v) => {
                  setEditForm((f) => ({ ...f, currencyCode: v }));
                  if (editErrors.currencyCode) setEditErrors(({ currencyCode: _, ...rest }) => rest);
                }}
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
              {editErrors.currencyCode?.map((msg) => (
                <p key={msg} className="text-xs text-destructive">{msg}</p>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Update</Button>
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
                <div className="flex-1">
                  <p className="font-semibold">{account.accountName}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.bankName} · {account.savingTypeLabel} · {account.currencySymbol}{" "}
                    {account.currencyCode}
                  </p>
                </div>
                <div className="flex gap-2">
                  {account.savingTypeId === 4 && (
                    <InvestmentsManager
                      accountId={account.id}
                      accountName={account.accountName}
                      investments={investmentsByAccount[account.id] || []}
                    />
                  )}
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
