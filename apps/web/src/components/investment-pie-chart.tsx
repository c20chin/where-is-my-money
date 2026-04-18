"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type InvestmentPieChartProps = {
  investments: Array<{
    targetName: string;
    percentage: string;
  }>;
  accountName: string;
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B6B"];

export function InvestmentPieChart({ investments, accountName }: InvestmentPieChartProps) {
  // Merge duplicate stock names and sum their percentages
  const merged = investments.reduce((acc, inv) => {
    const existing = acc.find(item => item.name === inv.targetName);
    if (existing) {
      existing.value += parseFloat(inv.percentage);
    } else {
      acc.push({
        name: inv.targetName,
        value: parseFloat(inv.percentage),
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  const data = merged;

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No investment targets yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-center">{accountName}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
