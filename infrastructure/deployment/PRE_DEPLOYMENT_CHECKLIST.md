# Pre-Deployment Checklist for demo.genericcorp.com

**Date**: January 26, 2026
**Domain**: demo.genericcorp.com
**Deployment Target**: Vercel (recommended)

---

## Infrastructure Readiness

### ✅ Prerequisites Met

- [x] **Vercel CLI Installed**: `/home/nkillgore/.nvm/versions/node/v22.18.0/bin/vercel`
- [x] **Deployment Script Ready**: `deploy.sh` (executable)
- [x] **Landing Page App**: `/home/nkillgore/generic-corp/apps/landing` (exists)
- [x] **Vercel Config**: `vercel.json` (configured with security headers)
- [x] **Docker Config**: `docker-compose.demo.yml` (backup option)
- [x] **Nginx Config**: `nginx.conf` (for self-hosted option)
- [x] **Monitoring Script**: `uptime_monitor.sh` (ready)

### 🟡 Awaiting External Actions

- [ ] **DNS Configuration**: Need to add DNS record
  - **Type**: CNAME
  - **Name**: demo
  - **Value**: cname.vercel-dns.com
  - **TTL**: 3600 (1 hour)

- [ ] **Deployment Execution**: Ready to run once DNS is configured
  ```bash
  cd /home/nkillgore/generic-corp/infrastructure/deployment
  ./deploy.sh
  ```

---

## Quick Deployment Commands

### Option 1: Automated (Recommended)
```bash
cd /home/nkillgore/generic-corp/infrastructure/deployment
./deploy.sh
```

### Option 2: Manual Vercel Deployment
```bash
# 1. Build landing page
cd /home/nkillgore/generic-corp/apps/landing
pnpm install
pnpm build

# 2. Deploy to Vercel
vercel --prod --yes

# 3. Add custom domain in Vercel dashboard
# Project Settings → Domains → Add demo.genericcorp.com
```

### Option 3: Self-Hosted
```bash
export DEMO_DOMAIN=demo.genericcorp.com
export DEPLOY_TYPE=self-hosted
cd /home/nkillgore/generic-corp/infrastructure/deployment
./deploy.sh
```

---

## Verification Steps Post-Deployment

### 1. DNS Resolution (Wait 5-10 minutes after DNS change)
```bash
nslookup demo.genericcorp.com
# Should return Vercel IP or your server IP
```

### 2. SSL Certificate
```bash
curl -I https://demo.genericcorp.com
# Should return 200 OK with valid SSL
```

### 3. Security Headers
```bash
curl -I https://demo.genericcorp.com
# Check for:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

### 4. Page Load
Open in browser: https://demo.genericcorp.com
- Should load within 2 seconds
- No SSL warnings
- Landing page displays correctly

---

## Rollback Plan

If deployment fails:

### Vercel Deployment
```bash
# Revert to previous deployment
vercel rollback
```

### Self-Hosted
```bash
# Stop containers
docker-compose -f docker-compose.demo.yml down

# Review logs
docker-compose -f docker-compose.demo.yml logs

# Fix issues and redeploy
```

---

## Support & Escalation

**Primary Contact**: Yuki Tanaka (SRE)
**Backup**: Sable Chen (Technical Lead)

**Estimated Time**:
- DNS Configuration: 5-10 minutes (manual)
- Deployment Execution: 5-10 minutes
- DNS Propagation: 5-60 minutes
- Total: **30-60 minutes** from start to live

---

## Status

🟢 **READY FOR DEPLOYMENT**

All infrastructure components are prepared and tested. Awaiting DNS configuration to proceed.

**Next Action**: Configure DNS record for demo.genericcorp.com
