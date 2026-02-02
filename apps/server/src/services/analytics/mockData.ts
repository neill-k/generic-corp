/**
 * Mock Analytics Data Service
 *
 * Generates realistic, consistent mock data for analytics dashboard demo
 * All data tells a coherent story: multi-provider routing saves 50-65% on costs
 *
 * @author Graham "Gray" Sutton
 * @date 2026-01-26
 */

export interface CostSavingsResponse {
  summary: {
    total_savings_usd: number;
    total_cost_usd: number;
    baseline_cost_usd: number;
    savings_percentage: number;
    period: string;
    period_start: string;
    period_end: string;
  };
  comparison: {
    previous_period_savings_usd: number;
    change_percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  projection: {
    annual_savings_estimate_usd: number;
    confidence: 'high' | 'medium' | 'low';
  };
  metadata: {
    computed_at: string;
    cached: boolean;
    computation_time_ms: number;
  };
}

export interface ProviderComparisonResponse {
  providers: Array<{
    provider: string;
    display_name: string;
    total_cost_usd: number;
    cost_percentage: number;
    total_requests: number;
    requests_percentage: number;
    avg_cost_per_request_usd: number;
    tasks_handled: number;
    task_types: string[];
    success_rate: number;
    avg_latency_ms: number;
  }>;
  totals: {
    total_cost_usd: number;
    total_requests: number;
    total_tasks: number;
    avg_success_rate: number;
  };
  insights: Array<{
    type: 'optimization' | 'performance' | 'cost';
    message: string;
    potential_savings_usd?: number;
    impact?: 'high' | 'medium' | 'low';
  }>;
  metadata: {
    period: string;
    period_start: string;
    period_end: string;
    computed_at: string;
  };
}

export interface UsageMetricsResponse {
  summary: {
    total_api_calls: number;
    successful_calls: number;
    failed_calls: number;
    success_rate_percentage: number;
    total_tokens_consumed: number;
    total_tasks_completed: number;
    avg_task_duration_ms: number;
  };
  time_series: Array<{
    timestamp: string;
    api_calls: number;
    successful_calls: number;
    failed_calls: number;
    tokens_consumed: number;
    tasks_completed: number;
    avg_latency_ms: number;
  }>;
  error_breakdown: Array<{
    error_type: string;
    count: number;
    percentage: number;
    providers_affected: string[];
  }>;
  metadata: {
    granularity: string;
    data_points: number;
    period_start: string;
    period_end: string;
  };
}

export interface TrendsResponse {
  historical: Array<{
    month: string;
    actual_cost_usd: number;
    baseline_cost_usd: number;
    savings_usd: number;
    savings_percentage: number;
    tasks_completed: number;
  }>;
  projection: {
    next_month: {
      month: string;
      estimated_cost_usd: number;
      estimated_savings_usd: number;
      confidence_interval: {
        low: number;
        high: number;
      };
    };
    annual: {
      estimated_cost_usd: number;
      estimated_savings_usd: number;
      estimated_baseline_usd: number;
    };
  };
  insights: Array<{
    type: 'trend' | 'efficiency' | 'cost';
    message: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  metadata: {
    months_included: number;
    projection_model: string;
    computed_at: string;
  };
}

export interface TaskTypesResponse {
  task_types: Array<{
    task_type: string;
    display_name: string;
    count: number;
    percentage_of_total: number;
    total_cost_usd: number;
    avg_cost_usd: number;
    total_savings_usd: number;
    optimal_provider: string;
    avg_duration_ms: number;
    success_rate: number;
  }>;
  totals: {
    total_tasks: number;
    total_cost_usd: number;
    total_savings_usd: number;
  };
  metadata: {
    period: string;
    period_start: string;
    period_end: string;
  };
}

export interface RealtimeResponse {
  today: {
    date: string;
    current_savings_usd: number;
    current_cost_usd: number;
    baseline_cost_usd: number;
    api_calls: number;
    tasks_completed: number;
    active_sessions: number;
    avg_latency_ms: number;
  };
  live_stats: {
    last_5_minutes: {
      api_calls: number;
      avg_latency_ms: number;
      errors: number;
    };
    last_hour: {
      api_calls: number;
      tasks_completed: number;
      cost_usd: number;
      savings_usd: number;
    };
  };
  recent_tasks: Array<{
    task_id: string;
    task_type: string;
    provider: string;
    status: 'completed' | 'in_progress' | 'failed';
    duration_ms?: number;
    cost_usd?: number;
    savings_usd?: number;
    completed_at?: string;
    started_at?: string;
  }>;
  metadata: {
    computed_at: string;
    auto_refresh_seconds: number;
  };
}

// Helper function to generate consistent dates
function getPeriodDates(period: string = 'month'): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  let start: Date;
  switch (period) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      start = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'quarter':
      start = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'year':
      start = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case 'month':
    default:
      start = new Date(now.setMonth(now.getMonth() - 1));
  }

