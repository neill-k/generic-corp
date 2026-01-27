# Analytics Dashboard UI - Wireframes & Component Structure

**Author:** DeVonte Jackson, Full-Stack Developer
**Date:** 2026-01-26
**Status:** Draft v1
**Project:** Multi-Tenant Analytics SaaS Platform

## Design Philosophy

**Core Principles:**
1. **Time-to-Value:** Users see value within 60 seconds of signup
2. **Real-time Feel:** Live updates create engagement
3. **Mobile-First:** Responsive design for all screen sizes
4. **Progressive Disclosure:** Simple by default, powerful when needed
5. **Revenue-Focused:** Every feature justifies the $299-999/mo price

## User Flows

### New User Onboarding (0-5 minutes)
```
1. Sign up → Email verification
2. Create workspace (tenant setup)
3. Get API key → Copy to clipboard
4. Quick start guide → "Send your first event"
5. Dashboard auto-refreshes when first event received
6. Celebration modal: "You're tracking events! 🎉"
```

### Daily Active User Flow
```
1. Login → Dashboard home
2. Glance at key metrics (cards)
3. Dive into specific metric (chart interaction)
4. Export data or create custom view
5. Check real-time events feed
```

## Page Structure

### 1. Dashboard Home (`/dashboard`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Analytics Dashboard    [User Menu] [Settings]   │
├─────────────────────────────────────────────────────────┤
│ Sidebar Nav           Main Content Area                 │
│                                                          │
│ 📊 Dashboard          ┌──────────────────────────┐     │
│ 📈 Events             │  Key Metrics Cards       │     │
│ 👥 Users              │  (4 cards in grid)       │     │
│ 📅 Analytics          └──────────────────────────┘     │
│ ⚙️  Settings                                            │
│ 🔑 API Keys           ┌──────────────────────────┐     │
│                       │  Main Chart              │     │
│                       │  (Time series)           │     │
│ Tier: Pro             │                          │     │
│ Usage: 45K/1M         └──────────────────────────┘     │
│                                                          │
│                       ┌──────────────────────────┐     │
│                       │  Recent Events Table     │     │
│                       │  (Live updating)         │     │
│                       └──────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Key Metrics Cards (Top Row):**

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total Events│ Active Users│ Avg Session │ Error Rate  │
│   45,234    │   1,247     │   4m 32s    │   0.3%     │
│ ↑ 12% ⚡    │ ↑ 8%  ⚡    │ ↓ 5%  ⚡    │ ↓ 0.1% ⚡  │
└─────────────┴─────────────┴─────────────┴─────────────┘

Legend:
- Large number = current value
- ↑/↓ = change from previous period
- ⚡ = live updating indicator
- Color: Green (good), Red (bad), Gray (neutral)
```

**Main Chart (Interactive Time Series):**

```
┌──────────────────────────────────────────────────────┐
│ Events Over Time          [Hour|Day|Week|Month]      │
│                          [Last 7 Days ▼]             │
├──────────────────────────────────────────────────────┤
│                                    ╱╲                │
│                              ╱╲   ╱  ╲      ╱        │
│                     ╱╲      ╱  ╲ ╱    ╲    ╱         │
│            ╱╲      ╱  ╲    ╱    ╲      ╲  ╱          │
│   ╱╲      ╱  ╲    ╱    ╲  ╱      ╲      ╲╱           │
│  ╱  ╲____╱    ╲__╱      ╲╱                           │
├──────────────────────────────────────────────────────┤
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun                    │
└──────────────────────────────────────────────────────┘

Features:
- Hover for exact values
- Click to drill down
- Zoom in/out
- Export chart as image
```

**Recent Events Table (Live Feed):**

```
┌──────────────────────────────────────────────────────┐
│ Live Events Feed                    [Pause] [Export] │
├──────────────────────────────────────────────────────┤
│ 🟢 page_view  │ user_12345 │ /dashboard │ 2s ago     │
│ 🟢 button_click│ user_67890 │ /settings  │ 5s ago     │
│ 🟢 page_view  │ user_11111 │ /home      │ 8s ago     │
│ 🟡 api_error  │ user_22222 │ /api/data  │ 12s ago    │
│ 🟢 page_view  │ user_33333 │ /products  │ 15s ago    │
└──────────────────────────────────────────────────────┘

