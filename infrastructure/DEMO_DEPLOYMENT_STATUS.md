# Demo Subdomain Deployment Status
**Domain**: demo.genericcorp.com
**Date**: January 26, 2026
**SRE**: Yuki Tanaka
**Status**: 🟡 READY FOR DNS CONFIGURATION

---

## Executive Summary

The infrastructure for demo.genericcorp.com is **fully prepared** and ready for deployment. All configuration files, security measures, and monitoring scripts are in place. The only remaining step is DNS configuration and deployment execution.

**Recommended Approach**: Vercel deployment (fastest path to production - ~30 minutes)

---

## Infrastructure Readiness Checklist

### ✅ Completed

- [x] **Deployment Scripts**: Automated deploy.sh script ready
- [x] **Vercel Configuration**: vercel.json with security headers configured
- [x] **Docker Compose**: Self-hosted option available (docker-compose.demo.yml)
- [x] **Nginx Configuration**: Reverse proxy with rate limiting ready
- [x] **Security Headers**: X-Frame-Options, CSP, HSTS configured
- [x] **Monitoring Scripts**: Uptime monitoring script created
- [x] **Rate Limiting**: 100 req/min per IP configured
- [x] **SSL/TLS**: Auto-provisioning via Let's Encrypt (self-hosted) or Vercel (managed)
- [x] **Documentation**: Comprehensive README in infrastructure/

### 🟡 Pending (External Dependencies)

- [ ] **DNS Configuration**: Need to add DNS records for demo.genericcorp.com
- [ ] **Deployment Execution**: Run deploy script after DNS is ready
- [ ] **Domain Verification**: Verify SSL certificate after deployment
- [ ] **Health Check Monitoring**: Configure monitoring after deployment

---

## Deployment Options

### Option 1: Vercel (RECOMMENDED)

**Why**: Fastest, easiest, most reliable for a public demo.

**Pros**:
- Zero-config SSL and CDN
- Instant deployments (~5 minutes)
- Free tier for demo traffic
- Automatic scaling and edge optimization
- Built-in analytics

**Timeline**: ~30 minutes from start to live

**Steps**:
```bash
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Navigate to deployment directory
cd /home/nkillgore/generic-corp/infrastructure/deployment

# 3. Run deployment script
./deploy.sh

# 4. Configure custom domain in Vercel dashboard
# Add demo.genericcorp.com in project settings
```

**DNS Configuration** (for Vercel):
```
Type: CNAME
Name: demo
Value: cname.vercel-dns.com
TTL: 3600
```

**Cost**: $0/month (free tier)

---

### Option 2: Self-Hosted

**Why**: More control, suitable if we need custom infrastructure.

**Pros**:
- Full infrastructure control
- Custom rate limiting rules
- No third-party dependencies
- Data sovereignty

**Timeline**: ~2-3 hours (including DNS propagation)

**Steps**:
```bash
# 1. Set environment variables
export DEMO_DOMAIN=demo.genericcorp.com
export DEPLOY_TYPE=self-hosted

# 2. Run deployment
cd /home/nkillgore/generic-corp/infrastructure/deployment
./deploy.sh

# 3. Wait for SSL certificate provisioning
# 4. Verify deployment
```

**DNS Configuration** (for self-hosted):
```
Type: A
Name: demo
Value: [Your server IP address]
TTL: 3600
```

**Cost**: ~$5-10/month (small VPS)

---

## Security Measures Implemented

### Rate Limiting
- **Default Limit**: 100 requests/minute per IP
- **Burst Allowance**: 20 requests
- **Block Duration**: 5 minutes
- **Implementation**: nginx.conf rate_limit_zone

### SSL/TLS Security
- **Protocol**: TLS 1.2+ only (TLS 1.0/1.1 disabled)
- **Certificate**: Let's Encrypt (auto-renewal every 90 days)
- **HSTS**: Enabled with 1-year max-age
- **Forward Secrecy**: Enabled

### HTTP Security Headers
All configured in vercel.json and nginx.conf:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Infrastructure Isolation
Demo environment runs separately:
- Separate database instance (PostgreSQL on port 5433)
- Separate Redis instance (port 6380)
- Read-only mode enforced
- No access to production data

---

## Monitoring & Alerting

### Health Checks
**Script Location**: `/home/nkillgore/generic-corp/infrastructure/monitoring/uptime_monitor.sh`

**Monitoring Endpoints**:
- Landing Page: https://demo.genericcorp.com/
- Health Check: https://demo.genericcorp.com/health (if API is deployed)

**Recommended Cron Schedule**:
```bash
# Check every 5 minutes
*/5 * * * * /home/nkillgore/generic-corp/infrastructure/monitoring/uptime_monitor.sh
```

### Metrics to Track
- **Uptime**: 5-minute interval checks
- **Response Time**: Page load performance
- **Error Rates**: 4xx/5xx responses
- **Rate Limit Hits**: Track blocked IPs
- **SSL Certificate Expiry**: Auto-renewed, but monitor

