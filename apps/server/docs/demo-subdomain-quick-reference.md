# Demo Subdomain - Quick Reference Guide

**URL:** https://demo.genericcorp.com
**Platform:** Vercel
**Owner:** Yuki Tanaka (SRE)
**Last Updated:** 2026-01-26

---

## For Everyone

### Accessing the Demo
- **URL:** https://demo.genericcorp.com
- **Purpose:** Sales demos, client previews, analytics dashboard
- **Uptime Target:** 99.9%+
- **Expected Performance:** <2 second page load time

### Reporting Issues
1. Check status: Run monitoring script or check Vercel dashboard
2. Contact Yuki (SRE) for infrastructure issues
3. Contact DeVonte (Dev) for application issues
4. Escalate to Marcus for critical outages

---

## For Developers (DeVonte)

### Deploying Updates
```bash
# Via Git (automatic deployment)
git push origin main
# Vercel auto-deploys on push to main branch

# Or via Vercel CLI
vercel --prod
```

### Viewing Deployment Logs
```bash
# Via Vercel CLI
vercel logs demo.genericcorp.com --follow

# Or in Vercel Dashboard
# https://vercel.com/dashboard → project → Deployments
```

### Rolling Back
```bash
# Via Vercel CLI
vercel rollback [deployment-url]

# Or in Vercel Dashboard
# Deployments → Select previous deployment → Promote
```

### Environment Variables
```bash
# List all env vars
vercel env ls

# Add new env var
vercel env add VARIABLE_NAME production

# Remove env var
vercel env rm VARIABLE_NAME production
```

---

## For SRE (Yuki)

### Running Health Checks
```bash
# Manual health check
cd /home/nkillgore/generic-corp/apps/server/scripts
./monitor-demo-subdomain.sh

# Add to cron for automated monitoring (every 5 minutes)
*/5 * * * * /home/nkillgore/generic-corp/apps/server/scripts/monitor-demo-subdomain.sh
```

### Checking DNS Status
```bash
# Check DNS resolution
dig demo.genericcorp.com

# Check from multiple locations
nslookup demo.genericcorp.com 8.8.8.8

# Check DNS propagation globally
# https://www.whatsmydns.net/#A/demo.genericcorp.com
```

### SSL Certificate Management
```bash
# Check certificate details
openssl s_client -connect demo.genericcorp.com:443 -servername demo.genericcorp.com

# Check certificate expiry
echo | openssl s_client -connect demo.genericcorp.com:443 2>/dev/null | openssl x509 -noout -dates

# Test SSL configuration
# https://www.ssllabs.com/ssltest/analyze.html?d=demo.genericcorp.com
```

**Note:** Vercel auto-renews SSL certificates. No manual intervention needed.

### Performance Testing
```bash
# Response time test
curl -w "@curl-format.txt" -o /dev/null -s https://demo.genericcorp.com

# Load testing (use carefully)
ab -n 100 -c 10 https://demo.genericcorp.com/

# Or use online tools:
# - WebPageTest: https://www.webpagetest.org/
# - GTmetrix: https://gtmetrix.com/
# - Pingdom: https://tools.pingdom.com/
```

### Viewing Metrics
```bash
# Vercel analytics (CLI)
vercel inspect demo.genericcorp.com

# Or Vercel Dashboard
# https://vercel.com/dashboard → project → Analytics

# Custom monitoring script
cd /home/nkillgore/generic-corp/apps/server/scripts
./monitor-demo-subdomain.sh
```

---

## For CEO (Marcus)

### Quick Status Check
**Current Status:** 🟢 Operational (update after deployment)

**Key Metrics:**
- Uptime: 99.9%+ target
- Response Time: <2s target
- SSL: Valid, auto-renewing
- Cost: $0/month (Vercel free tier)

### DNS Management
**Registrar:** TBD (to be provided)
**Current DNS Records:**
```
Type: CNAME
Name: demo
Value: cname.vercel-dns.com
TTL: 3600
```

