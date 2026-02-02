# Stripe Account Setup Guide - Generic Corp

**Date**: January 26, 2026
**Owner**: Marcus Bell, CEO
**Priority**: CRITICAL - Blocking revenue generation

---

## Overview

Setting up Stripe to enable payment processing for our multi-tenant SaaS platform.

---

## Business Information

**Company Details:**
- Business Name: Generic Corp
- Business Type: Software/SaaS
- Product Description: Multi-agent AI orchestration platform
- Website: genericcorp.io (pending)
- Business Address: [To be added - use registered business address]

**Contact Information:**
- Business Email: [ceo@genericcorp.io or support@genericcorp.io]
- Phone: [Business phone number]
- Legal Entity: [LLC/Corporation - clarify legal structure]

---

## Setup Steps

### 1. Create Stripe Account
**URL**: https://dashboard.stripe.com/register

**Required Information:**
- Email address (use business email)
- Password (strong, store in password manager)
- Country: United States
- Business name: Generic Corp

**Timeline**: 5-10 minutes

---

### 2. Complete Business Verification

**Required Documents:**
- Business Tax ID (EIN)
- Business bank account details
- Personal identification (for beneficial owner)
- Business formation documents

**Timeline**: 1-3 business days for verification

**Status**: ⚠️ This is the longest step - start immediately

---

### 3. Configure Products & Pricing

**Products to Create:**

**Free Tier:**
- Name: "Free"
- Price: $0
- Features: 10 agents, 1K tasks/month
- Note: Track usage, no payment required

**Starter Tier:**
- Name: "Starter"
- Price: $49/month
- Billing: Recurring subscription
- Features: 50 agents, 10K tasks/month

**Pro Tier:**
- Name: "Pro"
- Price: $149/month
- Billing: Recurring subscription
- Features: Unlimited agents, 100K tasks/month

**Enterprise Tier:**
- Name: "Enterprise"
- Price: Custom (manual invoicing initially)
- Features: Everything + dedicated support

---

### 4. Enable Required Features

