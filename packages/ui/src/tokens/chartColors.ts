export const chartColors = {
  primary:     '#3b82f6',
  success:     '#10b981',
  warning:     '#f59e0b',
  danger:      '#ef4444',
  purple:      '#8b5cf6',
  cyan:        '#06b6d4',
  orange:      '#f97316',
  indigo:      '#6366f1',
  lime:        '#84cc16',
  pink:        '#ec4899',

  // Net worth asset categories
  bank:        '#3b82f6',
  cpf:         '#06b6d4',
  cpfis:       '#0891b2',
  retirement:  '#8b5cf6',
  stock:       '#22c55e',
  etf:         '#16a34a',
  mutualfund:  '#f97316',
  crypto:      '#f59e0b',
  metal:       '#d97706',
  property:    '#6366f1',
  other:       '#94a3b8',
} as const;

export const chartColorArray: string[] = [
  chartColors.primary,
  chartColors.success,
  chartColors.warning,
  chartColors.purple,
  chartColors.cyan,
  chartColors.orange,
  chartColors.danger,
  chartColors.indigo,
  chartColors.lime,
  chartColors.pink,
];
