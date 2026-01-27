# Vercel Landing Page Deployment Guide

**Platform**: Vercel
**Domain**: agenthq.com
**Purpose**: Marketing/landing page for AgentHQ
**Timeline**: 30 minutes setup time

---

## Prerequisites

- [x] Domain purchased (agenthq.com)
- [x] Landing page code in repository
- [x] Vercel account created

---

## Step 1: Install Vercel CLI

```bash
# Install globally
npm install -g vercel

# Or use via npx (no install required)
npx vercel --version
```

---

## Step 2: Project Structure

Expected structure:
```
apps/landing/          # Landing page directory
├── package.json       # Dependencies
├── next.config.js     # Next.js config (if using Next.js)
├── public/            # Static assets
└── src/               # Source code
```

Or wherever DeVonte puts the landing page code.

---

## Step 3: Deploy to Vercel

### Option A: Deploy via CLI (Recommended for first deploy)

```bash
# Navigate to landing page directory
cd apps/landing

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - What's your project name? agenthq-landing
# - In which directory is your code? ./
# - Auto-detect project settings? Yes
```

Vercel will output a URL like: `https://agenthq-landing.vercel.app`

### Option B: Deploy via GitHub Integration (Better for ongoing deploys)

1. Go to https://vercel.com/new
2. Import Git Repository
3. Select the generic-corp repository
4. Configure:
   - Framework Preset: Next.js (or auto-detect)
   - Root Directory: `apps/landing`
   - Build Command: `npm run build` (or auto-detect)
   - Output Directory: `.next` or `dist` (auto-detect)
5. Click "Deploy"

**Benefit**: Auto-deploys on every git push to main

---

## Step 4: Configure Custom Domain

### In Vercel Dashboard:

1. Go to project settings
2. Click "Domains" tab
3. Add domain: `agenthq.com`
4. Add domain: `www.agenthq.com`

Vercel will provide DNS configuration instructions.

### DNS Configuration (at Domain Registrar):

**For Root Domain (agenthq.com)**:
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**For WWW Subdomain**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Alternative (if registrar supports ANAME/ALIAS)**:
```
Type: ANAME or ALIAS
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

**Recommendation**: Use Cloudflare as DNS provider if current registrar doesn't support ANAME/ALIAS.

---

## Step 5: SSL Certificate

**Automatic**: Vercel provisions SSL certificates automatically via Let's Encrypt.

**Timeline**:
- Certificate issued: < 5 minutes after DNS propagates
- DNS propagation: 5 minutes to 24 hours (usually < 1 hour)

**Status Check**:
1. Go to Vercel dashboard → Domains
2. Look for green checkmark next to domain
3. Certificate status shows "Valid"

---

## Step 6: Environment Variables (if needed)

If the landing page needs environment variables:

### In Vercel Dashboard:
1. Go to project settings
2. Click "Environment Variables" tab
3. Add variables:

```
VITE_API_URL=https://demo.agenthq.com
VITE_ANALYTICS_ID=xxx
```

Or via CLI:
```bash
vercel env add VITE_API_URL production
# Enter value: https://demo.agenthq.com
```

---

## Step 7: Verify Deployment

### Check DNS Propagation:
```bash
# Check if DNS is propagated
dig agenthq.com
nslookup agenthq.com

# Should resolve to Vercel's IP (76.76.21.21)
```

### Test Website:
```bash
# Check HTTP response
curl -I https://agenthq.com

# Should return:
# HTTP/2 200
# server: Vercel
```

### Browser Test:
1. Visit https://agenthq.com
2. Check SSL certificate (padlock icon)
3. Verify page loads correctly
4. Test on mobile (responsive design)

---

## Step 8: Performance Optimization

### Vercel Analytics (Optional):
```bash
# Add Vercel Analytics package
cd apps/landing
npm install @vercel/analytics

# Add to app entry point
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

### Speed Insights (Optional):
```bash
npm install @vercel/speed-insights

import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App() {
  return (
    <>
      <YourApp />
      <SpeedInsights />
    </>
  );
}
```

---

## Step 9: Monitoring Setup

