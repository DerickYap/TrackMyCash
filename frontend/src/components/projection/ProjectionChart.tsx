import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, ReferenceDot, Legend,
} from 'recharts';
import { ProjectionPoint } from '../../types/projection';
import { Currency } from '../../types/networth';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

interface ScenarioLine {
  name: string;
  points: ProjectionPoint[];
}

interface Props {
  scenarios: ScenarioLine[];
  targetNetworth: number;
  displayCurrency: Currency;
}

function formatYAxis(value: number, currency: Currency): string {
  const symbol = currency === 'SGD' ? 'S$' : 'US$';
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}K`;
  return `${symbol}${value}`;
}

export function ProjectionChart({ scenarios, targetNetworth, displayCurrency }: Props) {
  // Merge all months across scenarios
  const maxMonths = Math.max(...scenarios.map(s => s.points.length), 1);
  const data: Record<number, Record<string, number>> = {};
  for (const scenario of scenarios) {
    for (const p of scenario.points) {
      if (!data[p.month]) data[p.month] = { month: p.month };
      data[p.month][scenario.name] = p.networth;
    }
  }
  const chartData = Object.values(data).sort((a, b) => a.month - b.month);

  // Milestones: 500K, 1M, 2M, 5M
  const milestones = [500_000, 1_000_000, 2_000_000, 5_000_000].filter(m => m < targetNetworth * 1.2);
  const firstScenario = scenarios[0];
  const milestonePoints = milestones.map(m => {
    const pt = firstScenario?.points.find(p => p.networth >= m);
    return pt ? { month: pt.month, value: m } : null;
  }).filter(Boolean) as { month: number; value: number }[];

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tickFormatter={v => `Y${Math.floor(v / 12)}`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          interval={Math.floor(maxMonths / 10)}
        />
        <YAxis
          tickFormatter={v => formatYAxis(v, displayCurrency)}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          width={70}
        />
        <Tooltip
          formatter={(value, name) => [
            `${displayCurrency === 'SGD' ? 'S$' : 'US$'}${Number(value ?? 0).toLocaleString()}`,
            String(name),
          ]}
          labelFormatter={label => `Month ${label} (Year ${Math.floor(label / 12)})`}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend />
        <ReferenceLine
          y={targetNetworth}
          stroke="#ef4444"
          strokeDasharray="6 3"
          label={{ value: 'Target', position: 'right', fontSize: 11, fill: '#ef4444' }}
        />
        {milestonePoints.map(mp => (
          <ReferenceDot
            key={mp.value}
            x={mp.month}
            y={mp.value}
            r={4}
            fill="#94a3b8"
            stroke="white"
            strokeWidth={2}
            // @ts-ignore
            label={{ value: formatYAxis(mp.value, displayCurrency), position: 'top', fontSize: 10, fill: '#94a3b8' }}
          />
        ))}
        {scenarios.map((s, i) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
