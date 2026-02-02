# Stripe Integration Plan

**Owner**: Marcus (setup) + DeVonte (implementation)
**Timeline**: Week 1 (setup), Week 2 (implementation)
**Priority**: HIGH - Required for revenue

---

## Phase 1: Stripe Account Setup (Marcus - This Week)

### Steps

1. **Create Stripe Account**
   - Go to https://stripe.com/
   - Sign up with company email (marcus@genericcorp.io or personal)
   - Choose business type: "Company" or "Individual" (start with individual if unsure)
   - Complete KYC verification

2. **Configure Account**
   - Business name: "Generic Corp" (or "AgentHQ" if we rebrand)
   - Business description: "Multi-agent AI orchestration platform"
   - Product/Service description: "SaaS platform for developers"
   - Website: Will add when live
   - Support email: support@genericcorp.io (or similar)

3. **Get API Keys**
   - Navigate to Developers → API Keys
   - Copy Publishable Key (starts with pk_test_)
   - Copy Secret Key (starts with sk_test_) - KEEP SECURE
   - Store in password manager

4. **Test Mode Configuration**
   - Start in test mode
   - Use test credit cards for development
   - Switch to live mode only when ready for real customers

5. **Create Products**
   - Create 3 products in Stripe Dashboard:
     - **Starter Plan**: $49/month recurring
     - **Pro Plan**: $149/month recurring
     - **Enterprise Plan**: Custom (handle manually initially)
   - Note down Price IDs for each

---

## Phase 2: Pricing Configuration (Week 1)

### Stripe Products to Create

#### Product 1: Starter Plan
```
Name: AgentHQ Starter
Description: Managed cloud hosting for up to 5 AI agents
Price: $49/month (USD)
Billing: Recurring monthly
Price ID: price_starter_monthly (copy from Stripe)

Features included:
- 5 concurrent agents
- 1,000 agent-minutes/month
- Email support
- Community access
```

#### Product 2: Pro Plan
```
Name: AgentHQ Pro
Description: Professional plan for teams with priority support
Price: $149/month (USD)
Billing: Recurring monthly
Price ID: price_pro_monthly (copy from Stripe)

Features included:
- 20 concurrent agents
- 10,000 agent-minutes/month
- Priority support
- SSO (future)
- Advanced monitoring
```

#### Product 3: Enterprise Plan
```
Name: AgentHQ Enterprise
Description: Custom enterprise deployment with dedicated support
Price: Custom (starting at $25K/year)
Billing: Custom (annual, quarterly)
Price ID: N/A (handle via Stripe invoices)

Features included:
- Unlimited agents
- Dedicated infrastructure
- SLA guarantee
- On-premise deployment
- Custom integrations
- Dedicated account manager
```

---

## Phase 3: Technical Integration (DeVonte - Week 2)

### Backend Integration

#### 1. Install Stripe SDK
```bash
cd apps/server
pnpm add stripe @stripe/stripe-js
```

#### 2. Environment Variables
Add to `apps/server/.env`:
```env
STRIPE_SECRET_KEY=sk_test_... (from Marcus)
STRIPE_PUBLISHABLE_KEY=pk_test_... (from Marcus)
STRIPE_WEBHOOK_SECRET=whsec_... (will be generated)

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
```