### Alerting (Optional)
Configure Slack webhook for alerts:
```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## Performance Optimization

### CDN & Caching
- **Static Assets**: Cached for 1 hour
- **Compression**: Gzip enabled for all text content
- **HTTP/2**: Enabled for multiplexing
- **Browser Caching**: Cache-Control headers configured

### Resource Limits (Self-Hosted)
- **PostgreSQL**: 256MB RAM limit
- **Redis**: 256MB RAM limit with LRU eviction
- **API Server**: 512MB RAM, 2 workers

---

## Post-Deployment Checklist

Once deployed, verify the following:

### Immediate Verification (within 1 hour)
- [ ] Domain resolves correctly (`nslookup demo.genericcorp.com`)
- [ ] SSL certificate is valid and trusted (check browser)
- [ ] Landing page loads correctly (https://demo.genericcorp.com)
- [ ] Security headers are present (check browser DevTools)
- [ ] Page load time < 2 seconds (from US locations)

### Within 24 Hours
- [ ] Monitor uptime (should be 100% in first 24h)
- [ ] Check for any 4xx/5xx errors in logs
- [ ] Verify rate limiting works (test with burst requests)
- [ ] Test from multiple geographic locations
- [ ] Set up monitoring alerts (if using Slack/email)

### Within 1 Week
- [ ] Review access logs (any suspicious activity?)
- [ ] Check SSL certificate expiry date
- [ ] Monitor resource usage (CPU, memory, bandwidth)
- [ ] Verify backups are running (if self-hosted)
- [ ] Document any issues or optimizations needed

---

## Troubleshooting Guide

### DNS Not Resolving
**Symptom**: Domain doesn't resolve or times out

**Solutions**:
```bash
# Check DNS propagation
nslookup demo.genericcorp.com
dig demo.genericcorp.com

# Wait for DNS propagation (can take 5-60 minutes)
# Clear local DNS cache
sudo systemd-resolve --flush-caches  # Linux
dscacheutil -flushcache  # macOS
```

### SSL Certificate Issues
**Symptom**: Browser shows "Not Secure" warning

**Solutions**:
```bash
# For self-hosted: Manually renew certificate
docker run -it --rm \
  -v $(pwd)/ssl:/etc/letsencrypt \
  certbot/certbot renew

# For Vercel: Check domain verification in dashboard
vercel domains inspect demo.genericcorp.com
```

### Rate Limiting Too Aggressive
**Symptom**: Legitimate users getting blocked

**Solutions**:
```bash
# Edit nginx.conf and increase rate limit
# Change: rate=100r/m to rate=200r/m
# Then restart: docker-compose -f docker-compose.demo.yml restart demo-nginx
```

### Deployment Fails
**Symptom**: Deploy script errors

**Solutions**:
```bash
# Check logs
docker-compose -f docker-compose.demo.yml logs

# Verify prerequisites
vercel --version  # Should show version if installed
docker --version  # Should show version if installed

# Check landing page builds
cd /home/nkillgore/generic-corp/apps/landing
pnpm build  # Should complete without errors
```

---

## Cost Estimation

### Vercel Deployment
- **Hosting**: $0/month (free tier)
- **Bandwidth**: 100GB free/month
- **Build Minutes**: Unlimited for hobby projects
- **Custom Domain**: Included
- **SSL**: Included
- **Total**: **$0-5/month** (stays free unless traffic is very high)

### Self-Hosted Deployment
- **VPS**: $5-10/month (DigitalOcean, Linode, Hetzner)
- **Domain**: Already owned (no extra cost)
- **SSL Certificate**: Free (Let's Encrypt)
- **Bandwidth**: Usually 1TB+ included
- **Total**: **$5-10/month**

---

## Maintenance Schedule

### Daily (Automated)
- Health check monitoring (every 5 minutes)
- SSL certificate expiry check (auto-renewed at 30 days)

### Weekly (Manual - 5 minutes)
- Review access logs for errors
- Check uptime metrics
- Monitor bandwidth usage

### Monthly (Manual - 15 minutes)
- Review security headers are still applied
- Check for any failed SSL renewal attempts
- Update dependencies if needed
- Review performance metrics

### Quarterly (Manual - 30 minutes)
- Security audit of configuration
- Performance optimization review
- Cost optimization check
- Backup strategy verification (if self-hosted)

---

## Next Steps

### For Marcus (Project Coordination)
1. **DNS Configuration**: Provide access to domain registrar or add DNS records:
   - For Vercel: CNAME record pointing demo → cname.vercel-dns.com
   - For Self-hosted: A record pointing demo → server IP
2. **Deployment Approval**: Confirm we should proceed with Vercel (recommended)
3. **Monitoring Setup**: Decide if we want Slack alerts (optional, can add later)

### For Yuki (Infrastructure Execution)
Once DNS is configured:
1. Run deployment script: `./deploy.sh`
2. Verify deployment success
3. Set up monitoring cron job
4. Document actual deployment results
5. Share live URL with team

### For Team (Post-Launch)
1. Test the demo site from various locations
2. Provide feedback on performance
3. Report any issues immediately
4. Use the demo URL in outreach materials

---

## Contact & Support

**SRE Contact**: Yuki Tanaka
**Response Time**: < 2 hours during business hours
**After Hours**: Emergency only (critical downtime)

**Escalation Path**:
1. Yuki Tanaka (Infrastructure)
2. Sable Chen (Technical Architecture)
3. Marcus Bell (Project Owner)

---

## Conclusion

The infrastructure is **ready for deployment**. All code, configurations, and security measures are in place. The demo subdomain can be live within 30 minutes once DNS is configured.

**Recommended Path**:
1. Configure DNS (CNAME to Vercel)
2. Run deployment script
3. Verify in browser
4. Set up monitoring
5. Go live! 🚀

**Current Blocker**: Awaiting DNS configuration approval/access

**Confidence Level**: 95% - This is a straightforward deployment with proven tools

---

**Prepared by**: Yuki Tanaka, SRE
**Date**: January 26, 2026
**Status**: Ready for execution pending DNS configuration