### Vercel Built-in Monitoring:
- Dashboard → Analytics (page views, top pages)
- Dashboard → Speed Insights (performance metrics)
- Dashboard → Logs (deployment and runtime logs)

### External Monitoring (Optional):

**UptimeRobot** (free uptime monitoring):
1. Go to https://uptimerobot.com
2. Add new monitor:
   - Type: HTTP(s)
   - URL: https://agenthq.com
   - Interval: 5 minutes
3. Add alert contacts (email, Slack)

**Google Analytics** (if needed):
1. Create GA4 property
2. Add tracking code to landing page
3. Or use Vercel Analytics instead (privacy-friendly)

---

## Troubleshooting

### Domain Not Resolving

**Symptom**: agenthq.com shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Fix**:
1. Check DNS records are correct (see Step 4)
2. Wait for DNS propagation (can take up to 24 hours)
3. Clear DNS cache:
   ```bash
   # Mac
   sudo dscacheutil -flushcache

   # Windows
   ipconfig /flushdns
   ```

### SSL Certificate Not Issued

**Symptom**: "Your connection is not private" error

**Fix**:
1. Verify DNS is pointing to Vercel (dig agenthq.com)
2. Wait 5-10 minutes for certificate provisioning
3. Check Vercel dashboard → Domains for certificate status
4. If stuck, remove domain and re-add it

### Build Failing

**Symptom**: Deployment shows "Build Failed"

**Fix**:
1. Check Vercel deployment logs
2. Verify build works locally:
   ```bash
   cd apps/landing
   npm install
   npm run build
   ```
3. Check environment variables are set
4. Ensure all dependencies are in package.json

### Wrong Directory Deployed

**Symptom**: 404 on all pages or wrong content

**Fix**:
1. Update Root Directory in Vercel settings
2. Should be: `apps/landing` (or wherever code lives)
3. Redeploy

---

## Configuration Files

### vercel.json (Optional)

Create in landing page root for custom configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://demo.agenthq.com/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## Cost Estimate

**Vercel Hobby (Free) Tier**:
- Bandwidth: 100 GB/month
- Builds: Unlimited
- Domains: Unlimited
- Team members: 1
- Analytics: Included

**When to Upgrade** (Vercel Pro - $20/month):
- Bandwidth exceeds 100 GB/month
- Need team collaboration
- Need advanced analytics
- Need custom deployment hooks

**Estimated Timeline to Upgrade**:
- If we get 10K+ visitors/month: Consider upgrade
- Probably not needed for first 3 months

---

## Post-Deployment Checklist

- [ ] Domain resolves correctly (https://agenthq.com)
- [ ] WWW redirect works (https://www.agenthq.com → https://agenthq.com)
- [ ] SSL certificate valid (green padlock)
- [ ] Page loads in < 3 seconds (test on mobile)
- [ ] All links work (test CTA buttons)
- [ ] Analytics tracking (if configured)
- [ ] Uptime monitoring active
- [ ] Preview deployments work (test with branch deploy)

---

## Ongoing Maintenance

### Auto-Deploy on Git Push:
- Every push to `main` branch auto-deploys to production
- Every pull request creates preview deployment
- Preview URL: `https://agenthq-landing-git-branch-name.vercel.app`

### Rollback if Needed:
1. Go to Vercel dashboard → Deployments
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"

### Monitor Performance:
- Check Vercel dashboard weekly
- Review analytics (traffic, top pages)
- Monitor build times (should be < 2 minutes)

---

## Summary

**Total Time**: 30 minutes (after DNS propagates)

**Steps**:
1. Deploy via Vercel CLI or GitHub integration (5 min)
2. Add custom domain in dashboard (2 min)
3. Update DNS records at registrar (5 min)
4. Wait for DNS propagation (5 min - 24 hours)
5. Verify SSL certificate (automatic)
6. Test and monitor

**Cost**: $0/month (free tier)

**Confidence**: 99% success rate (standard Vercel deployment)

---

**Status**: ✅ READY TO EXECUTE
**Waiting On**: Domain credentials + landing page code
**Owner**: Yuki Tanaka