  return {
    start: start.toISOString(),
    end,
  };
}

/**
 * Generate mock cost savings data
 */
export function getMockCostSavings(params: { period?: string } = {}): CostSavingsResponse {
  const { period = 'month' } = params;
  const dates = getPeriodDates(period);

  return {
    summary: {
      total_savings_usd: 47382.45,
      total_cost_usd: 28560.22,
      baseline_cost_usd: 75942.67,
      savings_percentage: 62.4,
      period,
      period_start: dates.start,
      period_end: dates.end,
    },
    comparison: {
      previous_period_savings_usd: 34120.00,
      change_percentage: 38.9,
      trend: 'up',
    },
    projection: {
      annual_savings_estimate_usd: 568589.40,
      confidence: 'high',
    },
    metadata: {
      computed_at: new Date().toISOString(),
      cached: false,
      computation_time_ms: 45,
    },
  };
}

/**
 * Generate mock provider comparison data
 */
export function getMockProviderComparison(params: { period?: string } = {}): ProviderComparisonResponse {
  const { period = 'month' } = params;
  const dates = getPeriodDates(period);

  return {
    providers: [
      {
        provider: 'openai',
        display_name: 'OpenAI (GPT-4 & Codex)',
        total_cost_usd: 12450.30,
        cost_percentage: 43.6,
        total_requests: 8542,
        requests_percentage: 38.2,
        avg_cost_per_request_usd: 1.46,
        tasks_handled: 3421,
        task_types: ['bug_fix', 'code_review', 'refactoring'],
        success_rate: 98.4,
        avg_latency_ms: 1234,
      },
      {
        provider: 'anthropic',
        display_name: 'Anthropic (Claude)',
        total_cost_usd: 9800.50,
        cost_percentage: 34.3,
        total_requests: 10234,
        requests_percentage: 45.7,
        avg_cost_per_request_usd: 0.96,
        tasks_handled: 4789,
        task_types: ['code_completion', 'documentation', 'test_generation'],
        success_rate: 99.2,
        avg_latency_ms: 987,
      },
      {
        provider: 'github_copilot',
        display_name: 'GitHub Copilot',
        total_cost_usd: 6309.42,
        cost_percentage: 22.1,
        total_requests: 3600,
        requests_percentage: 16.1,
        avg_cost_per_request_usd: 1.75,
        tasks_handled: 1890,
        task_types: ['autocomplete', 'inline_suggestions'],
        success_rate: 97.1,
        avg_latency_ms: 456,
      },
    ],
    totals: {
      total_cost_usd: 28560.22,
      total_requests: 22376,
      total_tasks: 10100,
      avg_success_rate: 98.2,
    },
    insights: [
      {
        type: 'optimization',
        message: 'Anthropic Claude handles 47% of requests at 34% lower cost. Consider routing more tasks there.',
        potential_savings_usd: 3420.00,
      },
      {
        type: 'performance',
        message: 'GitHub Copilot has 2.7x faster response times for autocomplete tasks.',
        impact: 'high',
      },
    ],
    metadata: {
      period,
      period_start: dates.start,
      period_end: dates.end,
      computed_at: new Date().toISOString(),
    },
  };
}

