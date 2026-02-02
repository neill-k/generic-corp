import type { CostSummaryResponse, UsageMetricsResponse, ProviderPerformanceResponse } from '../types/analytics';

// Mock Cost Summary Data
export const mockCostSummary: CostSummaryResponse = {
  actualCost: 47382.45,
  baselineCost: 75428.00,
  savings: 28045.55,
  savingsPercent: 37.2,
  breakdown: [
    { provider: 'OpenAI Codex', cost: 28046.23, calls: 8542 },
    { provider: 'GitHub Copilot', cost: 14223.11, calls: 12847 },
    { provider: 'Google Code Assist', cost: 5113.11, calls: 3421 },
  ],
};

// Mock Usage Metrics Data (30 days)
export const mockUsageMetrics: UsageMetricsResponse = {
  metrics: generateMockMetrics(30),
};

function generateMockMetrics(days: number) {
  const metrics = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate realistic data with some variance
    const baseApiCalls = 300 + Math.random() * 200;
    const baseTasksCompleted = Math.floor(baseApiCalls * 0.15);
    const baseCost = 1200 + Math.random() * 800;

    metrics.push({
      date: date.toISOString().split('T')[0],
      tasksCompleted: baseTasksCompleted,
      apiCalls: Math.floor(baseApiCalls),
      cost: Math.round(baseCost * 100) / 100,
      avgLatency: Math.floor(1000 + Math.random() * 500),
    });
  }

  return metrics;
}

// Mock Provider Performance Data
export const mockProviderPerformance: ProviderPerformanceResponse = {
  providers: [
    {
      provider: 'OpenAI Codex',
      avgLatency: 987,
      successRate: 0.984,
      costPerTask: 3.28,
      optimalForTasks: ['bug_fix', 'refactor', 'code_review'],
    },
    {
      provider: 'GitHub Copilot',
      avgLatency: 542,
      successRate: 0.991,
      costPerTask: 1.11,
      optimalForTasks: ['autocomplete', 'simple_functions', 'boilerplate'],
    },
    {
      provider: 'Google Code Assist',
      avgLatency: 1234,
      successRate: 0.972,
      costPerTask: 1.49,
      optimalForTasks: ['documentation', 'testing', 'comments'],
    },
  ],
};

// Calculate derived metrics for Key Metrics Cards
export const mockKeyMetrics = {
  totalApiCalls: mockUsageMetrics.metrics.reduce((sum, m) => sum + m.apiCalls, 0),
  totalTokens: mockKeyMetrics?.totalApiCalls ? Math.floor(mockKeyMetrics.totalApiCalls * 275.5) : 4200000, // rough estimate
  avgLatency: Math.floor(
    mockUsageMetrics.metrics.reduce((sum, m) => sum + m.avgLatency, 0) /
    mockUsageMetrics.metrics.length
  ),
  successRate: 98.4,

  // Trends (comparison to previous period)
  apiCallsTrend: 12,
  tokensTrend: 18,
  latencyTrend: -5,
  successRateTrend: 0.2,
};
