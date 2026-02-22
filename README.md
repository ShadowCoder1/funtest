# Situationship Decoder — Deploy Guide

## You'll be live and taking real money in about 20 minutes.

---

## Step 1 — Get your Stripe Payment Link

1. Go to dashboard.stripe.com and create an account if you don't have one
2. Click **Products** → **Add Product**
   - Name: "Full Decode"
   - Price: $2.99, one-time
3. Click **Payment Links** → **Create Payment Link** → select your product
4. Copy the link (looks like: `https://buy.stripe.com/xxxxxxx`)
5. Open `public/index.html` and replace `REPLACE_WITH_YOUR_LINK` near the top of the script with your link

---

## Step 2 — Deploy to Vercel

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. From this folder, run:
   ```
   vercel
   ```
   - Follow prompts, link to your account
   - When asked "which directory is your code?" → hit enter (current dir)
   - It will give you a preview URL

3. Add your environment variables in Vercel dashboard:
   - Go to your project → **Settings** → **Environment Variables**
   - Add: `ANTHROPIC_API_KEY` = your Anthropic API key (sk-ant-...)
   - Click Save

4. Redeploy to apply env vars:
   ```
   vercel --prod
   ```

---

## Step 3 — Add your domain (optional but recommended)

- In Vercel dashboard → **Domains** → add your domain
- Point your DNS to Vercel (they walk you through it)

---

## How the money flows

- User runs a decode → sees interest meter, brutal truths, flags (free)
- "Next Moves" is locked behind a paywall
- They click "Unlock for $2.99" → goes to Stripe → pays → redirected back to your site with `?paid=true`
- Site re-runs the analysis and serves the full result

Money lands in your Stripe account. Stripe takes ~2.9% + 30 cents per transaction.
At 100 sales/day = ~$280/day. At 1000 sales/day = ~$2,800/day.

---

## Files

```
situationship-decoder/
├── vercel.json          # Routing config
├── public/
│   └── index.html       # The full frontend
└── api/
    └── decode.js        # Server function (keeps API key safe)
```

---

## Notes

- The Anthropic API key NEVER touches the frontend — it lives only in Vercel's environment
- The paywall is honor-system on redirect (good enough for launch, upgrade later with webhooks)
- To make the paywall airtight later: use Stripe webhooks to issue a one-time token, verify token server-side
