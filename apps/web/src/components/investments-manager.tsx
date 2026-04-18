"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Investment = {
  id: string;
  accountId: string;
  targetName: string;
  percentage: string;
};

type InvestmentsManagerProps = {
  accountId: string;
  accountName: string;
  investments: Investment[];
};

export function InvestmentsManager({
  accountId,
  accountName,
  investments: initialInvestments,
}: InvestmentsManagerProps) {
  const [open, setOpen] = useState(false);
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    targetName: "",
    percentage: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      targetName: "",
      percentage: "",
    });
    setErrors({});
    setEditingId(null);
  };

  const handleEdit = (investment: Investment) => {
    setEditingId(investment.id);
    setFormData({
      targetName: investment.targetName,
      percentage: investment.percentage,
    });
  };

  // Merge duplicates for accurate total calculation
  const mergedInvestments = investments.reduce((acc, inv) => {
    const existing = acc.find(item => item.targetName === inv.targetName);
    if (existing) {
      existing.percentage = (parseFloat(existing.percentage) + parseFloat(inv.percentage)).toFixed(2);
    } else {
      acc.push({ ...inv });
    }
    return acc;
  }, [] as Investment[]);

  const totalPercentage = mergedInvestments.reduce(
    (sum, inv) => sum + parseFloat(inv.percentage || "0"),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    if (!formData.targetName.trim()) {
      setErrors({ targetName: ["Investment target name is required"] });
      return;
    }
    if (!formData.percentage || parseFloat(formData.percentage) <= 0) {
      setErrors({ percentage: ["Percentage must be greater than 0"] });
      return;
    }

    // Validate percentage total
    const newTotal = editingId
      ? investments
          .filter((inv) => inv.id !== editingId)
          .reduce((sum, inv) => sum + parseFloat(inv.percentage || "0"), 0) +
        parseFloat(formData.percentage || "0")
      : totalPercentage + parseFloat(formData.percentage || "0");

    if (newTotal > 100) {
      setErrors({ percentage: [`Total would be ${newTotal.toFixed(1)}% - cannot exceed 100%`] });
      return;
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/investments/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const error = await res.json();
          if (error.error?.fieldErrors) {
            setErrors(error.error.fieldErrors);
          }
          return;
        }

        const updated = await res.json();
        setInvestments(investments.map((inv) => (inv.id === editingId ? updated : inv)));
        toast({ description: "Investment target updated" });
      } else {
        const res = await fetch(`/api/accounts/${accountId}/investments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const error = await res.json();
          if (error.error?.fieldErrors) {
            setErrors(error.error.fieldErrors);
          }
          return;
        }

        const created = await res.json();
        setInvestments([...investments, created]);
        toast({ description: "Investment target added" });
      }

      resetForm();
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investment target?")) return;

    try {
      const res = await fetch(`/api/investments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      setInvestments(investments.filter((inv) => inv.id !== id));
      toast({ description: "Investment target deleted" });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to delete investment target",
      });
    }
  };

  const remainingPercentage = Math.max(0, 100 - totalPercentage);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Manage Investment Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Investment Allocation - {accountName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {totalPercentage > 100 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive p-4 text-destructive">
              <p className="font-semibold">⚠️ Over-allocated</p>
              <p className="text-sm">Total allocation is {totalPercentage.toFixed(1)}%. Please edit or delete some targets to get back to 100% or below.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Total Allocated</p>
              <p className="text-2xl font-bold">{totalPercentage.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">{remainingPercentage.toFixed(1)}%</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetName">Investment Target *</Label>
                <Input
                  id="targetName"
                  placeholder="e.g., S&P 500, Bonds, Real Estate"
                  value={formData.targetName}
                  onChange={(e) => {
                    setFormData({ ...formData, targetName: e.target.value });
                    if (errors.targetName) {
                      const { targetName, ...rest } = errors;
                      setErrors(rest);
                    }
                  }}
                  required
                />
                {errors.targetName?.map((msg, i) => (
                  <p key={i} className="text-xs text-destructive">{msg}</p>
                ))}
              </div>
              <div>
                <Label htmlFor="percentage">Percentage (%) *</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="0.01-100"
                  value={formData.percentage}
                  onChange={(e) => {
                    setFormData({ ...formData, percentage: e.target.value });
                    if (errors.percentage) {
                      const { percentage, ...rest } = errors;
                      setErrors(rest);
                    }

                    // Show real-time suggestion if over limit
                    const inputValue = parseFloat(e.target.value);
                    if (inputValue > 0) {
                      const otherTotal = editingId
                        ? investments
                            .filter((inv) => inv.id !== editingId)
                            .reduce((sum, inv) => sum + parseFloat(inv.percentage || "0"), 0)
                        : totalPercentage;
                      const maxAllowed = 100 - otherTotal;

                      if (inputValue > maxAllowed && maxAllowed > 0) {
                        setErrors({
                          percentage: [`Maximum allowed: ${maxAllowed.toFixed(2)}% (would total ${(otherTotal + inputValue).toFixed(1)}%)`]
                        });
                      }
                    }
                  }}
                  required
                />
                {errors.percentage?.map((msg, i) => (
                  <p key={i} className="text-xs text-destructive">{msg}</p>
                ))}
                {!errors.percentage && remainingPercentage > 0 && (
                  <p className="text-xs text-muted-foreground">Available: {remainingPercentage.toFixed(2)}%</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={!formData.targetName.trim() || !formData.percentage || parseFloat(formData.percentage) <= 0}
              >
                {editingId ? "Save" : <><Plus className="mr-2 h-4 w-4" />Add</>}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <div className="space-y-2 border-t pt-4">
            <h3 className="font-semibold">Investment Targets</h3>
            {mergedInvestments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No investment targets yet</p>
            ) : (
              <div className="space-y-2">
                {mergedInvestments.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{inv.targetName}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${inv.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{inv.percentage}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(investments.find(i => i.targetName === inv.targetName)!)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(investments.find(i => i.targetName === inv.targetName)!.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
