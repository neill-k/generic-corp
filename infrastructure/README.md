# Generic Corp Infrastructure

Infrastructure configuration and deployment scripts for Generic Corp demo environment.

## 🚀 Current Status (January 26, 2026)

**Demo Subdomain**: demo.genericcorp.com
**Status**: 🟢 **READY FOR DEPLOYMENT**
**Prepared by**: Yuki Tanaka (SRE)

### Quick Start
```bash
# After DNS is configured, run:
cd infrastructure/deployment
./deploy.sh
```

### Documentation
- 📋 **Full Deployment Guide**: [`DEMO_DEPLOYMENT_STATUS.md`](./DEMO_DEPLOYMENT_STATUS.md)
- ✅ **Pre-Deployment Checklist**: [`deployment/PRE_DEPLOYMENT_CHECKLIST.md`](./deployment/PRE_DEPLOYMENT_CHECKLIST.md)
- 🤝 **Handoff Document**: [`HANDOFF_MARCUS.md`](./HANDOFF_MARCUS.md)

**Next Action**: Configure DNS (CNAME: demo → cname.vercel-dns.com)

---

## Overview

This directory contains deployment configurations, monitoring scripts, and security settings for the demo.genericcorp.com public-facing environment.

## Directory Structure

```
infrastructure/
├── deployment/          # Deployment configurations
│   ├── vercel.json     # Vercel hosting config
│   ├── nginx.conf      # Nginx reverse proxy config
│   ├── docker-compose.demo.yml  # Demo environment containers
│   ├── Dockerfile.demo # Demo API server image
│   └── deploy.sh       # Automated deployment script
├── monitoring/         # Monitoring and alerting
│   └── uptime_monitor.sh  # Health check script
├── security/           # Security configurations
│   └── rate_limit_config.lua  # Rate limiting rules
└── README.md          # This file
```

## Deployment Options

### Option 1: Vercel (Recommended for Speed)

**Pros:**
- Zero-config SSL and CDN
- Instant deployments
- Free tier for demo traffic
- Automatic scaling

**Setup:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd infrastructure/deployment
./deploy.sh
```

**Timeline:** ~30 minutes from start to production

### Option 2: Self-Hosted (More Control)

**Pros:**
- Full infrastructure control
- Custom rate limiting
- Isolated demo database
- No third-party dependencies

**Setup:**
```bash
# Set environment variables
export DEMO_DOMAIN=demo.genericcorp.com
export DEPLOY_TYPE=self-hosted

# Deploy
cd infrastructure/deployment
./deploy.sh
```

**Timeline:** ~2-3 hours including DNS propagation

## Security Features

### Rate Limiting
- **Default:** 100 requests/minute per IP
- **Burst:** 20 requests allowed
- **Block duration:** 5 minutes
- **Location:** nginx.conf or Cloudflare Workers

### SSL/TLS
- **Protocol:** TLS 1.2+ only
- **Certificates:** Let's Encrypt (auto-renewal)
- **HSTS:** Enabled with 1-year max-age

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'`

### Infrastructure Isolation
Demo environment runs on isolated infrastructure:
- Separate database (PostgreSQL on port 5433)
- Separate Redis instance (port 6380)
- Read-only mode enforced
- No access to production data

## Monitoring

### Uptime Monitoring
```bash
# Setup cron job for health checks
crontab -e
# Add: */5 * * * * /path/to/infrastructure/monitoring/uptime_monitor.sh
```

### Metrics Tracked
- **Uptime:** 5-minute intervals
- **Response time:** Page load performance
- **Error rates:** 4xx/5xx responses
- **Rate limit hits:** Blocked IPs

### Alerts
Configure Slack webhook for alerts:
```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## DNS Configuration

### Required Records
```
Type: A
Name: demo
Value: [Your server IP]
TTL: 3600

Type: AAAA (if IPv6)
Name: demo
Value: [Your IPv6 address]
TTL: 3600
```

For Vercel:
```
Type: CNAME
Name: demo
Value: cname.vercel-dns.com
TTL: 3600
```

## Environment Variables

### Demo Environment
```bash
# Database
DATABASE_URL=postgresql://genericcorp_demo:PASSWORD@localhost:5433/genericcorp_demo

# Redis
REDIS_URL=redis://localhost:6380

# Application
NODE_ENV=demo
DEMO_MODE=true
READ_ONLY=true
PORT=3001

# Deployment
DEMO_DOMAIN=demo.genericcorp.com
DEPLOY_TYPE=vercel  # or self-hosted
```

## Troubleshooting

### SSL Certificate Issues
```bash
# Renew certificates manually
docker run -it --rm \
  -v $(pwd)/ssl:/etc/letsencrypt \
  certbot/certbot renew
```

### Rate Limiting Too Aggressive
Edit `nginx.conf` and adjust:
```nginx
limit_req_zone $binary_remote_addr zone=demo_limit:10m rate=200r/m;  # Increased
```

### Deployment Fails
```bash
# Check logs
docker-compose -f docker-compose.demo.yml logs

# Restart services
docker-compose -f docker-compose.demo.yml restart
```

## Performance Optimization

### CDN Configuration
- Static assets cached for 1 hour
- Gzip compression enabled
- HTTP/2 enabled
- Browser caching headers set

### Resource Limits
- PostgreSQL: 256MB RAM limit
- Redis: 256MB RAM limit with LRU eviction
- API: 512MB RAM, 2 workers

## Cost Estimation

### Vercel (Free Tier)
- Hosting: $0/month
- Bandwidth: 100GB free
- Estimated: **$0-5/month**

### Self-Hosted (VPS)
- Server: $5-10/month (DigitalOcean/Linode)
- Domain: $12/year
- SSL: Free (Let's Encrypt)
- Estimated: **$5-10/month**

## Maintenance

### Regular Tasks
- [ ] Review logs weekly
- [ ] Check SSL expiry (auto-renewed, but verify)
- [ ] Monitor rate limit effectiveness
- [ ] Review error rates
- [ ] Update dependencies monthly

### Backup Strategy
Demo environment is ephemeral, but for persistence:
```bash
# Backup database
docker exec generic-corp-demo-postgres pg_dump -U genericcorp_demo > backup.sql

# Restore
docker exec -i generic-corp-demo-postgres psql -U genericcorp_demo < backup.sql
```

## Support

For infrastructure issues, contact Yuki Tanaka (SRE).

**SLA:** Demo environment uptime target: 99% (non-critical)
