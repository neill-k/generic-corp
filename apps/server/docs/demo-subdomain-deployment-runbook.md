# Demo Subdomain Deployment Runbook

**Domain:** demo.genericcorp.com
**Platform:** Vercel
**Owner:** Yuki Tanaka (SRE)
**Status:** Ready for deployment pending DNS access
**Last Updated:** 2026-01-26

---

## Pre-Deployment Checklist

### Prerequisites
- [ ] DNS registrar access credentials from Marcus
- [ ] Landing page repository URL from DeVonte
- [ ] Build configuration details (build command, output dir)
- [ ] Environment variables for demo environment
- [ ] Vercel account access

### Required Information
- **Subdomain:** demo.genericcorp.com
- **Purpose:** Sales demos, analytics dashboard, client previews
- **Traffic:** <100 concurrent users initially
- **SSL/TLS:** Required (automatic via Vercel)
- **Timeline:** Live by Tuesday EOD

---

## Deployment Steps (2-4 Hour Timeline)

### HOUR 1: Vercel Project Setup

#### Step 1.1: Create Vercel Project
```bash
# Option A: Via Vercel CLI
npm i -g vercel
vercel login
cd /path/to/landing-page-repo
vercel --prod

# Option B: Via Vercel Dashboard
# 1. Go to vercel.com/new
# 2. Import Git Repository
# 3. Configure build settings
```

#### Step 1.2: Configure Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

**Note:** Get actual values from DeVonte

#### Step 1.3: Set Environment Variables
```bash
# In Vercel dashboard or CLI
vercel env add VARIABLE_NAME production
```

**Required env vars:** TBD from DeVonte

#### Step 1.4: Initial Deployment
```bash
vercel --prod
# Note the deployment URL (e.g., landing-page-abc123.vercel.app)
# Test this URL to ensure build succeeds
```

**Success Criteria:**
- Build completes without errors
- Temporary Vercel URL loads correctly
- All assets and pages render properly

---

### HOUR 2: DNS Configuration

#### Step 2.1: Get Vercel DNS Records
In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add custom domain: demo.genericcorp.com
3. Vercel will show required DNS records

**Typical DNS Configuration:**
```
Type: CNAME
Name: demo
Value: cname.vercel-dns.com (or project-specific CNAME)
TTL: 3600
```

#### Step 2.2: Configure DNS at Registrar
**Option A: Direct Access**
1. Log into DNS registrar (credentials from Marcus)
2. Navigate to DNS settings for genericcorp.com
3. Add CNAME record as specified by Vercel
4. Save changes

**Option B: Marcus Configures**
1. Provide exact DNS record details to Marcus
2. Marcus creates the record
3. Verify record creation via dig/nslookup

#### Step 2.3: Verify DNS Propagation
```bash
# Check DNS propagation
dig demo.genericcorp.com
nslookup demo.genericcorp.com

# Check from multiple locations
# https://www.whatsmydns.net/#CNAME/demo.genericcorp.com
```

**Success Criteria:**
- DNS query returns correct CNAME/A record
- Propagation visible from multiple regions
- Vercel detects custom domain configuration

---

### HOUR 3: SSL/TLS & Verification

#### Step 3.1: SSL Certificate Provisioning
Vercel automatically provisions SSL via Let's Encrypt once DNS is configured.

**Monitor SSL provisioning:**
1. Vercel Dashboard → Domains
2. Status should show: "Valid Configuration"
3. Certificate should auto-provision within 5-10 minutes

#### Step 3.2: Verify HTTPS
```bash
# Test HTTPS connection
curl -I https://demo.genericcorp.com

# Check SSL certificate details
openssl s_client -connect demo.genericcorp.com:443 -servername demo.genericcorp.com

# Verify SSL rating (should be A+)
# https://www.ssllabs.com/ssltest/analyze.html?d=demo.genericcorp.com
```

#### Step 3.3: Test from Multiple Regions
```bash
# Use tools to test from different geographic locations:
# - https://tools.keycdn.com/performance
# - https://www.webpagetest.org/
```

**Success Criteria:**
- HTTPS loads without certificate warnings
- SSL certificate is valid and trusted
- SSL Labs rating: A or A+
- Page loads in <2 seconds globally