#### 3. Stripe Client Setup
Create `apps/server/src/services/stripe.ts`:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default stripe;
```

#### 4. API Endpoints Needed

**POST /api/checkout/create-session**
- Creates Stripe Checkout session
- Redirects user to Stripe payment page
- Parameters: priceId, userId, email

**POST /api/webhooks/stripe**
- Receives Stripe webhook events
- Updates user subscription status in database
- Handles: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted

**GET /api/billing/portal**
- Creates customer portal session
- Allows users to manage subscription
- Returns portal URL

**GET /api/billing/status**
- Returns current subscription status for user
- Checks Stripe for subscription validity

#### 5. Database Schema Updates
Add to Prisma schema (`apps/server/prisma/schema.prisma`):
```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  stripeCustomerId  String?  @unique
  subscriptionId    String?
  subscriptionStatus String? // active, past_due, canceled, trialing
  plan              String?  // starter, pro, enterprise
  agentLimit        Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Subscription {
  id                String   @id @default(cuid())
  userId            String
  stripeSubscriptionId String @unique
  stripePriceId     String
  status            String   // active, past_due, canceled, trialing
  currentPeriodEnd  DateTime
  cancelAtPeriodEnd Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## Phase 4: Frontend Integration (DeVonte - Week 2)

### Payment Flow

1. **Pricing Page**
   - Display 3 tiers: Free, Starter, Pro
   - "Start Trial" buttons
   - Compare features table

2. **Checkout Flow**
   - Click "Start Trial" → POST /api/checkout/create-session
   - Redirect to Stripe Checkout
   - Stripe handles payment form (we don't touch card details)
   - Redirect back to our app on success

3. **User Dashboard**
   - Show current plan
   - Show usage (X / Y agents used)
   - "Manage Billing" button → customer portal
   - Upgrade/downgrade options

4. **Success/Cancel Pages**
   - `/checkout/success` - Thank you, account activated
   - `/checkout/cancel` - No problem, try again when ready

---

## Phase 5: Webhook Configuration (Week 2)

### Setup Steps

1. **Create Webhook Endpoint**
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: https://api.genericcorp.io/api/webhooks/stripe
   - Select events:
     - checkout.session.completed
     - invoice.payment_succeeded
     - invoice.payment_failed
     - customer.subscription.updated
     - customer.subscription.deleted

2. **Webhook Handler**
   - Verify webhook signature (security)
   - Update database based on event type
   - Send confirmation emails
   - Log all events

3. **Testing Webhooks**
   - Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Trigger test events: `stripe trigger checkout.session.completed`

---

## Phase 6: Free Tier & Trial Strategy

### Free Tier (Self-Hosted)
- No Stripe required
- User downloads repo, runs locally
- No payment, no limits (beyond their infrastructure)

### Trial Strategy Options

**Option 1: No Credit Card Trial**
- Sign up with email only
- 14-day trial of Starter plan
- After 14 days, downgrade to Free or prompt for payment
- Pros: Lower friction
- Cons: Lower conversion

**Option 2: Credit Card Required**
- Enter card at signup
- 14-day free trial
- Auto-charges $49 after trial
- Pros: Higher conversion
- Cons: Higher friction

**RECOMMENDATION**: Start with Option 1, test conversion, switch to Option 2 if needed

---

## Phase 7: Revenue Tracking & Analytics

### Metrics to Track

1. **Stripe Dashboard** (built-in):
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - Failed payments
   - Customer lifetime value

2. **Our Database**:
   - Signups → Trial → Paid conversion funnel
   - Plan distribution (how many Starter vs Pro)
   - Usage per customer (agent-minutes)
   - Support tickets per customer

3. **Custom Analytics**:
   - Time from signup to first paid invoice
   - Upgrade rate (Starter → Pro)
   - Downgrade rate (Pro → Starter)
   - Cancellation reasons (survey)

---

## Security Considerations

### Must-Haves
- ✅ Never store credit card details (Stripe handles this)
- ✅ Verify webhook signatures
- ✅ Use HTTPS for all Stripe API calls
- ✅ Store API keys in environment variables, not code
- ✅ Limit API key permissions (restrict to necessary operations)
- ✅ Log all payment events for audit trail

### Rate Limiting
- Prevent abuse of checkout endpoint
- Limit: 5 checkout sessions per user per hour

### PCI Compliance
- We don't need PCI compliance (Stripe handles card processing)
- Stripe Checkout is PCI-compliant by default
- Never ask for card details on our site

---

## Testing Checklist

### Before Launch
- [ ] Test checkout flow (Starter plan)
- [ ] Test checkout flow (Pro plan)
- [ ] Test successful payment
- [ ] Test failed payment
- [ ] Test webhook: checkout.session.completed
- [ ] Test webhook: invoice.payment_succeeded
- [ ] Test webhook: customer.subscription.deleted
- [ ] Test customer portal (manage subscription)
- [ ] Test upgrade flow (Starter → Pro)
- [ ] Test downgrade flow (Pro → Starter)
- [ ] Test cancellation flow
- [ ] Verify database updates correctly
- [ ] Verify agent limits enforced
- [ ] Test with test credit cards:
  - Success: 4242 4242 4242 4242
  - Decline: 4000 0000 0000 0002
  - Auth required: 4000 0025 0000 3155

---

## Launch Checklist

### Week 2 - Before Going Live
- [ ] Marcus: Stripe account fully verified
- [ ] Marcus: Products created in Stripe
- [ ] Marcus: Price IDs shared with team
- [ ] DeVonte: Integration complete
- [ ] DeVonte: Webhooks configured
- [ ] DeVonte: All tests passing
- [ ] DeVonte: Error handling for failed payments
- [ ] Team: Terms of Service page
- [ ] Team: Privacy Policy page
- [ ] Team: Refund policy documented

### Week 2 - First Paying Customer
- [ ] Switch to live mode in Stripe
- [ ] Update environment variables (live keys)
- [ ] Monitor webhook events closely
- [ ] Test with real payment (small amount first)
- [ ] Celebrate! 🎉

---

## Fallback Plan

### If Stripe Integration Delayed
- Launch with "Request Access" form (email capture)
- Process first customers manually (Stripe invoices)
- Gives us 1-2 more weeks for integration
- Better than blocking launch

### If Technical Issues
- Offer free beta access initially
- Collect payment info for "when we launch"
- Build integration in parallel
- Start charging in Week 3-4

---

## Support & Documentation

### Stripe Docs
- Checkout: https://stripe.com/docs/checkout
- Webhooks: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing

### Our Docs
- Create customer-facing docs:
  - How billing works
  - How to upgrade/downgrade
  - How to cancel
  - Refund policy
  - What happens when payment fails

---

## Revenue Projections (With Stripe)

### Month 1
- 10 customers × $49 (Starter) = $490 MRR
- Stripe fees (2.9% + $0.30): ~$15
- Net: $475

### Month 3
- 30 Starter ($49) = $1,470
- 10 Pro ($149) = $1,490
- Total MRR: $2,960
- Stripe fees: ~$90
- Net: $2,870

### Month 6
- 50 Starter ($49) = $2,450
- 30 Pro ($149) = $4,470
- 2 Enterprise ($2,000) = $4,000
- Total MRR: $10,920
- Stripe fees: ~$330
- Net: $10,590

---

## Next Steps

### Marcus (This Week)
1. Create Stripe account
2. Complete verification
3. Create 3 products (Starter, Pro, Enterprise)
4. Share API keys with DeVonte (securely)
5. Document price IDs

### DeVonte (Week 2)
1. Install Stripe SDK
2. Implement checkout endpoint
3. Implement webhook handler
4. Update database schema
5. Build pricing page
6. Test full flow
7. Deploy to production

### Team (Week 2)
1. Review Terms of Service
2. Review Privacy Policy
3. Test payment flow
4. Celebrate first paid customer!

---

**Status**: Ready to execute
**Owner**: Marcus (setup), DeVonte (implementation)
**Timeline**: Week 1-2
**Blocker**: None

**Last Updated**: January 26, 2026