**Must Enable:**
- ✅ Recurring billing (Stripe Billing)
- ✅ Customer portal (self-service management)
- ✅ Payment methods: Credit/Debit cards
- ✅ Webhooks (for DeVonte's integration)
- ✅ Test mode (for development)

**Optional (Later):**
- Invoice billing (for enterprise)
- Usage-based pricing (for agent-minutes)
- Tax calculation (Stripe Tax)

---

### 5. Get API Keys

**Keys Needed:**

**Test Mode:**
- Publishable key: `pk_test_...`
- Secret key: `sk_test_...`
- Webhook signing secret: `whsec_...`

**Live Mode (after verification):**
- Publishable key: `pk_live_...`
- Secret key: `sk_live_...`
- Webhook signing secret: `whsec_...`

**Security:**
- Store in environment variables
- Never commit to git
- Share via secure channel (1Password, etc.)

---

### 6. Configure Webhooks

**Webhook URL:** `https://genericcorp.io/api/webhooks/stripe`

**Events to Subscribe:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `checkout.session.completed`

**Purpose**: Keep our database in sync with Stripe subscription status

---

## Integration Points

### DeVonte Jackson (Frontend)
**Needs:**
- Stripe publishable key (test + live)
- Product IDs for each tier
- Webhook endpoint confirmation

**For:**
- Checkout flow
- Customer portal integration
- Payment status display

### Yuki Tanaka (Infrastructure)
**Needs:**
- Webhook endpoint setup
- Webhook signing secret
- Rate limiting for webhook endpoint

**For:**
- Secure webhook processing
- Subscription status sync
- Security hardening

### Graham Sutton (Analytics)
**Needs:**
- Stripe reporting API access
- MRR calculation guidance
- Revenue tracking approach

**For:**
- Financial dashboard
- Revenue metrics
- Churn analysis

---

## Pricing Strategy Rationale

### Why These Prices?

**Starter ($49/mo):**
- Lower than competitors ($99-149/mo typical)
- Attractive entry point for indie developers
- Covers infrastructure costs (~$5-10/user)
- Margin: ~75-85%

**Pro ($149/mo):**
- Competitive with mid-tier enterprise tools
- Sweet spot for small teams (5-10 people)
- Covers support overhead
- Margin: ~90%

**Enterprise (Custom):**
- Manual sales process
- Typical range: $500-2K/mo
- High-touch, high-margin
- Margin: ~95%

### Conversion Assumptions

**Funnel:**
- Signups: 100
- Free tier activation: 60 (60%)
- Trial starts: 20 (20%)
- Paid conversions: 5 (5%)

**Target Mix (Month 3):**
- Starter: 50 users = $2,450/mo
- Pro: 10 users = $1,490/mo
- Enterprise: 2 users = $1,500/mo
- **Total MRR: $5,440/mo**

---

## Payment Flow Architecture

### User Journey

**Step 1: Signup**
- User creates account (Clerk)
- Auto-assigned to Free tier
- No payment required

**Step 2: Upgrade Prompt**
- Usage approaches limits
- Upgrade CTA displayed
- Redirect to Stripe Checkout

**Step 3: Checkout**
- Stripe Checkout hosted page
- Customer enters payment info
- Subscription created

**Step 4: Webhook Processing**
- Stripe sends webhook to our API
- We verify signature
- Update user tier in database
- Grant access to paid features

**Step 5: Ongoing**
- Monthly billing automatic
- Customer can manage via Stripe portal
- Webhooks keep status in sync

---

## Testing Checklist

### Before Launch

**Test Mode:**
- [ ] Create test subscription (Starter)
- [ ] Create test subscription (Pro)
- [ ] Verify webhook delivery
- [ ] Test subscription cancellation
- [ ] Test failed payment handling
- [ ] Verify usage limits enforcement
- [ ] Test customer portal access

**Documentation:**
- [ ] API keys documented
- [ ] Webhook events documented
- [ ] Error handling documented
- [ ] Support runbook created

---

## Go-Live Checklist

### Pre-Launch
- [ ] Business verification complete
- [ ] Bank account connected
- [ ] Products configured in live mode
- [ ] Webhooks configured in live mode
- [ ] Test transactions processed successfully
- [ ] Team has live API keys

### Launch Day
- [ ] Switch from test to live keys
- [ ] Monitor Stripe dashboard
- [ ] Verify first real transaction
- [ ] Test customer support flow

### Post-Launch
- [ ] Daily revenue checks
- [ ] Weekly MRR reporting
- [ ] Monthly Stripe fee analysis
- [ ] Quarterly pricing review

---

## Cost Structure

### Stripe Fees

**Standard Pricing:**
- 2.9% + $0.30 per successful card charge
- No monthly fees
- No setup fees

**Example Costs:**
- $49 Starter charge: $1.72 fee = $47.28 net
- $149 Pro charge: $4.62 fee = $144.38 net
- $500 Enterprise: $14.80 fee = $485.20 net

**Monthly Projection (50 paid users):**
- Revenue: ~$4,000
- Stripe fees: ~$150 (3.75%)
- Net: ~$3,850

---

## Revenue Tracking

### Key Metrics to Monitor

**Daily:**
- New subscriptions
- Cancellations
- Failed payments

**Weekly:**
- MRR (Monthly Recurring Revenue)
- Churn rate
- ARPU (Average Revenue Per User)

**Monthly:**
- Revenue growth %
- Customer LTV
- CAC payback period

### Reporting Tools

**Built-in:**
- Stripe Dashboard (daily checks)
- Stripe Sigma (SQL queries on data)

**Custom:**
- Graham's analytics dashboard
- Financial projections spreadsheet

---

## Support & Resources

### Stripe Documentation
- Getting Started: https://stripe.com/docs/development/quickstart
- Billing: https://stripe.com/docs/billing
- Webhooks: https://stripe.com/docs/webhooks
- Test Cards: https://stripe.com/docs/testing

### Support Channels
- Stripe Support: support@stripe.com
- Documentation: docs.stripe.com
- Status: status.stripe.com

---

## Risk Mitigation

### Fraud Prevention
- Stripe Radar (automatic fraud detection)
- 3D Secure for high-risk transactions
- Billing address verification

### Failed Payments
- Automatic retry logic (Smart Retries)
- Email notifications to customers
- Grace period before downgrade (7 days)

### Disputes/Chargebacks
- Rapid response required (<7 days)
- Maintain transaction records
- Clear refund policy on website

---

## Next Steps

### Immediate (Today)
1. [ ] Create Stripe account
2. [ ] Start business verification process
3. [ ] Configure test mode products
4. [ ] Share test API keys with DeVonte

### This Week
1. [ ] Complete business verification
2. [ ] Test complete checkout flow
3. [ ] Document webhook integration
4. [ ] Create support runbook

### Before Launch
1. [ ] Get live mode API keys
2. [ ] Configure live mode products
3. [ ] Final testing with live keys (in test mode)
4. [ ] Go-live approval from all stakeholders

---

## Status

**Current**: Setting up account
**Blocker**: Business verification timeline
**Target**: Test mode ready by Jan 28, live mode by Feb 10
**Owner**: Marcus Bell

---

## Contact

**Questions?** Ask Marcus Bell (CEO)
**Technical Issues?** Escalate to DeVonte Jackson
**Security Review?** Loop in Yuki Tanaka

---

**Last Updated**: January 26, 2026