---

### HOUR 4: Monitoring & Handoff

#### Step 4.1: Configure Uptime Monitoring
**UptimeRobot Setup:**
```
Monitor Type: HTTPS
URL: https://demo.genericcorp.com
Monitoring Interval: 60 seconds
Alert Contacts: team@genericcorp.com
Alert Threshold: 2 minutes downtime
```

**Alternative: Custom monitoring script**
```bash
# Add to cron or monitoring system
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://demo.genericcorp.com)
if [ $response != "200" ]; then
  echo "ALERT: demo.genericcorp.com returned $response"
  # Send alert via email/Slack
fi
```

#### Step 4.2: Configure SSL Monitoring
```
Monitor Type: SSL Certificate
URL: demo.genericcorp.com
Alert Threshold: 30 days before expiry
```

**Note:** Vercel auto-renews, but good to monitor anyway

#### Step 4.3: Setup Performance Monitoring
**Add to Grafana Dashboard:**
```json
{
  "title": "Demo Subdomain Performance",
  "panels": [
    {
      "title": "Page Load Time",
      "target": "demo.genericcorp.com",
      "alert_threshold": "2000ms"
    },
    {
      "title": "Uptime Percentage",
      "target": "99.9%"
    }
  ]
}
```

#### Step 4.4: Coordinate with DeVonte
**Testing Checklist for DeVonte:**
- [ ] All pages load correctly
- [ ] Navigation works as expected
- [ ] Forms submit properly
- [ ] Analytics tracking fires
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing complete

#### Step 4.5: Documentation Handoff
Create and share:
1. Deployment architecture diagram
2. DNS configuration details
3. Monitoring dashboard links
4. Runbook for updates/rollbacks
5. Emergency contact procedures

**Success Criteria:**
- All monitoring active and reporting
- DeVonte validates functionality
- Documentation complete and shared
- Team notified of go-live

---

## Post-Deployment Validation

### Immediate Checks (Within 1 hour)
```bash
# 1. HTTP → HTTPS redirect
curl -I http://demo.genericcorp.com
# Should return 301/308 redirect to HTTPS

# 2. DNS resolution
dig demo.genericcorp.com +short

# 3. SSL certificate validity
echo | openssl s_client -connect demo.genericcorp.com:443 2>/dev/null | openssl x509 -noout -dates

# 4. Response time
curl -w "@curl-format.txt" -o /dev/null -s https://demo.genericcorp.com

# 5. Content verification
curl https://demo.genericcorp.com | grep -i "expected-content"
```

### 24-Hour Monitoring
- Monitor uptime percentage (target: 99.9%+)
- Check performance metrics (target: <2s page load)
- Verify no SSL errors reported
- Review access logs for any issues
- Confirm DNS propagation globally complete

---

## Rollback Procedures

### Emergency Rollback (If deployment fails)

#### Option 1: Revert DNS
```bash
# Remove CNAME record for demo.genericcorp.com
# Or point to previous service
# Propagation time: 5-60 minutes
```

#### Option 2: Revert Vercel Deployment
```bash
# Via Vercel CLI
vercel rollback [deployment-url]

# Or via Vercel Dashboard
# Deployments → Select previous deployment → Promote to Production
```

#### Option 3: Maintenance Page
```bash
# Quick fix: Deploy static maintenance page
# While fixing underlying issue
vercel deploy --prod /path/to/maintenance-page
```

---

## Troubleshooting

### Issue: DNS Not Propagating
**Symptoms:** nslookup returns old/no records
**Solutions:**
1. Check TTL on old record (may need to wait)
2. Verify DNS record syntax is correct
3. Clear local DNS cache: `sudo dscacheutil -flushcache` (macOS)
4. Use Google DNS for testing: `dig @8.8.8.8 demo.genericcorp.com`