/**
 * Generate mock usage metrics data
 */
export function getMockUsageMetrics(params: { period?: string; granularity?: string } = {}): UsageMetricsResponse {
  const { period = 'month', granularity = 'day' } = params;
  const dates = getPeriodDates(period);

  // Generate time series data points
  const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 31 : 1;
  const time_series = Array.from({ length: daysInPeriod }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (daysInPeriod - i - 1));

    return {
      timestamp: date.toISOString(),
      api_calls: 1500 + Math.floor(Math.random() * 700),
      successful_calls: 1470 + Math.floor(Math.random() * 680),
      failed_calls: 20 + Math.floor(Math.random() * 40),
      tokens_consumed: 3000000 + Math.floor(Math.random() * 1500000),
      tasks_completed: 650 + Math.floor(Math.random() * 300),
      avg_latency_ms: 1100 + Math.floor(Math.random() * 300),
    };
  });

  const totalCalls = time_series.reduce((sum, d) => sum + d.api_calls, 0);
  const successfulCalls = time_series.reduce((sum, d) => sum + d.successful_calls, 0);

  return {
    summary: {
      total_api_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: totalCalls - successfulCalls,
      success_rate_percentage: (successfulCalls / totalCalls) * 100,
      total_tokens_consumed: 45892340,
      total_tasks_completed: 10100,
      avg_task_duration_ms: 2340,
    },
    time_series: time_series.slice(0, 10), // Return last 10 days for demo
    error_breakdown: [
      {
        error_type: 'rate_limit',
        count: 234,
        percentage: 60.2,
        providers_affected: ['openai'],
      },
      {
        error_type: 'timeout',
        count: 98,
        percentage: 25.2,
        providers_affected: ['github_copilot'],
      },
      {
        error_type: 'auth_failure',
        count: 57,
        percentage: 14.6,
        providers_affected: ['anthropic', 'openai'],
      },
    ],
    metadata: {
      granularity,
      data_points: time_series.length,
      period_start: dates.start,
      period_end: dates.end,
    },
  };
}

/**
 * Generate mock trends data
 */
export function getMockTrends(params: { months?: number } = {}): TrendsResponse {
  const { months = 6 } = params;

  // Generate historical data showing improving savings
  const historical = Array.from({ length: months }, (_, i) => {
    const monthsAgo = months - i - 1;
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    const monthStr = date.toISOString().slice(0, 7);

    // Simulate improving efficiency over time
    const baselineCost = 55000 + monthsAgo * 2000 + Math.random() * 5000;
    const savingsPercent = 40 + (months - monthsAgo) * 3 + Math.random() * 5;
    const actualCost = baselineCost * (1 - savingsPercent / 100);

    return {
      month: monthStr,
      actual_cost_usd: Math.round(actualCost),
      baseline_cost_usd: Math.round(baselineCost),
      savings_usd: Math.round(baselineCost - actualCost),
      savings_percentage: Math.round(savingsPercent * 10) / 10,
      tasks_completed: 8500 + Math.floor(Math.random() * 2000),
    };
  });

  return {
    historical,
    projection: {
      next_month: {
        month: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7),
        estimated_cost_usd: 27800.00,
        estimated_savings_usd: 51200.00,
        confidence_interval: {
          low: 25000.00,
          high: 30000.00,
        },
      },
      annual: {
        estimated_cost_usd: 342000.00,
        estimated_savings_usd: 568590.00,
        estimated_baseline_usd: 910590.00,
      },
    },
    insights: [
      {
        type: 'trend',
        message: 'Savings percentage improved 17.5 points over 6 months',
        impact: 'positive',
      },
      {
        type: 'efficiency',
        message: 'Cost per task decreased by 23% while handling 13% more tasks',
        impact: 'positive',
      },
    ],
    metadata: {
      months_included: months,
      projection_model: 'linear_regression',
      computed_at: new Date().toISOString(),
    },
  };
}

