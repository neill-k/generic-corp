# Deploy AgentHQ Landing Page - Quick Start

**Status**: ✅ READY - Deploy in < 5 minutes

---

## Option 1: Vercel (Recommended - 30 minutes total)

### Prerequisites
```bash
# Install Vercel CLI (one-time setup)
npm install -g vercel
```

### Deploy
```bash
# Navigate to deployment directory
cd infrastructure/deployment

# Set deployment type
export DEPLOY_TYPE=vercel

# Run deployment script
./deploy.sh
```

**That's it!** The script will:
1. Build the landing page
2. Deploy to Vercel
3. Give you a live URL

### Post-Deploy
- You'll get a URL like: `https://landing-xyz123.vercel.app`
- Configure custom domain in Vercel dashboard if desired
- SSL is automatic

---

## Option 2: Self-Hosted (2-3 hours total)

### Prerequisites
```bash
# Ensure Docker and Docker Compose installed
docker --version
docker-compose --version
```

### Configure
```bash
# Set required environment variables
export DEMO_DOMAIN=demo.genericcorp.com
export DEPLOY_TYPE=self-hosted
export DEMO_DB_PASSWORD=your-strong-password-here
```

### Deploy
```bash
# Navigate to deployment directory
cd infrastructure/deployment

# Run deployment script
./deploy.sh
```

### DNS Setup
Point your domain to the server:
```
Type: A
Name: demo (or @)
Value: <your-server-ip>
TTL: 3600
```

Wait for DNS propagation (15 min - 24 hours, usually < 1 hour)

---

## Verify Deployment

### Quick Checks
```bash
# Check if site loads
curl https://demo.genericcorp.com

# Check SSL certificate
curl -vI https://demo.genericcorp.com 2>&1 | grep -i ssl

# Check health endpoint (if API deployed)
curl https://demo.genericcorp.com/health
```

### Browser Checks
1. Visit the URL
2. Check SSL lock icon in browser
3. Test all sections load (Hero, Demo, Pricing, Waitlist)
4. Test mobile responsiveness
5. Open dev tools - check for errors

---

## Troubleshooting

### Build fails in deploy script
```bash
# Try building manually first
cd apps/landing
pnpm install
pnpm build
# Should complete in ~5 seconds
```

### Vercel CLI not authenticated
```bash
vercel login
# Follow prompts to authenticate
```

### Docker containers won't start
```bash
# Check logs
cd infrastructure/deployment
docker-compose -f docker-compose.demo.yml logs

# Try restarting
docker-compose -f docker-compose.demo.yml down
docker-compose -f docker-compose.demo.yml up -d
```

### Site loads but shows errors
```bash
# Check browser console for errors
# Check nginx logs
docker logs generic-corp-demo-nginx
```

---

## What Was Fixed

Before deployment, I fixed these issues:
1. ✅ PostCSS config (was CommonJS, needed ES module)
2. ✅ Tailwind config (was CommonJS, needed ES module + updated paths)
3. ✅ Build now completes without errors

All configs are now ES module compatible with Vite.

---

## Next Steps After Deployment

1. **Set up monitoring** (5 min)
   - UptimeRobot free tier: https://uptimerobot.com
   - Monitor: https://demo.genericcorp.com

2. **Add analytics** (10 min)
   - Google Analytics or Plausible
   - Track page views and waitlist signups

3. **Share the URL**
   - Tweet it, post to communities
   - Start collecting waitlist emails

4. **Monitor & Iterate**
   - Watch analytics
   - Gather feedback
   - Improve landing page

---

## Files Modified

Only configuration files (no code changes):
- `apps/landing/postcss.config.js` - Changed to ES module export
- `apps/landing/tailwind.config.js` - Changed to ES module export, updated content paths

All other infrastructure was already in place and working.

---

## Support

**Questions?** Check these docs:
- `/infrastructure/DEPLOYMENT_STATUS.md` - Comprehensive deployment guide
- `/infrastructure/README.md` - Infrastructure overview
- `/AGENTHQ_INFRASTRUCTURE_READY.md` - Readiness assessment

**Issues?** Contact Yuki Tanaka (SRE)

---

**Ready to ship! 🚀**