### Issue: SSL Certificate Not Provisioning
**Symptoms:** HTTPS shows certificate error
**Solutions:**
1. Verify DNS is fully propagated (required for Let's Encrypt)
2. Check Vercel domain status in dashboard
3. Remove and re-add domain in Vercel
4. Wait 10-15 minutes for automatic retry

### Issue: Build Failing on Vercel
**Symptoms:** Deployment fails, error logs in Vercel
**Solutions:**
1. Review build logs in Vercel dashboard
2. Verify build command is correct
3. Check environment variables are set
4. Test build locally: `npm run build`
5. Review dependency versions in package.json

### Issue: Site Loads Slow
**Symptoms:** Page load time >2 seconds
**Solutions:**
1. Check Vercel analytics for performance metrics
2. Verify CDN is serving content (check response headers)
3. Optimize images and assets
4. Enable compression in Vercel config
5. Review Core Web Vitals in Chrome DevTools

---

## Monitoring & Alerts

### Alert Channels
- **Email:** team@genericcorp.com
- **Slack:** #infrastructure-alerts (if configured)
- **SMS:** Emergency contacts only

### Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Uptime | <99.5% | <99% | Investigate immediately |
| Response Time | >2s | >5s | Check Vercel status |
| SSL Expiry | <30 days | <7 days | Verify auto-renewal |
| Error Rate | >0.1% | >1% | Review logs |

### Escalation Path
1. **First Alert:** Yuki investigates (SRE)
2. **Persistent Issues:** Loop in DeVonte (Dev)
3. **Critical Outage:** Notify Marcus (CEO)

---

## Maintenance Windows

### Scheduled Updates
- **Deployment:** Can deploy anytime (zero-downtime)
- **DNS Changes:** Coordinate with team, announce in advance
- **SSL Renewal:** Automatic (no maintenance window needed)

### Emergency Maintenance
If emergency maintenance needed:
1. Post status update to team
2. Deploy maintenance page if necessary
3. Fix issue and redeploy
4. Verify functionality
5. Notify team of resolution

---

## Success Metrics

### Technical KPIs
- **Uptime:** 99.9%+ (target: 99.95%)
- **Page Load Time:** <2 seconds (P95)
- **SSL Rating:** A or A+
- **Time to First Byte:** <500ms
- **DNS Resolution:** <50ms

### Business KPIs
- Live demo environment for sales team
- Professional client experience
- Zero maintenance overhead
- Foundation for future demo environments

---

## Vercel Platform Details

### Free Tier Limits
- 100GB bandwidth/month
- Unlimited domains
- Automatic SSL/TLS
- Global CDN
- Unlimited deployments

### Monitoring Current Usage
```bash
# Via Vercel CLI
vercel inspect

# Or in Vercel Dashboard
# Project → Usage
```

### When to Upgrade
- Bandwidth exceeds 90GB/month
- Need advanced analytics
- Require team collaboration features
- Custom SLAs needed

---

## Contacts & Resources

### Team
- **Yuki Tanaka** (SRE/Owner): Infrastructure, DNS, monitoring
- **DeVonte Jackson** (Developer): Application code, testing
- **Marcus Bell** (CEO): DNS access, approvals

### External Resources
- **Vercel Dashboard:** https://vercel.com/dashboard
- **DNS Registrar:** TBD (from Marcus)
- **UptimeRobot:** https://uptimerobot.com/
- **SSL Labs:** https://www.ssllabs.com/ssltest/

### Documentation
- **Setup Plan:** `/apps/server/docs/demo-subdomain-setup-plan.md`
- **This Runbook:** `/apps/server/docs/demo-subdomain-deployment-runbook.md`
- **Architecture Review:** `/apps/server/docs/multi-tenant-architecture-review.md`

---

## Deployment Timeline Summary

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| **Planning** | Complete | Architecture, platform selection | ✅ Done |
| **DNS Access** | Pending | Waiting on Marcus | ⏳ In Progress |
| **Vercel Setup** | 1 hour | Project creation, build config | 📋 Ready |
| **DNS Config** | 1 hour | Record creation, propagation | 📋 Ready |
| **SSL & Test** | 1 hour | Certificate, verification | 📋 Ready |
| **Monitoring** | 1 hour | Alerts, dashboards, handoff | 📋 Ready |
| **Total** | 2-4 hours | End-to-end deployment | ⏳ Pending DNS |

---

**Next Action:** Waiting for DNS credentials from Marcus

**Estimated Completion:** Tuesday EOD (once DNS access provided)

**Owner:** Yuki Tanaka
**Last Updated:** 2026-01-26 21:30 UTC
