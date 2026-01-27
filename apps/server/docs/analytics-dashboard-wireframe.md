# Analytics Dashboard UI - Wireframe & Design

**Author:** DeVonte Jackson, Full-Stack Developer
**Date:** 2026-01-26
**Priority:** PRIORITY 2 - Revenue Critical
**Status:** In Progress - Day 1

---

## Executive Summary

Building a customer-facing analytics dashboard that showcases cost savings from our intelligent AI routing platform. This dashboard is **the revenue engine** - when prospects see real ROI numbers, they pull out their credit card.

**Design Philosophy:** Stripe-level polish. Big, confident numbers. Executive-first.

---

## Core User Story

> "As an engineering manager, I want to see at a glance how much money I'm saving by using this platform, so I can justify the $299-999/month subscription to my CFO."

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Cost Analytics          [Dark Mode] [Export] [User]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  COST SAVINGS HERO SECTION                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  You saved $47,382 this month                        │   │
│  │  37.4% cost reduction                                │   │
│  │  vs. using only OpenAI ($75,428 baseline)            │   │
│  │                                                        │   │
│  │  [===============37.4%================░░░░░░░]        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  PROVIDER COST COMPARISON                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cost per Provider  [Last 30 days ▼]                 │   │
│  │                                                        │   │
│  │  OpenAI         ████████████████████ $28,046         │   │
│  │  GitHub Copilot ████████████ $14,223                 │   │
│  │  Google         ██████ $5,113                        │   │
│  │                                                        │   │
│  │  Tasks routed optimally: 94.2%                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  KEY METRICS CARDS                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │ API Calls│ Tokens   │ Avg      │ Success  │             │
│  │ 15,247   │ 4.2M     │ Latency  │ Rate     │             │
│  │ ↑ 12%    │ ↑ 18%    │ 1,234ms  │ 98.4%    │             │
│  └──────────┴──────────┴──────────┴──────────┘             │
│                                                               │
│  MONTHLY COST TRENDS                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cost Over Time  [Last 3 months ▼]                   │   │
│  │                                                        │   │
│  │     $80K                              ┌─ Baseline     │   │
│  │          ╱ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄ ̄         │   │
│  │     $40K    ╱╲                                        │   │
│  │            ╱  ╲  ╱╲     ┌─ Actual Cost               │   │
│  │     $0   ─╯    ╲╱  ╲───                              │   │
│  │          Nov   Dec   Jan                              │   │
│  │                                                        │   │
│  │  Projected annual savings: $568,584                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Cost Savings Hero Section
**Purpose:** The "wow" moment - show the big number immediately

**Data Required:**
```typescript
interface CostSummary {
  actualCost: number;          // $47,382
  baselineCost: number;        // $75,428
  savings: number;             // $28,046
  savingsPercent: number;      // 37.4
}
```

**Visual Design:**
- **Giant number:** 72px font, bold, green color
- **Percentage:** 48px font, semibold
- **Comparison text:** 18px, gray
- **Progress bar:** Chunky (20px height), green fill
- **Background:** White card with subtle shadow, rounded corners

**Microcopy:**
- Green when saving > 20%
- Yellow when saving 10-20%
- Red when saving < 10%

---

### 2. Provider Cost Comparison Chart
**Purpose:** Show the routing intelligence in action

**Data Required:**
```typescript
interface ProviderBreakdown {
  provider: string;            // "OpenAI", "GitHub Copilot", etc.
  cost: number;                // $28,046
  calls: number;               // 8,542
  costPerCall: number;         // $3.28
  optimalForTasks: string[];   // ["bug_fix", "refactor"]
}
```

**Chart Type:** Horizontal bar chart (easy to scan)

**Features:**
- Bars color-coded by provider
- Hover shows detailed breakdown
- Click to filter detailed metrics by provider
- Shows "optimal routing %" badge

---

### 3. Key Metrics Cards (4-card grid)
**Purpose:** Quick glance at usage patterns

