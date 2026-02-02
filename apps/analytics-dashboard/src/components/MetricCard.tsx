import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: LucideIcon;
  format?: 'number' | 'percentage' | 'ms';
}

export function MetricCard({ title, value, trend, icon: Icon, format = 'number' }: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'ms':
        return `${val.toLocaleString()}ms`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const getTrendColor = (trendValue: number) => {
    // For latency, negative is good (lower is better)
    if (format === 'ms') {
      return trendValue < 0 ? 'text-success' : 'text-danger';
    }
    // For other metrics, positive is good
    return trendValue > 0 ? 'text-success' : 'text-danger';
  };

  const getTrendIcon = (trendValue: number) => {
    if (format === 'ms') {
      return trendValue < 0 ? '↓' : '↑';
    }
    return trendValue > 0 ? '↑' : '↓';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Icon and Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          {title}
        </div>
        <div className="text-primary">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Value */}
      <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {formatValue(value)}
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div className={`text-sm font-medium flex items-center gap-1 ${getTrendColor(trend)}`}>
          <span>{getTrendIcon(trend)}</span>
          <span>
            {Math.abs(trend).toFixed(1)}% vs last period
          </span>
        </div>
      )}
    </div>
  );
}
