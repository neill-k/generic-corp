# Demo Subdomain Setup Plan

**Subdomain:** demo.genericcorp.com
**Purpose:** Landing page demo for client previews and internal demos
**Priority:** High (revenue-critical)
**Status:** Waiting on DNS access from Marcus
**Owner:** Yuki Tanaka (SRE)

---

## Requirements

From DeVonte Jackson:
- **Subdomain:** demo.genericcorp.com
- **Service:** Landing page demo (static site or Next.js)
- **SSL/TLS:** Yes, HTTPS with valid SSL certificate required
- **Traffic:** Light (<100 concurrent users initially)
- **DNS:** A record or CNAME to deployment platform

---

## Recommended Deployment Architecture

### Primary Recommendation: Vercel

**Why Vercel:**
- Fastest time to deployment (2-4 hours total)
- Zero maintenance overhead
- Automatic SSL/TLS with Let's Encrypt
- Global CDN for <100ms load times
- Free tier handles traffic requirements
- Perfect for static sites and Next.js SSR
- Automatic deployments via git integration

**Infrastructure Features:**
- ✅ 99.9% uptime SLA-ready
- ✅ Automatic SSL renewal
- ✅ DDoS protection via CDN
- ✅ Performance optimization built-in
- ✅ Zero operational costs (free tier)

### Alternative Options

**Railway/Render:**
- Good for Docker deployments
- ~$5-10/month cost
- 4-6 hour deployment timeline
- Better for custom server requirements

**Self-hosted (AWS/DigitalOcean):**
- Maximum control
- More maintenance burden
- ~$5-10/month cost
- 8-12 hour deployment timeline
- Requires: Nginx + Let's Encrypt + PM2 + monitoring

---

## Implementation Timeline

### Current Blocker
**Waiting on:** DNS access to genericcorp.com domain from Marcus

**Options to unblock:**
1. Direct registrar access (Namecheap/GoDaddy/Cloudflare login)
2. Marcus creates DNS record pointing to deployment platform
3. Delegate subdomain NS records to Vercel/Netlify

### Post-Unblock Timeline (2-4 hours)

**Hour 1: Setup & Configuration**
- Create Vercel project
- Connect to repository/build
- Configure build settings
- Set environment variables

**Hour 2: Deployment**
- Initial deployment
- SSL/TLS configuration (automatic)
- Build verification
- Performance testing

**Hour 3: DNS Configuration**
- Point demo.genericcorp.com to Vercel
- Verify DNS propagation
- Confirm HTTPS working
- Test from multiple regions

**Hour 4: Monitoring & Handoff**
- Set up uptime monitoring
- Configure SSL expiry alerts
- Performance baseline metrics
- Documentation handoff
- Coordinate with DeVonte for testing

---

## Coordination Points

### With DeVonte Jackson
Need to coordinate on:
1. **Build process:** Build command, output directory
2. **Environment variables:** API keys, config for demo
3. **Repository access:** Direct connection for auto-deployment
4. **Testing:** Validation scenarios before announcement

### With Marcus Bell
Need from Marcus:
1. **DNS access:** Registrar login or create DNS record
2. **Deployment platform approval:** Confirm Vercel is acceptable
3. **Go-live approval:** Final validation before making public

---

## Monitoring & Reliability

### Uptime Monitoring
- Uptime checks every 60 seconds
- Alert on downtime >2 minutes
- Multi-region health checks

### SSL/TLS Monitoring
- Certificate expiry alerts (30 days before)
- Automatic renewal verification
- TLS configuration validation

### Performance Monitoring
- Page load time tracking
- Core Web Vitals monitoring
- Geographic latency tracking
- Alert on degradation

### Cost Monitoring
- Track infrastructure costs
- Alert on unexpected charges
- Capacity planning metrics

---

## Security Considerations

### Implemented by Default (Vercel)
- ✅ HTTPS/TLS 1.3 enforced
- ✅ DDoS protection via CDN
- ✅ Automatic security headers
- ✅ Edge network protection

### Additional Security (if needed)
- WAF rules for common attacks
- Rate limiting at CDN edge
- Geo-blocking (if required)
- Content Security Policy headers

---

## Documentation Deliverables

Upon completion, will provide:
1. Deployment architecture diagram
2. DNS configuration details
3. Monitoring dashboard access
4. Runbook for common issues
5. Update/rollback procedures
6. Cost and capacity projections

---

## Success Metrics

**Technical:**
- ✅ Sub-2 second page load times
- ✅ 99.9%+ uptime
- ✅ Valid SSL certificate (A+ rating)
- ✅ Global CDN coverage

**Business:**
- ✅ Live demo environment for sales
- ✅ Professional client experience
- ✅ Zero maintenance overhead
- ✅ Foundation for future demo environments

---

## Cost Projection

**Vercel Free Tier (Recommended):**
- $0/month for current traffic levels
- 100GB bandwidth included
- Unlimited domains
- Automatic SSL

**Monitoring (Optional):**
- Free: UptimeRobot basic
- $7/month: Better uptime with advanced features
- Can start free, upgrade if needed

**Total Monthly Cost:** $0-7/month

---

## Next Steps

1. ⏳ **Waiting:** DNS access from Marcus
2. **Ready:** Vercel deployment plan prepared
3. **Ready:** Coordination plan with DeVonte
4. **Ready:** Monitoring and documentation plan

**ETA after unblock:** Same day deployment (2-4 hours)

---

**Last Updated:** 2026-01-26
**Status:** Planning complete, waiting on DNS access
**Owner:** Yuki Tanaka
**Stakeholders:** Marcus Bell (CEO), DeVonte Jackson (Developer)