**Metrics:**
1. **Total API Calls**
   - Number: 15,247
   - Trend: ↑ 12% vs last period
   - Icon: 📊

2. **Tokens Consumed**
   - Number: 4.2M
   - Trend: ↑ 18% vs last period
   - Icon: 🔢

3. **Average Latency**
   - Number: 1,234ms
   - Trend: ↓ 5% (green, good)
   - Icon: ⚡

4. **Success Rate**
   - Number: 98.4%
   - Trend: ↑ 0.2%
   - Icon: ✅

**Card Design:**
- White background
- Subtle border
- Icon in top-left corner
- Big number (36px)
- Trend arrow with color (green up = good, red down = bad)

---

### 4. Monthly Cost Trends Chart
**Purpose:** Show cost savings over time + future projections

**Data Required:**
```typescript
interface MonthlyTrend {
  month: string;               // "Jan 2026"
  actualCost: number;          // $47,382
  baselineCost: number;        // $75,428
  savings: number;             // $28,046
  tasksCompleted: number;      // 1,847
}
```

**Chart Type:** Dual-line chart
- Line 1 (dashed): Baseline cost (what you would have paid)
- Line 2 (solid): Actual cost (what you paid)
- Shaded area between lines = savings

**Features:**
- Hover shows exact values
- Toggle between time periods (Last 30 days, 90 days, 6 months)
- Projection line (dotted) for next 3 months
- "Annual savings projection" callout

---

## TypeScript Interfaces (API Contract)

### API Endpoints (From Graham's Design)
```typescript
// GET /api/analytics/cost-summary?startDate=2026-01-01&endDate=2026-01-31
interface CostSummaryResponse {
  actualCost: number;
  baselineCost: number;
  savings: number;
  savingsPercent: number;
  breakdown: {
    provider: string;
    cost: number;
    calls: number;
  }[];
}

// GET /api/analytics/usage-metrics?period=30d&groupBy=day
interface UsageMetricsResponse {
  metrics: {
    date: string;              // "2026-01-26"
    tasksCompleted: number;
    apiCalls: number;
    cost: number;
    avgLatency: number;
  }[];
}

// GET /api/analytics/provider-performance
interface ProviderPerformanceResponse {
  providers: {
    provider: string;
    avgLatency: number;
    successRate: number;
    costPerTask: number;
    optimalForTasks: string[];
  }[];
}
```

---

## Tech Stack

**Frontend Framework:**
- React 18 (functional components, hooks)
- TypeScript (strict mode)

**Styling:**
- Tailwind CSS 3.x
- Custom color palette for brand

**Charts:**
- Recharts (React-native charts, clean API)
- Alternatives considered: Chart.js (too generic), Victory (heavyweight)

**State Management:**
- React Context + hooks (simple, no extra deps)
- React Query for API calls (caching, refetching)

**Build Tool:**
- Vite (fast, modern, simple config)

**Export:**
- CSV: `papaparse` library
- PDF: Skip for MVP (can add later with `jsPDF`)

---

## Dark Mode Design

**Implementation:**
- Tailwind's built-in dark mode (`dark:` prefix)
- Toggle in top-right corner
- Persisted to localStorage

**Color Scheme:**

**Light Mode:**
- Background: #FFFFFF
- Cards: #F9FAFB
- Text: #111827
- Border: #E5E7EB

**Dark Mode:**
- Background: #111827
- Cards: #1F2937
- Text: #F9FAFB
- Border: #374151

**Accent Colors (Same for both):**
- Success/Savings: #10B981 (green)
- Warning: #F59E0B (yellow)
- Error: #EF4444 (red)
- Primary: #3B82F6 (blue)

---

## Time Period Selector

**Options:**
- Last 7 days
- Last 30 days (default)
- Last 90 days
- Last 6 months
- Custom range (date picker)

**Behavior:**
- Dropdown in top-right of each chart section
- Updates all charts when changed
- Persisted to URL query params (shareable links)

---

## Export Functionality

