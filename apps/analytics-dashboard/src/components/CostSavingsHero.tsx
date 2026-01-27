import type { CostSummaryResponse } from '../types/analytics';

interface CostSavingsHeroProps {
  data: CostSummaryResponse;
}

export function CostSavingsHero({ data }: CostSavingsHeroProps) {
  const { savings, savingsPercent, actualCost, baselineCost } = data;

  // Determine color based on savings percentage
  const getSavingsColor = (percent: number) => {
    if (percent >= 20) return 'text-success';
    if (percent >= 10) return 'text-warning';
    return 'text-danger';
  };

  const getProgressBarColor = (percent: number) => {
    if (percent >= 20) return 'bg-success';
    if (percent >= 10) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
      {/* Big Savings Number */}
      <div className="mb-4">
        <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          Total Savings This Month
        </div>
        <div className={`text-7xl font-bold ${getSavingsColor(savingsPercent)}`}>
          ${savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Percentage Savings */}
      <div className="mb-4">
        <div className={`text-5xl font-semibold ${getSavingsColor(savingsPercent)}`}>
          {savingsPercent.toFixed(1)}% cost reduction
        </div>
      </div>

      {/* Comparison Text */}
      <div className="text-lg text-gray-600 dark:text-gray-400 mb-6">
        vs. using only OpenAI{' '}
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          ($
          {baselineCost.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          baseline)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressBarColor(savingsPercent)} transition-all duration-500 ease-out flex items-center justify-end pr-3`}
            style={{ width: `${savingsPercent}%` }}
          >
            <span className="text-sm font-bold text-white">
              {savingsPercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Actual: $
            {actualCost.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span>
            Baseline: $
            {baselineCost.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* How We Calculate This - Transparency */}
      <details className="mt-6">
        <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          How do we calculate this?
        </summary>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>Baseline Cost:</strong> What you would pay if all API calls went to
            the most expensive provider (OpenAI Codex).
          </p>
          <p>
            <strong>Actual Cost:</strong> What you actually paid with our intelligent
            routing distributing tasks across providers based on cost and performance.
          </p>
          <p>
            <strong>Savings:</strong> The difference between baseline and actual costs,
            showing the value of intelligent routing.
          </p>
        </div>
      </details>
    </div>
  );
}