Features:
- Auto-scrolls new events (WebSocket)
- Color-coded by event type
- Click row to expand details
- Pause to inspect
- Filter by event type
```

### 2. Events Explorer (`/events`)

**Purpose:** Deep dive into all events with advanced filtering

```
┌──────────────────────────────────────────────────────┐
│ Events Explorer                                       │
├──────────────────────────────────────────────────────┤
│ Filters:                                              │
│ [Date Range: Last 7 days ▼] [Event Type: All ▼]     │
│ [User ID: ___________] [Custom Props: + Add Filter]  │
│                                    [Search] [Clear]   │
├──────────────────────────────────────────────────────┤
│ Results: 45,234 events                [Export CSV]    │
├──────────────────────────────────────────────────────┤
│ Timestamp         │ Type       │ User    │ Properties │
│ 2026-01-26 10:30 │ page_view  │ u_12345 │ {...} 🔍  │
│ 2026-01-26 10:29 │ click      │ u_67890 │ {...} 🔍  │
│ 2026-01-26 10:28 │ page_view  │ u_11111 │ {...} 🔍  │
│                                                        │
│ [< Previous]  Page 1 of 453  [Next >]                │
└──────────────────────────────────────────────────────┘

Features:
- Advanced filtering (AND/OR logic)
- Sort by any column
- Expandable properties JSON
- Export filtered results
- Save filter as preset
```

### 3. Users Page (`/users`)

**Purpose:** User cohort analysis and segmentation

```
┌──────────────────────────────────────────────────────┐
│ Users & Cohorts                                       │
├──────────────────────────────────────────────────────┤
│ Total Active Users: 1,247      [+ Create Segment]    │
├──────────────────────────────────────────────────────┤
│ User ID      │ First Seen │ Last Active │ Events     │
│ user_12345  │ Jan 20     │ 2m ago      │ 456        │
│ user_67890  │ Jan 18     │ 5m ago      │ 234        │
│ user_11111  │ Jan 25     │ 1h ago      │ 89         │
│                                                        │
│ [< Previous]  Page 1 of 13  [Next >]                 │
├──────────────────────────────────────────────────────┤
│ User Activity Timeline                                │
│ [Chart showing daily/weekly/monthly active users]     │
└──────────────────────────────────────────────────────┘
```

### 4. Analytics Page (`/analytics`)

**Purpose:** Custom dashboards and metrics

```
┌──────────────────────────────────────────────────────┐
│ Custom Analytics                  [+ New Dashboard]  │
├──────────────────────────────────────────────────────┤
│ Pre-built Templates:                                  │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│ │ Marketing │ │ Product   │ │ Revenue   │          │
│ │ Analytics │ │ Analytics │ │ Tracking  │          │
│ │ [Use]     │ │ [Use]     │ │ [Use]     │          │
│ └───────────┘ └───────────┘ └───────────┘          │
├──────────────────────────────────────────────────────┤
│ Your Custom Dashboards:                               │
│ 📊 Conversion Funnel       Edit │ View │ Share      │
│ 📊 User Engagement         Edit │ View │ Share      │
└──────────────────────────────────────────────────────┘
```

### 5. Settings Page (`/settings`)

**Purpose:** Account configuration and preferences

```
┌──────────────────────────────────────────────────────┐
│ Settings                                              │
├──────────────────────────────────────────────────────┤
│ Tabs: [General] [API Keys] [Team] [Billing] [Data]  │
├──────────────────────────────────────────────────────┤
│ API Keys                                              │
│                                                        │
│ Your API Keys:                       [+ Create Key]  │
│ ┌────────────────────────────────────────────────┐  │
│ │ Production                          [Copy] [⚙️] │  │
│ │ pk_live_abc123xyz...                            │  │
│ │ Created: Jan 20, 2026                           │  │
│ │ Last used: 2m ago                               │  │
│ └────────────────────────────────────────────────┘  │
│                                                        │
│ ┌────────────────────────────────────────────────┐  │
│ │ Development                         [Copy] [⚙️] │  │
│ │ pk_test_def456uvw...                            │  │
│ │ Created: Jan 20, 2026                           │  │
│ │ Last used: Never                                │  │
│ └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Component Architecture