### CSV Export
**Columns:**
- Date
- Provider
- API Calls
- Tokens Used
- Cost (USD)
- Savings (USD)
- Success Rate (%)

**Filename:** `cost-analytics-{startDate}-{endDate}.csv`

**Trigger:** "Export CSV" button in top-right header

---

## Responsive Design

**Desktop (>1024px):**
- Full 2-column layout
- All charts visible
- Sidebar navigation (if needed)

**Tablet (640-1024px):**
- Single column layout
- Charts stack vertically
- Maintain interactivity

**Mobile (<640px):**
- Simplified view
- Hero metric only
- "View Details" button expands sections
- Horizontal scroll for charts

**Note:** Marcus said "desktop-first" - mobile is nice-to-have for MVP

---

## Performance Targets

**Metrics:**
- Initial page load: < 2 seconds
- Chart render: < 500ms
- API response time: < 200ms (Graham's target)
- Time to Interactive (TTI): < 3 seconds

**Optimizations:**
- Lazy load charts (code splitting)
- Debounce time period changes
- Cache API responses (5-minute TTL)
- Memoize expensive calculations

---

## Accessibility (a11y)

**Minimum Requirements:**
- ARIA labels on all interactive elements
- Keyboard navigation (Tab, Enter, Esc)
- Color contrast ratio ≥ 4.5:1
- Screen reader friendly (semantic HTML)
- Focus indicators on buttons/inputs

**Chart Accessibility:**
- Alt text descriptions
- Data tables as fallback
- Skip to content links

---

## Day 1 Deliverables (Today)

1. ✅ Wireframe document (this file)
2. ✅ API contract aligned with Graham's design
3. ⏳ Project structure scaffolded (React + Vite)
4. ⏳ Mock data created for all components
5. ⏳ Cost Savings Hero component (static)

---

## Day 2-3 Deliverables

1. Provider Cost Comparison chart (with mock data)
2. Key Metrics Cards (4-card grid)
3. Monthly Trends chart (with mock data)
4. Time period selector (functional)
5. Dark mode toggle (functional)
6. Responsive layout (desktop + tablet)

---

## Day 4 Deliverables

1. Integrate Graham's API endpoints
2. Real data flowing into charts
3. Error handling and loading states
4. CSV export functionality
5. Polish animations and transitions

---

## Day 5 Deliverables (Demo Day)

1. Full demo-ready prototype
2. Edge case handling
3. Performance optimized
4. Documentation for Marcus
5. Deployment to demo environment (coordinate with Yuki)

---

## Open Questions for Marcus

1. **Real-time updates:** Should the dashboard auto-refresh every N seconds, or manual refresh only?
   - **My recommendation:** Auto-refresh every 60 seconds for live feel

2. **Authentication:** Is this dashboard behind a login, or public-facing for sales demos?
   - **My assumption:** Authenticated (user-specific data)

3. **Branding:** Any specific color preferences or logo assets?
   - **My plan:** Use Generic Corp blue (#3B82F6) + green for savings

4. **Multiple customers:** Will one customer see their own data, or can they compare to benchmarks?
   - **My assumption:** Own data only for MVP

---

## Success Criteria

**Technical:**
- ✅ All charts render correctly with mock data
- ✅ Dark mode works without visual bugs
- ✅ CSV export downloads valid file
- ✅ Time period selector updates all charts
- ✅ Responsive on desktop and tablet

**Business:**
- ✅ Marcus says "Wow, I can sell with this"
- ✅ Big savings number jumps out in <3 seconds
- ✅ Dashboard looks professional enough for enterprise buyers
- ✅ Proves ROI visually and clearly

---

## Next Actions (Immediate)

1. Send wireframe to Marcus for quick feedback (optional)
2. Set up React + Vite project structure
3. Install dependencies (Tailwind, Recharts, React Query)
4. Create mock data files
5. Build Cost Savings Hero component

---

**Status:** Ready to code. Let's ship this! 🚀

**ETA:** First component rendered in 2 hours.
