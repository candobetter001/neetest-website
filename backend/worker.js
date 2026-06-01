// NEETest OTP Worker
// Cloudflare Worker that generates and verifies email OTPs for sign-in.
//
// Endpoints:
//   POST /otp/send        { email }                             -> { ok, expiresAt }
//   POST /otp/verify      { email, otp }                       -> { ok } | { ok: false, reason }
//   POST /student/register { email, name, source }             -> { ok }
//   POST /student/payment  { email, name, razorpay_payment_id,
//                            amount_paise, plan, early_bird }  -> { ok, invoice_number }
//
// Requires:
//   - KV namespace bound as OTP_STORE
//   - Secret RESEND_API_KEY
//   - Secret FROM_EMAIL
//   - Secret SUPABASE_URL
//   - Secret SUPABASE_SERVICE_KEY
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // GET endpoints (current-affairs feed)
    if (request.method === 'GET') {
      if (url.pathname === '/affairs/latest') {
        try { return await handleAffairs(url, env, cors); }
        catch (e) { return json({ ok: false, error: 'server error', detail: String(e).slice(0, 200) }, 500, cors); }
      }
      return json({ ok: false, error: 'not found' }, 404, cors);
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
      if (url.pathname === '/otp/send')        return await handleSend(body, env, cors);
      if (url.pathname === '/otp/verify')      return await handleVerify(body, env, cors);
      if (url.pathname === '/student/register') return await handleRegister(body, env, cors);
      if (url.pathname === '/student/payment')  return await handlePayment(body, env, cors);
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

// ── Supabase helper ──────────────────────────────────────────────────────────
async function supabase(env, table, method, data) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// POST /student/register — called after OTP verify succeeds
async function handleRegister(body, env, cors) {
  const email = (body.email || '').trim().toLowerCase();
  const name  = (body.name  || '').trim();
  if (!email) return json({ ok: false, error: 'email required' }, 400, cors);

  // Upsert so re-logins don't fail
  const result = await supabase(env, 'neetest_students', 'POST', {
    email, name: name || null, source: body.source || 'web',
  });

  // 409 conflict = already registered, that's fine
  if (!result.ok && result.status !== 409) {
    console.error('register error:', result.data);
  }
  return json({ ok: true }, 200, cors);
}

// POST /student/payment — called from pricing.html Razorpay handler
async function handlePayment(body, env, cors) {
  const email = (body.email || '').trim().toLowerCase();
  const { name, razorpay_payment_id, amount_paise, plan, early_bird } = body;

  if (!email || !razorpay_payment_id || !amount_paise) {
    return json({ ok: false, error: 'missing fields' }, 400, cors);
  }

  // Ensure student exists first
  await supabase(env, 'neetest_students', 'POST', {
    email, name: name || null, source: 'web',
  });

  const result = await supabase(env, 'neetest_payments', 'POST', {
    email,
    name: name || null,
    razorpay_payment_id,
    amount_paise: Number(amount_paise),
    plan: plan || 'lifetime',
    early_bird: early_bird === true || early_bird === 'true',
    notes: { user_agent: body.user_agent || null },
  });

  if (!result.ok) {
    console.error('payment log error:', result.data);
    return json({ ok: false, error: 'could not log payment' }, 502, cors);
  }

  const invoice = result.data?.[0]?.invoice_number || null;
  return json({ ok: true, invoice_number: invoice }, 200, cors);
}

// ── Current affairs / latest research (Gemini-backed, KV-cached) ──────────────
// Returns { ok, updated, items:[{tag,title,summary}] }.
// Cache lives in OTP_STORE under `affairs:latest` and refreshes every AFFAIRS_TTL.
const AFFAIRS_TTL_SECONDS = 7 * 24 * 3600;   // refresh weekly
const AFFAIRS_KEY = 'affairs:latest';

async function handleAffairs(url, env, cors) {
  const force = url.searchParams.get('refresh') === '1';

  if (!force) {
    const cached = await env.OTP_STORE.get(AFFAIRS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return json({ ok: true, cached: true, ...parsed }, 200, cors);
      } catch { /* fall through and regenerate */ }
    }
  }

  const items = await generateAffairs(env);
  if (!items || !items.length) {
    // No key configured / Gemini failed — let the site keep its static fallback.
    return json({ ok: false, error: 'feed unavailable', items: [] }, 503, cors);
  }

  const payload = { updated: new Date().toISOString(), items };
  // Persist a bit longer than the refresh window so a transient failure still serves stale.
  await env.OTP_STORE.put(AFFAIRS_KEY, JSON.stringify(payload), { expirationTtl: AFFAIRS_TTL_SECONDS * 2 });
  return json({ ok: true, cached: false, ...payload }, 200, cors);
}

async function generateAffairs(env) {
  // Try the least-used key first, then fall back. GEMINI_API_KEY_ALT is the spare/least-used
  // key; GEMINI_API_KEY is the one the question-generation pipeline already leans on, so it's
  // only a fallback here.
  const keys = [env.GEMINI_API_KEY_ALT, env.GEMINI_API_KEY].filter(Boolean);
  if (!keys.length) return null;

  const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
  const prompt = [
    'You are a medical-education editor preparing a short current-affairs digest for Indian',
    'postgraduate medical entrance aspirants (NEET PG and INI-CET).',
    'List 6 recent, exam-relevant developments in medicine: new clinical guidelines, landmark',
    'trials, drug approvals, or high-yield updates from roughly the last 12 months.',
    'For each, give a punchy tag (1-2 words like "Guidelines", "Landmark trial", "Drug approval",',
    '"High-yield"), a concise title (<=12 words), and a 1-2 sentence summary explaining why it',
    'matters for the exam. Keep it factual and conservative; do not invent trial names or numbers.',
    'Return ONLY valid JSON of the form:',
    '{"items":[{"tag":"...","title":"...","summary":"..."}]}',
  ].join(' ');

  for (const key of keys) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
          }),
        },
      );
      if (!resp.ok) continue;   // quota/invalid key — try next
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(text);
      const items = (parsed.items || [])
        .filter(it => it && it.title && it.summary)
        .slice(0, 6)
        .map(it => ({
          tag: String(it.tag || 'Update').slice(0, 24),
          title: String(it.title).slice(0, 140),
          summary: String(it.summary).slice(0, 280),
        }));
      if (items.length) return items;
    } catch { /* try next key */ }
  }
  return null;
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