### React Component Tree

```
App
├── Layout
│   ├── Sidebar
│   │   ├── NavItem (Dashboard, Events, Users, etc.)
│   │   └── UsageIndicator
│   ├── TopBar
│   │   ├── Logo
│   │   ├── SearchBar
│   │   └── UserMenu
│   └── MainContent
│
├── Pages
│   ├── DashboardPage
│   │   ├── MetricCard (x4)
│   │   ├── TimeSeriesChart
│   │   └── LiveEventsTable
│   │
│   ├── EventsPage
│   │   ├── FilterBar
│   │   └── EventsTable
│   │
│   ├── UsersPage
│   │   ├── UserStatsCard
│   │   ├── UsersTable
│   │   └── CohortChart
│   │
│   ├── AnalyticsPage
│   │   ├── TemplateGallery
│   │   └── DashboardList
│   │
│   └── SettingsPage
│       ├── TabNavigation
│       └── SettingsPanel
│
└── Shared Components
    ├── Button
    ├── Card
    ├── Chart (wrapper for Recharts)
    ├── Table
    ├── Modal
    ├── Toast/Notification
    ├── DatePicker
    ├── Dropdown
    └── Badge
```

### State Management Strategy

**Option 1: React Context + Hooks (Recommended for MVP)**
- Lightweight, no extra dependencies
- Good for small-medium state
- Easy to understand and maintain

```typescript
// contexts/DashboardContext.tsx
interface DashboardState {
  dateRange: DateRange
  selectedMetrics: string[]
  refreshInterval: number
  liveEventsEnabled: boolean
}

const DashboardContext = createContext<DashboardState>()
```

**Option 2: Zustand (If state gets complex)**
- Minimal boilerplate
- Good DevTools support
- Easy migration from Context

### Real-Time Updates (WebSocket)

**Architecture:**

```
Client (React)
  ↓ Connect via Socket.io
WebSocket Server
  ↓ Subscribe to tenant events
Redis Pub/Sub
  ↑ Publish events
Event Ingestion API
```

**Implementation:**

```typescript
// hooks/useRealtimeEvents.ts
function useRealtimeEvents(tenantId: string) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const socket = io('/events')

    socket.emit('subscribe', { tenantId })

    socket.on('new_event', (event) => {
      setEvents(prev => [event, ...prev].slice(0, 50))
    })

    return () => socket.disconnect()
  }, [tenantId])

  return events
}
```

## Design System

### Color Palette

```
Primary: #3B82F6 (Blue - trust, tech)
Success: #10B981 (Green - positive metrics)
Warning: #F59E0B (Yellow - needs attention)
Error: #EF4444 (Red - critical issues)
Neutral: #6B7280 (Gray - text, borders)

Backgrounds:
- Light mode: #FFFFFF, #F9FAFB, #F3F4F6
- Dark mode: #111827, #1F2937, #374151 (Post-MVP)
```

### Typography

```
Font Family: Inter (clean, modern, excellent readability)

Headings:
- H1: 32px, Bold
- H2: 24px, Semibold
- H3: 20px, Semibold
- H4: 18px, Medium

Body:
- Large: 16px, Regular
- Normal: 14px, Regular
- Small: 12px, Regular

Code/Monospace: JetBrains Mono (for API keys, JSON)
```

### Spacing & Layout

```
Base unit: 4px (use multiples: 8px, 12px, 16px, 24px, 32px)

Container max-width: 1280px
Sidebar width: 240px
Card padding: 24px
Card border-radius: 8px
Button padding: 12px 24px
```

## Pre-built Dashboard Templates (MVP)

### 1. Marketing Analytics Template
- Traffic sources breakdown
- Conversion funnel
- Campaign performance
- UTM parameter tracking

### 2. Product Analytics Template
- Feature usage heatmap
- User journey flow
- Retention cohorts
- Activation metrics

### 3. Revenue Tracking Template
- Transaction events
- Revenue over time
- Customer lifetime value
- Churn analysis

## Technical Implementation

### Tech Stack

