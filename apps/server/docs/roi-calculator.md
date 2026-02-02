# ROI Calculator - Multi-Provider AI Orchestration Platform

**Author:** Graham "Gray" Sutton
**Date:** 2026-01-26
**Purpose:** Calculate customer cost savings and ROI for sales conversations

## Current Provider Pricing (2026)

### OpenAI (GPT Models)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| GPT-4 Turbo | $10.00 | $30.00 |
| GPT-4 | $30.00 | $60.00 |
| GPT-3.5 Turbo | $0.50 | $1.50 |
| GPT-4o | $5.00 | $15.00 |

### Anthropic (Claude Models)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude 3 Opus | $15.00 | $75.00 |
| Claude 3 Sonnet | $3.00 | $15.00 |
| Claude 3 Haiku | $0.25 | $1.25 |

### GitHub Copilot

| Tier | Cost | Notes |
|------|------|-------|
| Individual | $10/user/month | Fixed pricing, unlimited usage |
| Business | $19/user/month | Fixed pricing, unlimited usage |

### Google Code Assist

| Tier | Cost | Notes |
|------|------|-------|
| Standard | $19/user/month | Fixed pricing |

## ROI Calculation Methodology

### Scenario 1: Token-Based API Usage (OpenAI/Anthropic)

**Customer Profile:**
- 50 developers
- Each developer makes ~200 AI requests/day
- Average request: 1,500 input tokens, 500 output tokens
- Working days: 22/month

**Current State (Single Provider - GPT-4 Turbo):**

```
Monthly Requests = 50 devs × 200 requests/day × 22 days = 220,000 requests

Input Tokens = 220,000 × 1,500 = 330M tokens
Output Tokens = 220,000 × 500 = 110M tokens

Input Cost = 330M ÷ 1M × $10 = $3,300
Output Cost = 110M ÷ 1M × $30 = $3,300

Total Monthly Cost = $6,600
Total Annual Cost = $79,200
```

**With Our Platform (Intelligent Routing):**

Routing Strategy:
- 40% of requests route to Claude 3 Sonnet (cheaper, similar quality)
- 30% route to GPT-3.5 Turbo (simple tasks)
- 30% stay on GPT-4 Turbo (complex tasks)

```
GPT-4 Turbo (30% = 66,000 requests):
  Input: 99M tokens × $10 = $990
  Output: 33M tokens × $30 = $990
  Subtotal: $1,980

Claude 3 Sonnet (40% = 88,000 requests):
  Input: 132M tokens × $3 = $396
  Output: 44M tokens × $15 = $660
  Subtotal: $1,056

GPT-3.5 Turbo (30% = 66,000 requests):
  Input: 99M tokens × $0.50 = $49.50
  Output: 33M tokens × $1.50 = $49.50
  Subtotal: $99

Total Monthly Cost with Platform = $3,135
Monthly Savings = $6,600 - $3,135 = $3,465
Annual Savings = $41,580

Platform Cost (Team Tier @ $49/dev/month):
  Monthly: 50 × $49 = $2,450
  Annual: $29,400

Net Annual Savings = $41,580 - $29,400 = $12,180
ROI = ($41,580 - $29,400) ÷ $29,400 = 41.4%
Payback Period = 0.71 months (~3 weeks)
```

### Scenario 2: Hybrid Usage (APIs + Fixed-Price Tools)

**Customer Profile:**
- 100 developers
- Currently using GitHub Copilot Business ($19/user/month)
- Also using GPT-4 API for complex tasks (50,000 requests/month)

**Current State:**

```
GitHub Copilot Business: 100 × $19 = $1,900/month

GPT-4 API Usage:
  50,000 requests × 2,000 input tokens = 100M input tokens
  50,000 requests × 800 output tokens = 40M output tokens
  Input Cost: 100M ÷ 1M × $30 = $3,000
  Output Cost: 40M ÷ 1M × $60 = $2,400
  API Cost: $5,400/month

Total Monthly Cost = $1,900 + $5,400 = $7,300
Total Annual Cost = $87,600
```

**With Our Platform:**

Intelligent routing reduces API calls by 60% (use Copilot more effectively):

```
GitHub Copilot (unchanged): $1,900/month

Optimized API Usage (40% of original = 20,000 requests):
  Mixed routing:
    - 50% Claude 3 Sonnet
    - 30% GPT-4 Turbo
    - 20% GPT-3.5 Turbo

  Claude Sonnet (10,000 requests):
    Input: 20M × $3 = $60
    Output: 8M × $15 = $120
    Subtotal: $180

  GPT-4 Turbo (6,000 requests):
    Input: 12M × $10 = $120
    Output: 4.8M × $30 = $144
    Subtotal: $264

  GPT-3.5 Turbo (4,000 requests):
    Input: 8M × $0.50 = $4
    Output: 3.2M × $1.50 = $4.80
    Subtotal: $8.80

  Total API Cost: $452.80/month

Total with Platform = $1,900 + $452.80 = $2,352.80/month

Platform Cost (Team Tier @ $49/dev/month):
  Monthly: 100 × $49 = $4,900

Total Monthly Cost = $2,352.80 + $4,900 = $7,252.80
Monthly Savings = $7,300 - $7,252.80 = $47.20

** This scenario shows platform is cost-neutral but adds value through:
  - Better routing intelligence
  - Usage analytics and insights
  - Future cost optimization opportunities
  - Avoiding vendor lock-in
```

### Scenario 3: Enterprise Heavy Usage

