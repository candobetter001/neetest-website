// NEETest OTP Worker
// Cloudflare Worker that generates and verifies email OTPs for sign-in.
//
// Endpoints:
//   POST /otp/send     { email }                  -> { ok: true, expiresAt }
//   POST /otp/verify   { email, otp }             -> { ok: true } | { ok: false, reason }
//
// Requires:
//   - KV namespace bound as OTP_STORE
//   - Secret RESEND_API_KEY (from https://resend.com)
//   - Secret FROM_EMAIL (e.g. "NEETest <hello@neetest.online>")
//   - Optional secret ALLOWED_ORIGIN (default: https://neetest.online)
//
// Rate-limited: max 5 send-OTP per email per hour.

const ALLOWED_GMAIL = /@(gmail|googlemail)\.com$/i;
const OTP_TTL_SECONDS = 600;        // 10 min
const SEND_RATE_LIMIT_HOUR = 5;     // max sends per email per hour
const MAX_VERIFY_ATTEMPTS = 5;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || 'https://neetest.online';

    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'POST only' }, 405, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'invalid JSON' }, 400, cors);
    }

    try {
      if (url.pathname === '/otp/send') return await handleSend(body, env, cors);
      if (url.pathname === '/otp/verify') return await handleVerify(body, env, cors);
      return json({ ok: false, error: 'not found' }, 404, cors);
    } catch (e) {
      return json({ ok: false, error: 'server error', detail: String(e).slice(0, 200) }, 500, cors);
    }
  },
};

async function handleSend(body, env, cors) {
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !ALLOWED_GMAIL.test(email)) {
    return json({ ok: false, error: 'Please use a valid Gmail address.' }, 400, cors);
  }

  // Rate limit per email per hour
  const rateKey = `rate:${email}:${new Date().toISOString().slice(0, 13)}`;
  const sentSoFar = parseInt((await env.OTP_STORE.get(rateKey)) || '0', 10);
  if (sentSoFar >= SEND_RATE_LIMIT_HOUR) {
    return json({ ok: false, error: 'Too many requests. Try again in an hour.' }, 429, cors);
  }
  await env.OTP_STORE.put(rateKey, String(sentSoFar + 1), { expirationTtl: 3600 });

  // Generate OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;

  await env.OTP_STORE.put(
    `otp:${email}`,
    JSON.stringify({ otp, expiresAt, attempts: 0 }),
    { expirationTtl: OTP_TTL_SECONDS },
  );

  // Send via Resend
  const subject = `Your NEETest sign-in code: ${otp}`;
  const html = renderEmail(otp);

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'NEETest <onboarding@resend.dev>',
      to: [email],
      subject,
      html,
    }),
  });

  if (!resendResp.ok) {
    const detail = await resendResp.text();
    return json({ ok: false, error: 'Could not send email. Please try again.', detail: detail.slice(0, 200) }, 502, cors);
  }

  return json({ ok: true, expiresAt }, 200, cors);
}

async function handleVerify(body, env, cors) {
  const email = (body.email || '').trim().toLowerCase();
  const otp = String(body.otp || '').trim();
  if (!email || !/^\d{6}$/.test(otp)) {
    return json({ ok: false, reason: 'invalid_input' }, 400, cors);
  }

  const raw = await env.OTP_STORE.get(`otp:${email}`);
  if (!raw) {
    return json({ ok: false, reason: 'expired_or_missing' }, 410, cors);
  }
  const record = JSON.parse(raw);

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await env.OTP_STORE.delete(`otp:${email}`);
    return json({ ok: false, reason: 'too_many_attempts' }, 429, cors);
  }

  if (record.otp !== otp) {
    record.attempts = (record.attempts || 0) + 1;
    await env.OTP_STORE.put(`otp:${email}`, JSON.stringify(record), { expirationTtl: OTP_TTL_SECONDS });
    return json({ ok: false, reason: 'mismatch', remaining: MAX_VERIFY_ATTEMPTS - record.attempts }, 401, cors);
  }

  // Match — consume the OTP
  await env.OTP_STORE.delete(`otp:${email}`);
  return json({ ok: true }, 200, cors);
}

function json(payload, status, cors) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function renderEmail(otp) {
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px;color:#0f172a">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#06b6d4);color:white;font-weight:bold;font-size:24px;line-height:48px">N</div>
    <h1 style="margin-top:16px;font-size:20px">Your NEETest sign-in code</h1>
  </div>
  <p style="font-size:14px;color:#475569">Enter this 6-digit code in the NEETest sign-in page. The code expires in 10 minutes.</p>
  <div style="margin:32px 0;padding:24px;background:#f8fafc;border-radius:12px;text-align:center">
    <div style="font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5">${otp}</div>
  </div>
  <p style="font-size:12px;color:#94a3b8">If you didn't request this code, you can safely ignore this email.</p>
  <hr style="border:0;border-top:1px solid #e2e8f0;margin:32px 0">
  <p style="font-size:12px;color:#94a3b8;text-align:center">NEETest · neetest.online · Independent MCQ practice tool. Not affiliated with NBEMS, AIIMS, or NMC.</p>
</body></html>`;
}
