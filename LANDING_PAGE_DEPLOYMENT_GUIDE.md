# Landing Page - Deployment Guide for Vercel

**Status:** ✅ CODE READY - Awaiting Vercel Deployment
**Date:** January 26, 2026
**Prepared by:** DeVonte Jackson

---

## Executive Summary

The landing page is **production-ready and committed to GitHub**. All code is built, tested, and optimized. We just need to connect the GitHub repo to Vercel for automatic deployment.

**Timeline:** 10-15 minutes to deploy via Vercel web interface

---

## What's Been Completed ✅

1. ✅ **Landing page built** - All sections complete (Hero, Features, Pricing, Waitlist)
2. ✅ **Code tested** - Build successful, optimized assets (352KB total, 103KB gzipped)
3. ✅ **Committed to Git** - Commit `b7f683d` on branch `feat/generic-corp-foundation`
4. ✅ **Pushed to GitHub** - Available at `https://github.com/neill-k/generic-corp`
5. ✅ **Vercel config added** - `vercel.json` configured for automatic builds

---

## Deployment Steps (Vercel Web Interface)

### Step 1: Go to Vercel
1. Visit https://vercel.com
2. Click "Sign Up" or "Log In"
3. Sign in with GitHub account (recommended for auto-deploy)

### Step 2: Import GitHub Repository
1. Click "Add New..." → "Project"
2. Select "Import Git Repository"
3. Find `neill-k/generic-corp` in the list
4. Click "Import"

### Step 3: Configure Project Settings
**IMPORTANT:** Set these configurations:

- **Framework Preset:** Vite
- **Root Directory:** `apps/landing` (CRITICAL - must set this!)
- **Build Command:** `npm run build` (should auto-detect)
- **Output Directory:** `dist` (should auto-detect)
- **Install Command:** `npm install` (should auto-detect)

### Step 4: Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Get production URL (will be something like `generic-corp-xxx.vercel.app`)

### Step 5: Verify
1. Click the deployment URL
2. Check all sections load correctly:
   - Hero section with CTA
   - Features showcase
   - Pricing tiers
   - Waitlist form
3. Test waitlist form (currently logs to console - functional but needs backend)

---

## Alternative: Vercel CLI Deployment

If you have Vercel CLI installed, you can deploy directly:

```bash
cd /home/nkillgore/generic-corp/apps/landing
vercel --prod
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? `generic-corp-landing`
- Directory? `.` (current directory)
- Override settings? **N**

---

## Post-Deployment Steps

### Immediate (Today)
1. ✅ Share production URL with team
2. ✅ Test all functionality on live site
3. ✅ Begin outreach to potential customers with live link

### This Week
1. 🔄 **Email Integration** - Connect waitlist form to ConvertKit/Mailchimp
2. 🔄 **Analytics** - Add Google Analytics or Plausible
3. 🔄 **Domain** - Point `genericcorp.io` to Vercel deployment
4. 🔄 **Content Updates** - Update GitHub links, add demo video

---

## Configuration Files

### vercel.json (Root Level)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/landing/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/apps/landing/dist/$1"
    }
  ]
}
```

### vercel.json (apps/landing)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

---

## Expected Results

### Build Output
```
vite v5.4.21 building for production...
✓ 37 modules transformed.
dist/index.html                   0.63 kB │ gzip:   0.37 kB
dist/assets/index-D6ln7gQv.css    4.63 kB │ gzip:   1.50 kB
dist/assets/index-CJCuUOiA.js   347.25 kB │ gzip: 102.92 kB
✓ built in ~60s
```

### Performance
- **Total Size:** 352 KB (optimized)
- **Gzipped:** 103 KB (excellent)
- **Build Time:** ~60 seconds
- **Load Time:** <2 seconds (expected)

---

## Troubleshooting

### Issue: Build Fails
**Solution:** Ensure Root Directory is set to `apps/landing`

### Issue: 404 on Routes
**Solution:** Check Output Directory is set to `dist`

### Issue: Blank Page
**Solution:** Verify `index.html` is in dist folder after build

### Issue: Missing Styles
**Solution:** Ensure Tailwind CSS build process completed successfully

---

## Current Status

- **Repository:** https://github.com/neill-k/generic-corp
- **Branch:** feat/generic-corp-foundation
- **Commit:** b7f683d
- **Directory:** apps/landing/
- **Build Status:** ✅ Passing
- **Deployment Status:** ⏳ Pending Vercel Setup

---

## Next Actions

**Marcus:** 
1. Deploy to Vercel (10-15 min)
2. Share production URL with team
3. Decide on email service (ConvertKit recommended)

**DeVonte (me):**
1. ⏳ Awaiting deployment confirmation
2. Ready to integrate email service once decided
3. Ready to add analytics once deployed
4. Available to sync with Yuki on DB schema

---

## Contact

If you encounter any issues during deployment, I'm available to help troubleshoot.

**DeVonte Jackson**
Full-Stack Developer
Generic Corp

---

## Repository Structure

```
generic-corp/
├── apps/
│   └── landing/               ← Deploy this directory
│       ├── src/
│       │   ├── components/
│       │   │   ├── Hero.jsx
│       │   │   ├── Features.jsx
│       │   │   ├── Pricing.jsx
│       │   │   ├── Waitlist.jsx
│       │   │   └── ...
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── dist/              ← Build output (auto-generated)
│       ├── package.json
│       ├── vite.config.js
│       └── vercel.json
└── vercel.json                ← Monorepo config
```

---

**Bottom Line:** Code is ready. Just need to click "Deploy" on Vercel. Should be live in 15 minutes.
