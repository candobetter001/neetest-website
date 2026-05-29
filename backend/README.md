# NEETest OTP Worker — deployment guide

This is a small Cloudflare Worker that generates 6-digit OTPs, emails them via Resend, and verifies them on sign-in. It sits behind the NEETest website's login flow.

## What you need (one-time setup)

1. A **Cloudflare account** (free tier is fine — you already have one for neetest.online DNS).
2. A **Resend account** at https://resend.com (free tier: 100 emails/day, no card needed).
3. The **`wrangler` CLI** (Cloudflare's deployment tool):
   ```bash
   npm install -g wrangler
   wrangler login   # opens a browser to authorise
   ```

## Step 1 — Get a Resend API key

1. Sign up at https://resend.com
2. Go to **API Keys** → **Create API Key** (give it any name, "full access" is fine for sending)
3. Copy the key — starts with `re_...`

(Optional but recommended) Add `neetest.online` as a verified domain in Resend so emails come from `candobetter001@gmail.com`. Without verification you can only send from `onboarding@resend.dev`.

## Step 2 — Create a KV namespace

KV is Cloudflare's free key-value store; we use it to remember OTPs for 10 minutes.

```bash
cd backend
wrangler kv:namespace create OTP_STORE
```

Output looks like:
```
🌀  Creating namespace with title "neetest-otp-OTP_STORE"
✨  Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "OTP_STORE"
id = "abcd1234..."
```

Paste that `id` into `wrangler.toml` (replace `REPLACE_WITH_NAMESPACE_ID`).

## Step 3 — Set secrets

```bash
wrangler secret put RESEND_API_KEY
# paste your re_... key when prompted

wrangler secret put FROM_EMAIL
# paste:  NEETest <candobetter001@gmail.com>
# (or: NEETest <onboarding@resend.dev> if you skipped domain verification)
```

## Step 4 — Deploy

```bash
wrangler deploy
```

You'll get a URL like `https://neetest-otp.YOUR-NAME.workers.dev` — copy it.

## Step 5 — Optional: custom subdomain

To use `otp.neetest.online` instead of the workers.dev URL:

1. Uncomment the `[[routes]]` block in `wrangler.toml`
2. Add a Cloudflare DNS record: type `CNAME`, name `otp`, target `neetest-otp.YOUR-NAME.workers.dev` (proxied, orange cloud)
3. Run `wrangler deploy` again

## Step 6 — Wire the frontend

Edit `assets/js/data.js` and set:
```js
window.NEETEST_OTP_ENDPOINT = 'https://neetest-otp.YOUR-NAME.workers.dev';
// or 'https://otp.neetest.online' if you set up the custom subdomain
```

Commit and push. The login page now uses real email-delivered OTPs.

## Testing

```bash
curl -X POST https://YOUR-WORKER-URL/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"you@gmail.com"}'
# → {"ok":true,"expiresAt":...}

# Check your inbox for the 6-digit code, then:
curl -X POST https://YOUR-WORKER-URL/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"you@gmail.com","otp":"123456"}'
# → {"ok":true}
```

## What it costs

- **Cloudflare Workers free tier:** 100,000 requests/day, 10 ms CPU per request. Plenty for any auth volume we'll see.
- **Cloudflare KV free tier:** 100,000 reads/day, 1,000 writes/day. Plenty.
- **Resend free tier:** 100 emails/day, 3,000/month. Enough for early users.

If we outgrow Resend's free tier the next step is their Pro plan ($20/mo for 50k emails) or switching to AWS SES (~$0.10 per 1,000 emails).

## Security notes

- Rate-limited to 5 sends per email per hour.
- Max 5 verify attempts per OTP before lockout.
- OTPs expire in 10 minutes.
- CORS locked to `https://neetest.online` by default — set `ALLOWED_ORIGIN` secret to change.
- The Worker never logs OTPs or emails (only operational errors).
