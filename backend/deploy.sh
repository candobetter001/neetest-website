#!/bin/bash
# NEETest OTP Worker — one-shot deploy.
# Prereqs: wrangler installed, CLOUDFLARE_API_TOKEN env var set OR `wrangler login` completed.
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then echo "ERROR: .env missing. See README.md."; exit 1; fi
source .env

echo "=== 1. Verify Cloudflare auth ==="
wrangler whoami 2>&1 | head -3

echo ""
echo "=== 2. Create KV namespace (if not done) ==="
if grep -q "REPLACE_WITH_NAMESPACE_ID" wrangler.toml; then
  NS_ID=$(wrangler kv:namespace create OTP_STORE 2>&1 | grep -oE 'id = "[^"]+"' | head -1 | sed 's/id = "//;s/"//')
  if [ -z "$NS_ID" ]; then
    echo "ERROR: Could not create KV namespace. Maybe one already exists — paste its id into wrangler.toml manually."
    exit 1
  fi
  sed -i.bak "s/REPLACE_WITH_NAMESPACE_ID/$NS_ID/" wrangler.toml && rm -f wrangler.toml.bak
  echo "Created KV namespace: $NS_ID"
else
  echo "KV namespace already configured."
fi

echo ""
echo "=== 3. Set secrets ==="
echo "$RESEND_API_KEY" | wrangler secret put RESEND_API_KEY
echo "$FROM_EMAIL" | wrangler secret put FROM_EMAIL

echo ""
echo "=== 4. Deploy Worker ==="
wrangler deploy

echo ""
echo "=== DONE ==="
echo "Now copy the URL above and paste it into website/assets/js/data.js as window.NEETEST_OTP_ENDPOINT"
