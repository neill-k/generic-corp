/**
 * Analytics API Routes
 *
 * REST endpoints for cost savings analytics dashboard
 * Phase 1: Mock data for UI development
 * Phase 2: Real database queries (Day 2-3)
 *
 * @author Graham "Gray" Sutton
 * @date 2026-01-26
 */

import { Router, type Request, type Response } from 'express';
import {
  getMockCostSavings,
  getMockProviderComparison,
  getMockUsageMetrics,
  getMockTrends,
  getMockTaskTypes,
  getMockRealtime,
} from '../services/analytics/mockData.js';

const router = Router();

/**
 * GET /api/analytics/cost-savings
 *
 * Returns total cost savings summary with projections
 */
router.get('/cost-savings', (_req: Request, res: Response) => {
  try {
    const { period = 'month' } = _req.query;

    // Validate period parameter
    const validPeriods = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
    if (typeof period === 'string' && !validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Invalid period parameter. Must be one of: ${validPeriods.join(', ')}`,
        field: 'period',
        timestamp: new Date().toISOString(),
      });
    }

    const data = getMockCostSavings({ period: period as string });
    res.json(data);
  } catch (error) {
    console.error('[Analytics API] Error in /cost-savings:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to compute cost savings',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/analytics/providers/comparison
 *
 * Returns provider-by-provider cost and performance comparison
 */
router.get('/providers/comparison', (_req: Request, res: Response) => {
  try {
    const { period = 'month', metric = 'cost' } = _req.query;

    // Validate parameters
    const validPeriods = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
    if (typeof period === 'string' && !validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Invalid period parameter. Must be one of: ${validPeriods.join(', ')}`,
        field: 'period',
        timestamp: new Date().toISOString(),
      });
    }

    const validMetrics = ['cost', 'usage', 'performance'];
    if (typeof metric === 'string' && !validMetrics.includes(metric)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Invalid metric parameter. Must be one of: ${validMetrics.join(', ')}`,
        field: 'metric',
        timestamp: new Date().toISOString(),
      });
    }

    const data = getMockProviderComparison({ period: period as string });
    res.json(data);
  } catch (error) {
    console.error('[Analytics API] Error in /providers/comparison:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to compute provider comparison',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/analytics/usage-metrics
 *
 * Returns API call metrics, token usage, and error rates
 */
router.get('/usage-metrics', (_req: Request, res: Response) => {
  try {
    const { period = 'month', granularity = 'day', provider } = _req.query;

    // Validate parameters
    const validPeriods = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
    if (typeof period === 'string' && !validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Invalid period parameter. Must be one of: ${validPeriods.join(', ')}`,
        field: 'period',
        timestamp: new Date().toISOString(),
      });
    }

    const validGranularities = ['hour', 'day', 'week'];
    if (typeof granularity === 'string' && !validGranularities.includes(granularity)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Invalid granularity parameter. Must be one of: ${validGranularities.join(', ')}`,
        field: 'granularity',
        timestamp: new Date().toISOString(),
      });
    }

    const data = getMockUsageMetrics({
      period: period as string,
      granularity: granularity as string,
    });

    // Filter by provider if specified
    if (provider && typeof provider === 'string') {
      // In Phase 2, we'll implement actual filtering
      // For now, just return all data
    }

    res.json(data);
  } catch (error) {
    console.error('[Analytics API] Error in /usage-metrics:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to compute usage metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/analytics/trends
 *
 * Returns historical trends and future projections
 */
router.get('/trends', (_req: Request, res: Response) => {
  try {
    const { months = '6', include_projection = 'true' } = _req.query;

    // Validate months parameter
    const monthsNum = parseInt(months as string, 10);
    if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 12) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid months parameter. Must be between 1 and 12',
        field: 'months',
        timestamp: new Date().toISOString(),
      });
    }

    const data = getMockTrends({ months: monthsNum });

    // Optionally remove projection if not requested
    if (include_projection === 'false') {
      delete (data as any).projection;
    }

    res.json(data);
  } catch (error) {
    console.error('[Analytics API] Error in /trends:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to compute trends',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/analytics/task-types
 *
 * Returns breakdown of costs and performance by task type
 */
router.get('/task-types', (_req: Request, res: Response) => {
  try {
    const { period = 'month', sort_by = 'volume' } = _req.query;

    // Validate parameters
    const validPeriods = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
    if (typeof period === 'string' && !validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Invalid period parameter. Must be one of: ${validPeriods.join(', ')}`,
        field: 'period',
        timestamp: new Date().toISOString(),
      });
    }

    const validSortOptions = ['volume', 'cost', 'savings'];
    if (typeof sort_by === 'string' && !validSortOptions.includes(sort_by)) {
      return res.status(400).json({
        error: 'validation_error',
        message: `Invalid sort_by parameter. Must be one of: ${validSortOptions.join(', ')}`,
        field: 'sort_by',
        timestamp: new Date().toISOString(),
      });
    }

    const data = getMockTaskTypes({ period: period as string });

    // Sort based on sort_by parameter
    if (sort_by === 'cost') {
      data.task_types.sort((a, b) => b.total_cost_usd - a.total_cost_usd);
    } else if (sort_by === 'savings') {
      data.task_types.sort((a, b) => b.total_savings_usd - a.total_savings_usd);
    }
    // Default is already sorted by volume in mock data

    res.json(data);
  } catch (error) {
    console.error('[Analytics API] Error in /task-types:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to compute task type analytics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/analytics/realtime
 *
 * Returns real-time metrics for today's activity
 */
router.get('/realtime', (_req: Request, res: Response) => {
  try {
    const data = getMockRealtime();
    res.json(data);
  } catch (error) {
    console.error('[Analytics API] Error in /realtime:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch realtime metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/analytics/health
 *
 * Health check endpoint for analytics API
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'analytics-api',
    version: '1.0.0',
    mode: 'mock_data',
    timestamp: new Date().toISOString(),
  });
});

export default router;
