import { Currency } from '../../types/networth';
import { formatCurrency } from '../../utils/currency';

interface Props {
  targetReachedMonth: number | null;
  requiredSurplus: number | null;
  monthlyIncome: number;
  displayCurrency: Currency;
}

export function SummaryCard({ targetReachedMonth, requiredSurplus, monthlyIncome, displayCurrency }: Props) {
  const targetDate = targetReachedMonth != null
    ? new Date(Date.now() + targetReachedMonth * 30.44 * 24 * 60 * 60 * 1000)
    : null;

  const spendingCeiling = requiredSurplus != null ? monthlyIncome - requiredSurplus : null;
  const notReachable = requiredSurplus != null && requiredSurplus > monthlyIncome;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-xs text-gray-400 mb-1">Projected Target Date</div>
        {targetDate ? (
          <div className="text-base font-semibold text-gray-900">
            {targetDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Over 45 years</div>
        )}
      </div>

      {requiredSurplus != null && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-400 mb-1">Required Monthly Savings</div>
            {notReachable ? (
              <div className="text-sm text-red-500 font-medium">Exceeds income</div>
            ) : (
              <div className="text-base font-semibold text-gray-900">
                {formatCurrency(requiredSurplus, displayCurrency)}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-400 mb-1">Comfortable Monthly Spend</div>
            {notReachable ? (
              <p className="text-xs text-red-500">Target not reachable by this date with current income.</p>
            ) : (
              <div className="text-base font-semibold text-green-600">
                {spendingCeiling != null && formatCurrency(Math.max(0, spendingCeiling), displayCurrency)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
