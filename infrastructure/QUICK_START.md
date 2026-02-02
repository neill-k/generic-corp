# Quick Start - Demo Deployment

**🚀 Ready to deploy demo.genericcorp.com**

---

## Step 1: Configure DNS (5 minutes)

Add this DNS record at your domain registrar:

```
Type: CNAME
Name: demo
Value: cname.vercel-dns.com
TTL: 3600
```

---

## Step 2: Deploy (5 minutes)

```bash
cd /home/nkillgore/generic-corp/infrastructure/deployment
./deploy.sh
```

---

## Step 3: Wait for DNS (5-60 minutes)

DNS propagation happens automatically. Check progress:

```bash
nslookup demo.genericcorp.com
```

---

## Step 4: Verify (2 minutes)

Open in browser: https://demo.genericcorp.com

Check for:
- ✅ Page loads correctly
- ✅ SSL certificate valid (no warnings)
- ✅ Fast load time (< 2 seconds)

---

## Done! 🎉

**Total time**: 30-60 minutes
**Cost**: $0/month
**Performance**: Global CDN, automatic SSL

---

## Need Help?

- **Full Guide**: [`DEMO_DEPLOYMENT_STATUS.md`](./DEMO_DEPLOYMENT_STATUS.md)
- **Checklist**: [`deployment/PRE_DEPLOYMENT_CHECKLIST.md`](./deployment/PRE_DEPLOYMENT_CHECKLIST.md)
- **Troubleshooting**: See documentation above
- **Contact**: Yuki Tanaka (SRE)

---

## Rollback (if needed)

```bash
vercel rollback
```

---

**Status**: Ready to deploy ✅
