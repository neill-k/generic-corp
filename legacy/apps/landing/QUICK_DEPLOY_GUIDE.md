# Quick Deploy Guide - Landing Page

## For DeVonte: Deploy in 10 Minutes

### Option 1: Vercel (Recommended - Fastest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from landing directory
cd /home/nkillgore/generic-corp/apps/landing
vercel

# Follow prompts:
# - Link to Vercel account
# - Set project name: generic-corp-landing
# - Use default settings
# - Get instant URL: https://generic-corp-landing.vercel.app
```

### Option 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd /home/nkillgore/generic-corp/apps/landing
netlify deploy --prod

# Build command: npm run build
# Publish directory: dist
```

### Option 3: Manual Build + Upload
```bash
cd /home/nkillgore/generic-corp/apps/landing
npm run build
# Upload dist/ folder to any static host
```

## Backend Integration - Waitlist API

### Quick Fix: Add to server API
Edit `/home/nkillgore/generic-corp/apps/server/src/api/` and add:

```javascript
// routes/waitlist.js
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  // Store in database
  await db.waitlist.create({
    data: { email, createdAt: new Date() }
  });

  // Send notification email
  // await emailService.notify('New waitlist signup: ' + email);

  res.json({ success: true });
});
```

Then update Waitlist.jsx handleSubmit:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault()

  const response = await fetch('https://api.generic-corp.com/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (response.ok) {
    setSubmitted(true)
    setTimeout(() => {
      setEmail('')
      setSubmitted(false)
    }, 3000)
  }
}
```

## Environment Variables

Create `.env.production` in landing directory:
```env
VITE_API_URL=https://api.generic-corp.com
```

## Post-Deployment Checklist

- [ ] Test homepage loads
- [ ] Test all navigation links
- [ ] Test waitlist form submission
- [ ] Verify pricing displays correctly
- [ ] Check mobile responsiveness
- [ ] Verify analytics tracking (if added)
- [ ] Test on multiple browsers

## Questions?
Message Marcus Bell or Yuki Tanaka
