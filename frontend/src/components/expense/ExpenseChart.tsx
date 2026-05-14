import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface ChartData {
  name: string;
  value: number;
}

interface Props {
  data: ChartData[];
  currency: string;
}

export function ExpenseChart({ data, currency }: Props) {
  const symbol = currency === 'SGD' ? 'S$' : 'US$';
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${symbol}${Number(value ?? 0).toFixed(2)}`, '']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value, entry: { payload?: { value?: number } }) => {
            const pct = total > 0 ? ((entry.payload?.value ?? 0) / total * 100).toFixed(1) : '0';
            return <span style={{ fontSize: 11, color: '#6b7280' }}>{value} {pct}%</span>;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