**Customer Profile:**
- 500 developers
- Heavy API usage: 2M requests/month
- Currently locked into OpenAI (GPT-4)

**Current State:**

```
2M requests/month:
  Input: 2M × 2,000 = 4,000M (4B) tokens
  Output: 2M × 800 = 1,600M (1.6B) tokens

GPT-4 Costs:
  Input: 4B ÷ 1M × $30 = $120,000
  Output: 1.6B ÷ 1M × $60 = $96,000
  Total Monthly: $216,000
  Total Annual: $2,592,000
```

**With Our Platform (Aggressive Optimization):**

Routing Strategy:
- 20% GPT-4 Turbo (most complex)
- 40% Claude 3 Opus (complex but cheaper)
- 25% Claude 3 Sonnet (moderate)
- 15% Claude 3 Haiku (simple)

```
GPT-4 Turbo (20% = 400K requests):
  Input: 800M × $10 = $8,000
  Output: 320M × $30 = $9,600
  Subtotal: $17,600

Claude 3 Opus (40% = 800K requests):
  Input: 1,600M × $15 = $24,000
  Output: 640M × $75 = $48,000
  Subtotal: $72,000

Claude 3 Sonnet (25% = 500K requests):
  Input: 1,000M × $3 = $3,000
  Output: 400M × $15 = $6,000
  Subtotal: $9,000

Claude 3 Haiku (15% = 300K requests):
  Input: 600M × $0.25 = $150
  Output: 240M × $1.25 = $300
  Subtotal: $450

Total Monthly API Cost = $99,050

Platform Cost (Enterprise Tier):
  Custom pricing: $500/month base + $39/dev for first 100 devs
  = $500 + (100 × $39) + (400 × negotiated rate ~$25)
  = $500 + $3,900 + $10,000 = $14,400/month

Total Monthly Cost = $99,050 + $14,400 = $113,450
Monthly Savings = $216,000 - $113,450 = $102,550
Annual Savings = $1,230,600

ROI = ($1,230,600 - $172,800) ÷ $172,800 = 612%
Payback Period = 0.14 months (~4 days!)
```

## Interactive ROI Calculator Template

### Input Variables

```javascript
const roiCalculator = {
  // Customer inputs
  numberOfDevelopers: 50,
  requestsPerDevPerDay: 200,
  workingDaysPerMonth: 22,
  avgInputTokens: 1500,
  avgOutputTokens: 500,

  // Current provider
  currentProvider: 'gpt-4-turbo',
  currentMonthlyCost: 0,  // Auto-calculated or manually entered

  // Optimization assumptions
  routingStrategy: {
    'gpt-4-turbo': 30,      // percentage
    'claude-3-sonnet': 40,
    'gpt-3.5-turbo': 30
  },

  // Platform pricing tier
  pricingTier: 'team',  // 'team', 'pro', 'enterprise'

  // Calculate
  calculate() {
    // Monthly requests
    const monthlyRequests =
      this.numberOfDevelopers *
      this.requestsPerDevPerDay *
      this.workingDaysPerMonth;

    // Current cost calculation
    const currentCost = this.calculateProviderCost(
      this.currentProvider,
      monthlyRequests,
      this.avgInputTokens,
      this.avgOutputTokens
    );

    // Optimized cost with routing
    const optimizedCost = this.calculateOptimizedCost(
      monthlyRequests,
      this.avgInputTokens,
      this.avgOutputTokens,
      this.routingStrategy
    );

    // Platform cost
    const platformCost = this.calculatePlatformCost(
      this.numberOfDevelopers,
      this.pricingTier
    );

    // ROI metrics
    const monthlySavings = currentCost - optimizedCost;
    const netMonthlySavings = monthlySavings - platformCost;
    const annualSavings = netMonthlySavings * 12;
    const roi = (annualSavings / (platformCost * 12)) * 100;
    const paybackMonths = platformCost / monthlySavings;

    return {
      monthlyRequests,
      currentCost,
      optimizedCost,
      platformCost,
      monthlySavings,
      netMonthlySavings,
      annualSavings,
      roi,
      paybackMonths
    };
  }
};
```

## Real-World Value Propositions

### For Small Teams (10-50 devs)
- **Focus**: Simplicity + Cost Control
- **Savings**: $500-$3,500/month
- **ROI**: 30-50%
- **Pitch**: "Stop overpaying for AI. Smart routing saves you thousands."

### For Mid-Market (50-200 devs)
- **Focus**: Multi-provider flexibility + Analytics
- **Savings**: $3,500-$15,000/month
- **ROI**: 40-80%
- **Pitch**: "Break free from vendor lock-in while cutting costs in half."

### For Enterprise (200+ devs)
- **Focus**: Scale + Compliance + Strategic Control
- **Savings**: $15,000-$100,000+/month
- **ROI**: 100-600%
- **Pitch**: "Enterprise-grade AI orchestration with six-figure annual savings."

## Dashboard Metrics

The cost savings dashboard will display:

1. **Real-Time Savings Counter**: "You've saved $X,XXX this month"
2. **Cost Comparison Chart**: Current vs. what you would have paid
3. **Routing Efficiency**: % of requests optimally routed
4. **Provider Performance**: Latency, success rate, cost per provider
5. **ROI Timeline**: Visual payback period and cumulative savings

## Next Steps

- [ ] Build interactive calculator UI component
- [ ] Create API endpoint for cost calculations
- [ ] Generate customer-specific ROI reports
- [ ] A/B test messaging with beta customers