### Making DNS Changes
⚠️ **Warning:** Only change DNS if absolutely necessary. Coordinate with Yuki first.

1. Log into DNS registrar
2. Navigate to DNS settings for genericcorp.com
3. Make changes carefully (backup existing records first)
4. Verify changes with: `dig demo.genericcorp.com`

### Emergency Contacts
- **Yuki Tanaka** (SRE): Infrastructure, DNS, monitoring
- **DeVonte Jackson** (Developer): Application, deployments
- **Vercel Support:** https://vercel.com/support

---

## Common Tasks

### Task: Update the Landing Page Content
**Who:** DeVonte
**How:**
1. Make changes to landing page code
2. Commit and push to Git repository
3. Vercel auto-deploys (or run `vercel --prod`)
4. Verify changes at https://demo.genericcorp.com
5. Rollback if needed: `vercel rollback [deployment-url]`

### Task: Add New Environment Variable
**Who:** DeVonte or Yuki
**How:**
```bash
vercel env add NEW_VARIABLE production
# Enter value when prompted
vercel --prod  # Redeploy to apply changes
```

### Task: Point Subdomain to Different Service
**Who:** Yuki (coordinate with Marcus for DNS access)
**How:**
1. Identify new target (IP address or CNAME)
2. Update DNS record in registrar
3. Wait for DNS propagation (5-60 minutes)
4. Verify with `dig demo.genericcorp.com`

### Task: Temporarily Take Site Down
**Who:** Yuki
**How:**
```bash
# Option 1: Deploy maintenance page
vercel deploy --prod /path/to/maintenance-page

# Option 2: Remove DNS record (slower)
# Remove CNAME record in DNS registrar

# Option 3: Use Vercel's protection mode
# Vercel Dashboard → Settings → Deployment Protection
```

### Task: Check Why Site Is Slow
**Who:** Yuki or DeVonte
**How:**
1. Run monitoring script: `./monitor-demo-subdomain.sh`
2. Check Vercel analytics for performance data
3. Use Chrome DevTools → Network tab
4. Check Vercel status: https://www.vercel-status.com/
5. Review application code for optimization opportunities

### Task: Investigate Downtime
**Who:** Yuki
**How:**
1. Check monitoring alerts/logs
2. Verify DNS resolution: `dig demo.genericcorp.com`
3. Check site availability: `curl -I https://demo.genericcorp.com`
4. Review Vercel deployment status
5. Check Vercel status page for platform issues
6. Review application logs in Vercel dashboard

---

## Monitoring & Alerts

### Automated Monitoring
**Script:** `/apps/server/scripts/monitor-demo-subdomain.sh`
**Frequency:** Every 5 minutes (once configured in cron)
**Checks:**
- DNS resolution
- HTTPS redirect
- Site availability
- Response time
- SSL certificate validity
- Content verification

### Manual Monitoring
**Vercel Dashboard:** https://vercel.com/dashboard
**Uptime Monitor:** TBD (UptimeRobot or similar)
**SSL Labs:** https://www.ssllabs.com/ssltest/

### Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Uptime | <99.5% | <99% |
| Response Time | >2s | >5s |
| SSL Expiry | <30 days | <7 days |
| HTTP Errors | >0.1% | >1% |

---

## Troubleshooting

### Problem: Site Not Loading
**Symptoms:** Browser shows "site can't be reached"
**Quick Fixes:**
1. Check DNS: `dig demo.genericcorp.com`
2. Check site status: `curl -I https://demo.genericcorp.com`
3. Verify Vercel deployment status
4. Check DNS propagation: https://www.whatsmydns.net/

### Problem: SSL Certificate Error
**Symptoms:** Browser shows "Your connection is not private"
**Quick Fixes:**
1. Wait 10-15 minutes (Vercel may be provisioning)
2. Check domain configuration in Vercel dashboard
3. Verify DNS is correctly pointed to Vercel
4. Remove and re-add domain in Vercel if needed

