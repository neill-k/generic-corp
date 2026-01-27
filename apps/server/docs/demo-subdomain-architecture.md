# Demo Subdomain Architecture

**Domain:** demo.genericcorp.com
**Platform:** Vercel
**Last Updated:** 2026-01-26

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         END USERS                                │
│              (Sales Demos, Client Previews)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS Request
                         │ (demo.genericcorp.com)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DNS RESOLUTION                              │
│  Registrar: [TBD - Namecheap/GoDaddy/Cloudflare]               │
│  Record: CNAME demo → cname.vercel-dns.com                      │
│  TTL: 3600 seconds                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Resolves to Vercel Edge Network
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VERCEL EDGE NETWORK (CDN)                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  SECURITY & PERFORMANCE LAYER                           │    │
│  │  • DDoS Protection                                      │    │
│  │  • SSL/TLS Termination (Let's Encrypt)                 │    │
│  │  • HTTP → HTTPS Redirect (301/308)                     │    │
│  │  • Compression (Brotli/Gzip)                           │    │
│  │  • Cache Control                                        │    │
│  │  • Security Headers (CSP, HSTS, X-Frame-Options)       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Global Edge Locations:                                         │
│  • North America                                                │
│  • Europe                                                       │
│  • Asia Pacific                                                 │
│  • South America                                                │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Cache MISS or Dynamic Request
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VERCEL SERVERLESS PLATFORM                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  LANDING PAGE APPLICATION                               │    │
│  │  • Framework: [Next.js/React/Static - TBD]            │    │
│  │  • Build: Optimized production bundle                  │    │
│  │  • Runtime: Node.js (if SSR) or Static                 │    │
│  │  • Environment Variables: Demo configuration           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. DNS Layer
**Purpose:** Domain name resolution
**Provider:** [TBD - awaiting from Marcus]
**Configuration:**
```
Type: CNAME
Name: demo
Host: genericcorp.com
Value: cname.vercel-dns.com
TTL: 3600
```

**Characteristics:**
- Low TTL (3600s) for flexibility in changes
- CNAME record for easy migration if needed
- Managed by Marcus (CEO) or Yuki (SRE)

---

### 2. Vercel Edge Network (CDN)
**Purpose:** Global content delivery and security
**Provider:** Vercel (Cloudflare-based infrastructure)

**Features:**
- **Global CDN:** 100+ edge locations worldwide
- **SSL/TLS:** Automatic Let's Encrypt certificates
- **DDoS Protection:** Built-in at network edge
- **Compression:** Automatic Brotli/Gzip
- **Caching:** Intelligent edge caching
- **Security Headers:** Automatic best practices

**Performance Characteristics:**
- **Latency:** <100ms globally (typical)
- **Bandwidth:** 100GB/month (free tier)
- **Uptime SLA:** 99.99% (Vercel platform)

---

### 3. Application Layer
**Purpose:** Landing page hosting and serving
**Platform:** Vercel Serverless

**Deployment Configuration:**
```json
{
  "name": "demo-landing-page",
  "framework": "[TBD from DeVonte]",
  "buildCommand": "[TBD from DeVonte]",
  "outputDirectory": "[TBD from DeVonte]",
  "installCommand": "npm install",
  "regions": ["auto"],
  "environmentVariables": {
    "[TBD]": "[TBD from DeVonte]"
  }
}
```

**Git Integration:**
- Automatic deployment on push to main branch
- Preview deployments for pull requests
- Rollback capability to any previous deployment

---

## Data Flow

### Typical Request Flow

```
1. User enters: https://demo.genericcorp.com
   └─> Browser performs DNS lookup

2. DNS Resolution
   └─> demo.genericcorp.com (CNAME) → cname.vercel-dns.com
   └─> Returns Vercel Edge Network IP (anycast)

3. Edge Network Processing
   ├─> Check SSL certificate (valid)
   ├─> Enforce HTTPS (redirect if needed)
   ├─> Check edge cache for content
   │   ├─> Cache HIT: Serve from edge (<50ms)
   │   └─> Cache MISS: Continue to origin
   └─> Apply compression & security headers

4. Origin Request (if cache miss)
   └─> Vercel serverless platform
   └─> Execute application logic
   └─> Return response to edge

5. Edge Response
   ├─> Cache response (if appropriate)
   ├─> Apply security headers
   └─> Send to user

6. User receives page (target: <2s total)
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: NETWORK SECURITY                                    │
│ • DDoS protection at edge                                    │
│ • Rate limiting (Vercel platform)                            │
│ • Geographic distribution (anycast)                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: TRANSPORT SECURITY                                  │
│ • TLS 1.3 enforced                                           │
│ • HSTS headers (force HTTPS)                                 │
│ • SSL certificate auto-renewal                               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: APPLICATION SECURITY                                │
│ • Security headers (CSP, X-Frame-Options, etc.)             │
│ • Input validation (application level)                       │
│ • Environment variable isolation                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: MONITORING & DETECTION                              │
│ • Uptime monitoring (60s intervals)                          │
│ • SSL expiry monitoring (30d warning)                        │
│ • Performance monitoring (latency, errors)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring Architecture

### Monitoring Components

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING TARGETS                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┼─────────┬──────────┬──────────┐
        │         │         │          │          │
        ▼         ▼         ▼          ▼          ▼
    ┌──────┐ ┌──────┐ ┌──────┐  ┌──────┐  ┌──────┐
    │ DNS  │ │HTTPS │ │ SSL  │  │Perf. │  │ Up   │
    │Check │ │Check │ │Check │  │Check │  │Check │
    └──┬───┘ └──┬───┘ └──┬───┘  └──┬───┘  └──┬───┘
       │        │        │         │         │
       └────────┴────────┴─────────┴─────────┘
                         │
                         ▼
              ┌────────────────────┐
              │ MONITORING SCRIPT  │
              │ (monitor-demo-     │
              │  subdomain.sh)     │
              └─────────┬──────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
       ┌────────────┐      ┌────────────┐
       │   LOGS     │      │  ALERTS    │
       │  (local)   │      │ (email/    │
       │            │      │  Slack)    │
       └────────────┘      └────────────┘
```

### Monitoring Checks

| Check Type | Frequency | Threshold | Alert |
|------------|-----------|-----------|-------|
| DNS Resolution | 5 min | N/A | Fails to resolve |
| HTTPS Redirect | 5 min | N/A | No redirect or error |
| Site Availability | 5 min | HTTP 200 | Non-200 response |
| Response Time | 5 min | <2000ms | >2000ms |
| SSL Certificate | Daily | Valid | <30 days to expiry |
| Content Check | 5 min | N/A | Expected content missing |

---

## Deployment Architecture

### Git → Production Flow

```
Developer (DeVonte)
    │
    │ git push origin main
    ▼
┌─────────────────────┐
│  Git Repository     │
│  (GitHub/GitLab)    │
└──────────┬──────────┘
           │
           │ Webhook trigger
           ▼
┌─────────────────────────────────────┐
│      VERCEL BUILD PIPELINE          │
│  ┌───────────────────────────┐     │
│  │ 1. Install dependencies    │     │
│  │    npm install             │     │
│  └───────────┬───────────────┘     │
│              ▼                       │
│  ┌───────────────────────────┐     │
│  │ 2. Run build               │     │
│  │    npm run build           │     │
│  └───────────┬───────────────┘     │
│              ▼                       │
│  ┌───────────────────────────┐     │
│  │ 3. Optimize assets         │     │
│  │    • Minification          │     │
│  │    • Image optimization    │     │
│  │    • Bundle splitting      │     │
│  └───────────┬───────────────┘     │
│              ▼                       │
│  ┌───────────────────────────┐     │
│  │ 4. Deploy to edge network  │     │
│  │    Global distribution     │     │
│  └───────────────────────────┘     │
└─────────────────────────────────────┘
           │
           │ Deployment success
           ▼
┌─────────────────────┐
│  Production Live    │
│  demo.genericcorp.  │
│  com                │
└─────────────────────┘
```

**Deployment Time:** 2-5 minutes (typical)
**Zero Downtime:** New version deployed, old version active until ready

---

## Scalability Architecture

### Current Scale (MVP)
- **Traffic:** <100 concurrent users
- **Bandwidth:** <10GB/month (estimated)
- **Requests:** <100k/month (estimated)
- **Latency:** <2s page load time
- **Uptime:** 99.9%+ target

### Free Tier Limits
- **Bandwidth:** 100GB/month
- **Builds:** Unlimited
- **Serverless Executions:** 100GB-hours/month
- **Edge Network:** Unlimited

### Scaling Triggers
Upgrade to Vercel Pro ($20/month) if:
- Bandwidth > 90GB/month (90% of limit)
- Traffic > 80 concurrent users consistently
- Need advanced analytics
- Require team collaboration

### Future Scale Options
```
Current:              Future (if needed):
┌──────────────┐      ┌──────────────────────┐
│ Vercel Free  │  →   │ Vercel Pro/Enterprise │
│ $0/month     │      │ $20-$150+/month       │
│ 100GB BW     │      │ 1TB+ BW               │
│ Basic metrics│      │ Advanced analytics    │
└──────────────┘      └──────────────────────┘
```

---

## Disaster Recovery

### Backup Strategy
**Git Repository:** Source of truth
- All code versioned in Git
- Can redeploy any version instantly
- No data to backup (static/serverless)

### Recovery Procedures

**Scenario 1: Vercel Platform Outage**
```
1. Check Vercel status page
2. If extended outage, activate DR plan:
   └─> Option A: Deploy to Netlify (similar platform)
   └─> Option B: Deploy to Railway/Render
   └─> Option C: Static hosting (S3 + CloudFront)
3. Update DNS to point to DR platform
4. Verify functionality
5. Communicate to stakeholders
```

**Scenario 2: Bad Deployment**
```
1. Identify issue via monitoring
2. Rollback to previous deployment:
   └─> vercel rollback [deployment-url]
   └─> Or via Vercel dashboard
3. Verify rollback successful
4. Investigate issue in non-production
5. Deploy fix when ready
```

**Scenario 3: DNS Issues**
```
1. Verify DNS records in registrar
2. Check DNS propagation globally
3. If TTL expired, propagation should be fast
4. Can temporarily use Vercel default URL
   └─> [project-name].vercel.app
5. Fix DNS and re-verify
```

**RTO (Recovery Time Objective):** <15 minutes
**RPO (Recovery Point Objective):** 0 (Git-based, no data loss)

---

## Cost Architecture

### Cost Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                      MONTHLY COSTS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Hosting (Vercel Free Tier)                    $0.00        │
│  • 100GB bandwidth included                                 │
│  • Unlimited deployments                                    │
│  • Automatic SSL/TLS                                        │
│  • Global CDN                                               │
│                                                              │
│  SSL Certificates (Let's Encrypt)              $0.00        │
│  • Automatic provisioning                                   │
│  • Automatic renewal                                        │
│                                                              │
│  Monitoring (Custom Scripts)                   $0.00        │
│  • Self-hosted monitoring script                            │
│  • Optional: UptimeRobot free tier                          │
│                                                              │
│  DNS (Existing Registrar)                      $0.00        │
│  • Included in domain registration                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  TOTAL:                                        $0.00/month  │
└─────────────────────────────────────────────────────────────┘
```

### Cost Optimization Rationale
1. **Vercel Free Tier:** Perfect for MVP traffic levels
2. **Let's Encrypt:** Industry-standard free SSL
3. **Custom Monitoring:** Scripts instead of paid services
4. **Existing DNS:** No additional cost

### Cost Scaling
```
Traffic Level    Monthly Cost    Platform
───────────────────────────────────────────
<100 users       $0              Vercel Free
100-500 users    $20             Vercel Pro
500-1000 users   $20-50          Vercel Pro
1000+ users      $150+           Vercel Enterprise
```

---

## Performance Architecture

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Byte | <500ms | Vercel Analytics |
| Page Load Time (P95) | <2s | WebPageTest |
| Lighthouse Score | >90 | Chrome DevTools |
| Core Web Vitals LCP | <2.5s | Vercel Analytics |
| Core Web Vitals FID | <100ms | Vercel Analytics |
| Core Web Vitals CLS | <0.1 | Vercel Analytics |

### Performance Optimizations

**Built-in (Vercel):**
- Automatic code splitting
- Image optimization
- Brotli/Gzip compression
- HTTP/2 & HTTP/3 support
- Edge caching
- Geographic routing

**Application Level (DeVonte):**
- Minimize bundle size
- Lazy load images
- Optimize fonts
- Reduce third-party scripts
- Implement caching strategies

---

## Compliance & Governance

### Security Compliance
- ✅ HTTPS enforced (TLS 1.3)
- ✅ SSL certificate valid and trusted
- ✅ Security headers implemented
- ✅ DDoS protection active
- ✅ Regular monitoring and alerting

### Operational Governance
- ✅ Documentation maintained
- ✅ Runbook procedures defined
- ✅ Change management process
- ✅ Rollback procedures tested
- ✅ Team roles and responsibilities

### Cost Governance
- ✅ Free tier monitoring
- ✅ Usage alerts at 90% threshold
- ✅ Monthly cost review process
- ✅ Upgrade triggers defined

---

## Technology Stack Summary

```
┌─────────────────────────────────────────────┐
│             TECHNOLOGY STACK                 │
├─────────────────────────────────────────────┤
│ Layer         │ Technology                  │
├───────────────┼─────────────────────────────┤
│ Domain        │ genericcorp.com             │
│ DNS           │ [TBD from Marcus]           │
│ CDN           │ Vercel Edge Network         │
│ SSL/TLS       │ Let's Encrypt (auto)        │
│ Hosting       │ Vercel Serverless           │
│ Framework     │ [TBD from DeVonte]          │
│ Deployment    │ Git + Vercel                │
│ Monitoring    │ Custom Bash + Vercel        │
│ Alerting      │ Email/Slack (TBD)           │
└───────────────┴─────────────────────────────┘
```

---

## Architecture Decision Records

### ADR-001: Platform Selection (Vercel)
**Decision:** Use Vercel for hosting
**Rationale:**
- Zero maintenance overhead
- Automatic SSL/TLS provisioning
- Global CDN included
- Free tier sufficient for traffic
- Excellent developer experience
- Fast deployment (<5 min)

**Alternatives Considered:**
- Railway/Render: More maintenance, monthly cost
- Self-hosted (AWS/DO): High maintenance, setup time
- Netlify: Similar to Vercel, Vercel chosen for team familiarity

### ADR-002: DNS Configuration (CNAME)
**Decision:** Use CNAME record pointing to Vercel
**Rationale:**
- Easy to update/change if needed
- No IP management required
- Vercel handles anycast routing
- Standard best practice

**Alternatives Considered:**
- A record: Less flexible, requires IP updates
- ALIAS record: Provider-specific, less portable

### ADR-003: Monitoring Strategy (Custom Scripts)
**Decision:** Custom bash monitoring scripts + optional UptimeRobot
**Rationale:**
- Zero cost
- Full control over checks
- Easy to extend/customize
- No vendor lock-in
- Can upgrade to paid monitoring if needed

**Alternatives Considered:**
- Paid monitoring (Pingdom, Datadog): Unnecessary cost for MVP
- No monitoring: Unacceptable risk for business-critical demo

---

**Last Updated:** 2026-01-26
**Owner:** Yuki Tanaka (SRE)
**Status:** Architecture finalized, ready for implementation
