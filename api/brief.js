/**
 * Generate AI Brief — server-side endpoint.
 *
 * The browser sends results that the app has ALREADY calculated (counts, statuses,
 * scores, dollar figures). This function asks the model to summarise them into a
 * short brief. The model is told not to calculate anything and is only given the
 * numbers the app computed. The API key lives here, never in the page.
 *
 * Calls DeepSeek's chat completions API. Set DEEPSEEK_API_KEY (preferred) in the
 * server environment to enable this endpoint; DEEP_SEEK_API_KEY is also accepted
 * for backward compatibility. Optionally set BRIEF_MODEL to override the model.
 *
 * Runs as a Vercel serverless function (zero config) and is also used by server.js
 * for local development. No dependencies.
 *
 *   GET  /api/brief  -> { enabled: true|false }   (does the server have a key?)
 *   POST /api/brief  -> { brief: "..." }           body: { tool, data }
 */

const API_URL = process.env.BRIEF_API_URL || 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.BRIEF_MODEL || 'deepseek-v4-flash';
const MAX_BODY = 30_000; // bytes — the payloads the app sends are ~2–8 KB
const TOOLS = {
  inventory: 'Inventory Planner. Focus on stockout risk (Critical), reorder needs and overstock (cash tied up).',
  freight:   'Freight Exceptions. Focus on the shipments and lanes with the largest estimated excess cost, then lateness patterns by carrier or lane.',
  supplier:  'Supplier Scorecard. Focus on supplier performance risk: low-rated suppliers, especially those with high annual spend, and which dimension drives their score.',
};

const SYSTEM = `You write short operational briefs for a supply-chain manager.

Rules:
- Use ONLY the numbers, statuses, scores and names in the JSON provided. They were computed by the application. Do not calculate, estimate, total, average, or infer any figure that is not explicitly present. Quote figures exactly as given.
- Do not invent SKUs, suppliers, shipments, lanes or causes.
- Maximum 150 words. Plain text, no markdown symbols, no tables.
- Use exactly this structure, each heading on its own line:
Top 3 issues
1. ...
2. ...
3. ...
Why they matter
...
Recommended actions
...
- Be specific and direct. Name the items. No preamble, no sign-off.`;

async function readJson(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) throw new Error('Payload too large'); }
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  // DEEPSEEK_API_KEY is the preferred name; DEEP_SEEK_API_KEY is accepted for backward compatibility.
  const key = process.env.DEEPSEEK_API_KEY || process.env.DEEP_SEEK_API_KEY;

  if (req.method === 'GET') return send(res, 200, { enabled: Boolean(key) });
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!key) return send(res, 503, { error: 'AI brief is not configured on this server.' });

  let body;
  try { body = await readJson(req); } catch (e) { return send(res, 400, { error: e.message || 'Invalid JSON' }); }
  const { tool, data } = body || {};
  if (!TOOLS[tool] || !data || typeof data !== 'object') return send(res, 400, { error: 'Expected { tool, data }' });
  const json = JSON.stringify(data);
  if (json.length > MAX_BODY) return send(res, 413, { error: 'Payload too large' });

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        temperature: 0.2,
        stream: false,
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Tool: ${TOOLS[tool]}\n\nCalculated results (JSON):\n${json}` },
        ],
      }),
    });
    const out = await r.json();
    if (!r.ok) return send(res, 502, { error: out?.error?.message || `Model request failed (${r.status})` });
    const brief = (out.choices?.[0]?.message?.content || '').trim();
    if (!brief) return send(res, 502, { error: 'Empty response from model' });
    return send(res, 200, { brief, model: MODEL });
  } catch (e) {
    return send(res, 502, { error: 'Could not reach the model service.' });
  }
};