### Problem: Slow Load Times
**Symptoms:** Page takes >2 seconds to load
**Quick Fixes:**
1. Check Vercel CDN status
2. Run performance test: WebPageTest or GTmetrix
3. Review Vercel analytics for bottlenecks
4. Optimize images and assets
5. Check for geographic routing issues

### Problem: 404 Errors
**Symptoms:** Page not found errors
**Quick Fixes:**
1. Verify correct URL (https://demo.genericcorp.com)
2. Check Vercel deployment logs
3. Verify build succeeded
4. Check routing configuration in application code

---

## Cost & Billing

### Current Plan
**Platform:** Vercel Free Tier
**Cost:** $0/month
**Limits:**
- 100GB bandwidth/month
- Unlimited domains
- Unlimited deployments

### Usage Monitoring
**Check usage:** Vercel Dashboard → Project → Usage
**Alert threshold:** 90GB bandwidth (90% of free tier)

### When to Upgrade
Upgrade to Vercel Pro ($20/month) if:
- Bandwidth consistently exceeds 90GB/month
- Need advanced analytics
- Require team collaboration features
- Need higher performance/priority support

---

## Resources & Links

### Documentation
- **Setup Plan:** `/apps/server/docs/demo-subdomain-setup-plan.md`
- **Deployment Runbook:** `/apps/server/docs/demo-subdomain-deployment-runbook.md`
- **This Guide:** `/apps/server/docs/demo-subdomain-quick-reference.md`

### External Resources
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **SSL Labs:** https://www.ssllabs.com/ssltest/
- **DNS Checker:** https://www.whatsmydns.net/
- **Status Page:** https://www.vercel-status.com/

### Internal Tools
- **Monitoring Script:** `/apps/server/scripts/monitor-demo-subdomain.sh`
- **Grafana Dashboard:** `/apps/server/grafana-dashboard.json`

---

## Best Practices

### For Deployments
1. ✅ Test changes locally before deploying
2. ✅ Deploy during low-traffic hours (if significant changes)
3. ✅ Monitor deployment for first 30 minutes
4. ✅ Have rollback plan ready
5. ✅ Communicate deployment to team

### For DNS Changes
1. ✅ Coordinate with Yuki before making changes
2. ✅ Document changes and reasons
3. ✅ Backup existing DNS records
4. ✅ Use appropriate TTL values (3600 recommended)
5. ✅ Verify changes after propagation

### For Monitoring
1. ✅ Run health checks before and after changes
2. ✅ Monitor uptime and performance trends
3. ✅ Set up alerts for critical metrics
4. ✅ Review logs regularly
5. ✅ Keep runbook documentation updated

---

## FAQ

**Q: How do I deploy an update to the landing page?**
A: Push changes to Git. Vercel auto-deploys. Or run `vercel --prod`.

**Q: What if I need to roll back a deployment?**
A: Run `vercel rollback [deployment-url]` or use Vercel Dashboard.

**Q: How long does DNS propagation take?**
A: Typically 5-60 minutes, but can take up to 24 hours globally.

**Q: Does SSL certificate renew automatically?**
A: Yes, Vercel auto-renews via Let's Encrypt. No action needed.

**Q: What's the cost of this infrastructure?**
A: $0/month on Vercel free tier (covers current traffic levels).

**Q: Who do I contact for issues?**
A: Yuki (infrastructure), DeVonte (application), Marcus (urgent/business).

**Q: Can I use this for production?**
A: This is for demos/previews. Production should use main domain.

**Q: How do I check if the site is down?**
A: Run `./monitor-demo-subdomain.sh` or check Vercel dashboard.

---

**Status:** Ready for deployment (pending DNS access)
**Owner:** Yuki Tanaka (SRE)
**Last Updated:** 2026-01-26
**Next Update:** After successful deployment
