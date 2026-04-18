"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  TooltipProps,
} from "recharts";

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#6b7280"];

type AccountInfo = { id: string; name: string; bankName: string | null };

type Props = {
  accountTrends: Array<Record<string, number | string>>;
  accounts: AccountInfo[];
  typeBreakdown: { label: string; total: number }[];
  displayCurrency: string;
};

function AccountLineChart({
  accountTrends,
  accounts,
  displayCurrency,
}: {
  accountTrends: Array<Record<string, number | string>>;
  accounts: AccountInfo[];
  displayCurrency: string;
}) {
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set());

  const toggleAccount = (accountId: string) => {
    setHiddenAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const formatValue = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
    }).format(value);

  const accountLabel = (account: AccountInfo) =>
    account.bankName ? `${account.bankName} – ${account.name}` : account.name;

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry) => {
          const account = accounts.find((a) => a.id === entry.dataKey);
          return (
            <p key={entry.dataKey} style={{ color: entry.color }}>
              {account ? accountLabel(account) : entry.dataKey}:{" "}
              {formatValue(entry.value as number)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Account filter toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {accounts.map((account, index) => {
          const color = COLORS[index % COLORS.length];
          const hidden = hiddenAccounts.has(account.id);
          return (
            <button
              key={account.id}
              onClick={() => toggleAccount(account.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-opacity ${
                hidden ? "opacity-40" : "opacity-100"
              }`}
              style={{ borderColor: color, color }}
              aria-pressed={!hidden}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {accountLabel(account)}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={accountTrends} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                currency: displayCurrency,
                style: "currency",
              }).format(v)
            }
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          {accounts.map((account, index) =>
            !hiddenAccounts.has(account.id) ? (
              <Line
                key={account.id}
                type="monotone"
                dataKey={account.id}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

export function DashboardCharts({
  accountTrends,
  accounts,
  typeBreakdown,
  displayCurrency,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Trend by Account</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountLineChart
            accountTrends={accountTrends}
            accounts={accounts}
            displayCurrency={displayCurrency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">By Saving Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="total"
                nameKey="label"
                label={({ label, percent }) =>
                  `${label} ${(percent * 100).toFixed(0)}%`
                }
              >
                {typeBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
