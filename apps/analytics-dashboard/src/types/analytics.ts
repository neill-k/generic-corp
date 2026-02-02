// API Response Types (matching Graham's backend design)

export interface CostSummaryResponse {
  actualCost: number;
  baselineCost: number;
  savings: number;
  savingsPercent: number;
  breakdown: ProviderBreakdown[];
}

export interface ProviderBreakdown {
  provider: string;
  cost: number;
  calls: number;
}

export interface UsageMetricsResponse {
  metrics: DailyMetric[];
}

export interface DailyMetric {
  date: string;              // "2026-01-26"
  tasksCompleted: number;
  apiCalls: number;
  cost: number;
  avgLatency: number;
}

export interface ProviderPerformanceResponse {
  providers: ProviderPerformance[];
}

export interface ProviderPerformance {
  provider: string;
  avgLatency: number;
  successRate: number;
  costPerTask: number;
  optimalForTasks: string[];
}

// UI Component Types

export interface TimePeriod {
  label: string;
  days: number;
}

export const TIME_PERIODS: TimePeriod[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
];