**Frontend:**
- Next.js 14 (App Router) - SSR, routing, API routes
- React 18 - UI components
- TypeScript - type safety
- TailwindCSS - styling
- Recharts - data visualization
- Socket.io-client - real-time updates
- React Query - server state management
- Zod - form validation

**Build Tools:**
- Vite (if standalone) or Next.js built-in
- ESLint + Prettier
- Husky for pre-commit hooks

### Folder Structure

```
apps/dashboard/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── users/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── layout.tsx
│   │
│   ├── components/             # React components
│   │   ├── ui/                # Shared UI components
│   │   ├── charts/            # Chart components
│   │   ├── tables/            # Table components
│   │   └── layout/            # Layout components
│   │
│   ├── lib/                   # Utilities
│   │   ├── api.ts             # API client
│   │   ├── websocket.ts       # Socket.io setup
│   │   └── utils.ts
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useRealtimeEvents.ts
│   │   ├── useMetrics.ts
│   │   └── useAuth.ts
│   │
│   ├── contexts/              # React contexts
│   │   └── DashboardContext.tsx
│   │
│   └── types/                 # TypeScript types
│       └── events.ts
│
├── public/                    # Static assets
│   └── images/
│
├── package.json
└── tsconfig.json
```

### Data Fetching Strategy

**Server Components (Next.js 14):**
- Initial page load data
- Pre-render metric cards
- SEO-friendly content

**Client Components:**
- Real-time updates
- Interactive charts
- User interactions

**Example:**

```typescript
// app/dashboard/page.tsx (Server Component)
async function DashboardPage() {
  const metrics = await fetchInitialMetrics()

  return (
    <div>
      <MetricCards initialData={metrics} />
      <RealtimeChart /> {/* Client Component */}
    </div>
  )
}

// components/RealtimeChart.tsx (Client Component)
'use client'
function RealtimeChart() {
  const { data } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 5000 // Poll every 5s
  })

  return <Chart data={data} />
}
```

## Performance Optimizations

1. **Code Splitting:**
   - Lazy load chart library
   - Route-based splitting
   - Dynamic imports for heavy components

2. **Caching:**
   - React Query for API responses
   - Service Worker for offline support (Post-MVP)
   - CDN for static assets

3. **Rendering:**
   - Virtualized tables for large datasets (react-window)
   - Memoization for expensive calculations
   - Debounced search inputs

4. **Bundle Size:**
   - Tree-shaking
   - Analyze bundle with webpack-bundle-analyzer
   - Target < 200KB initial JS bundle

## Responsive Design Breakpoints

```
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px

Mobile adaptations:
- Collapse sidebar to hamburger menu
- Stack metric cards vertically
- Horizontal scroll for tables
- Simplified charts (fewer data points)
```

## Accessibility (a11y)

- ARIA labels on all interactive elements
- Keyboard navigation support
- Color contrast ratio ≥ 4.5:1
- Screen reader friendly
- Focus indicators
- Alt text for images

## Testing Strategy

1. **Unit Tests (Vitest):**
   - Component rendering
   - Custom hooks
   - Utility functions

2. **Integration Tests (Testing Library):**
   - User interactions
   - Form submissions
   - API integration

3. **E2E Tests (Playwright - Post-MVP):**
   - Critical user flows
   - Cross-browser testing

## Week 1 Implementation Priority

**Wed-Thu (Core Features):**
1. Dashboard layout with sidebar
2. MetricCard components (4 cards)
3. Basic TimeSeriesChart (Recharts)
4. LiveEventsTable with mock data
5. Settings page with API key display

**Fri (Integration):**
1. Connect to real API endpoints
2. WebSocket integration for live events
3. Auth token management
4. Error handling and loading states

## Open Questions

1. **Design Assets:** Do we have a logo? Brand colors?
2. **Dark Mode:** Priority for MVP or post-launch?
3. **Internationalization:** English-only for MVP?
4. **Mobile App:** Native or PWA in the future?
5. **White-labeling:** Will customers want to rebrand the dashboard?

## Next Steps

1. Get design feedback from Marcus
2. Review with Sable for architectural alignment
3. Start component library setup
4. Create Figma mockups (if time permits)

---

**Contact:** DeVonte Jackson - Full-Stack Developer