/**
 * Generate mock task types data
 */
export function getMockTaskTypes(params: { period?: string } = {}): TaskTypesResponse {
  const { period = 'month' } = params;
  const dates = getPeriodDates(period);

  return {
    task_types: [
      {
        task_type: 'code_completion',
        display_name: 'Code Completion',
        count: 4234,
        percentage_of_total: 41.9,
        total_cost_usd: 8940.50,
        avg_cost_usd: 2.11,
        total_savings_usd: 19234.00,
        optimal_provider: 'anthropic',
        avg_duration_ms: 456,
        success_rate: 99.4,
      },
      {
        task_type: 'bug_fix',
        display_name: 'Bug Fixing',
        count: 2145,
        percentage_of_total: 21.2,
        total_cost_usd: 7890.30,
        avg_cost_usd: 3.68,
        total_savings_usd: 8234.00,
        optimal_provider: 'openai',
        avg_duration_ms: 3456,
        success_rate: 97.8,
      },
      {
        task_type: 'refactoring',
        display_name: 'Code Refactoring',
        count: 1567,
        percentage_of_total: 15.5,
        total_cost_usd: 5678.40,
        avg_cost_usd: 3.62,
        total_savings_usd: 7123.00,
        optimal_provider: 'openai',
        avg_duration_ms: 4567,
        success_rate: 98.2,
      },
      {
        task_type: 'test_generation',
        display_name: 'Test Generation',
        count: 1234,
        percentage_of_total: 12.2,
        total_cost_usd: 3456.20,
        avg_cost_usd: 2.80,
        total_savings_usd: 6234.00,
        optimal_provider: 'anthropic',
        avg_duration_ms: 2345,
        success_rate: 99.1,
      },
      {
        task_type: 'documentation',
        display_name: 'Documentation',
        count: 920,
        percentage_of_total: 9.1,
        total_cost_usd: 2594.82,
        avg_cost_usd: 2.82,
        total_savings_usd: 6557.45,
        optimal_provider: 'anthropic',
        avg_duration_ms: 1890,
        success_rate: 99.6,
      },
    ],
    totals: {
      total_tasks: 10100,
      total_cost_usd: 28560.22,
      total_savings_usd: 47382.45,
    },
    metadata: {
      period,
      period_start: dates.start,
      period_end: dates.end,
    },
  };
}

/**
 * Generate mock realtime data
 */
export function getMockRealtime(): RealtimeResponse {
  const today = new Date().toISOString().slice(0, 10);

  return {
    today: {
      date: today,
      current_savings_usd: 2134.56,
      current_cost_usd: 1245.80,
      baseline_cost_usd: 3380.36,
      api_calls: 456,
      tasks_completed: 189,
      active_sessions: 12,
      avg_latency_ms: 1123,
    },
    live_stats: {
      last_5_minutes: {
        api_calls: 23,
        avg_latency_ms: 987,
        errors: 0,
      },
      last_hour: {
        api_calls: 234,
        tasks_completed: 87,
        cost_usd: 123.45,
        savings_usd: 189.23,
      },
    },
    recent_tasks: [
      {
        task_id: 'task_abc123',
        task_type: 'bug_fix',
        provider: 'openai',
        status: 'completed',
        duration_ms: 3456,
        cost_usd: 4.23,
        savings_usd: 2.34,
        completed_at: new Date(Date.now() - 120000).toISOString(),
      },
      {
        task_id: 'task_def456',
        task_type: 'code_completion',
        provider: 'anthropic',
        status: 'in_progress',
        started_at: new Date(Date.now() - 30000).toISOString(),
      },
      {
        task_id: 'task_ghi789',
        task_type: 'test_generation',
        provider: 'anthropic',
        status: 'completed',
        duration_ms: 2345,
        cost_usd: 2.80,
        savings_usd: 3.12,
        completed_at: new Date(Date.now() - 300000).toISOString(),
      },
    ],
    metadata: {
      computed_at: new Date().toISOString(),
      auto_refresh_seconds: 30,
    },
  };
}
