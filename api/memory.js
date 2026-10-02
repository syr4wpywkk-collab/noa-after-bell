function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

async function post(url, key, path, payload, onConflict) {
  const suffix = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  const response = await fetch(`${url}/rest/v1/${path}${suffix}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: key,
      authorization: `Bearer ${key}`,
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(204).end();

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: "invalid_json" });
  }

  const sessionId = String(body.session?.id || "").slice(0, 100);
  if (!sessionId) return res.status(400).json({ error: "missing_session" });

  const session = {
    id: sessionId,
    chapter: Math.max(1, Math.min(5, Number(body.session?.chapter || 1))),
    noa_state: body.session?.noa_state || {},
    ending: body.session?.ending || null,
    summary: String(body.summary || "").slice(0, 1000),
    updated_at: new Date().toISOString(),
  };

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(-8).map((message) => ({
        session_id: sessionId,
        role: message.role === "assistant" ? "assistant" : "user",
        text: String(message.text || "").slice(0, 500),
        game_time: Math.max(0, Math.round(Number(message.gameTime || 0))),
      }))
    : [];

  const flags = Object.entries(body.story_flags || {}).slice(0, 40).map(([flag, value]) => ({
    session_id: sessionId,
    flag: String(flag).slice(0, 80),
    value,
  }));

  try {
    await post(url, key, "sessions", session, "id");
    if (messages.length) await post(url, key, "messages", messages, "session_id,role,game_time");
    if (flags.length) await post(url, key, "story_flags", flags, "session_id,flag");
    return res.status(204).end();
  } catch (error) {
    console.error("memory persistence failed", error);
    return res.status(502).json({ error: "memory_unavailable" });
  }
}
