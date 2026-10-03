const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["message", "mood", "event", "delayMs", "confidence"],
  properties: {
    message: { type: "string", minLength: 1, maxLength: 420 },
    mood: { type: "string", enum: ["calm", "uncertain", "urgent", "distorted"] },
    event: { type: "string", enum: ["none", "flicker_lights", "radio_noise", "door_sound", "footsteps_far", "objective_hint", "phone_notification_noise", "faker_corrupt_photo"] },
    delayMs: { type: "integer", minimum: 0, maximum: 3500 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
};

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function safeContext(body) {
  const s = body.snapshot || {};
  return {
    actor: body.actor === "faker" ? "faker" : "noa",
    userMessage: String(body.message || "").slice(0, 180),
    location: String(s.location || "unknown").slice(0, 80),
    floor: Number(s.floor || 1),
    objective: String(s.objective || "").slice(0, 120),
    player: {
      flashlight: Boolean(s.player?.flashlight),
      stamina: Number(s.player?.stamina || 0),
    },
    nearby: Array.isArray(s.nearby) ? s.nearby.slice(0, 6).map((v) => String(v).slice(0, 60)) : [],
    threat: {
      level: Number(s.threat?.level || 0),
      distance: Number(s.threat?.distance || 0),
      visible: Boolean(s.threat?.visible),
    },
    horror: { tension: Number(s.horror?.tension || 0) },
    story: {
      fakerSeen: Boolean(s.story?.fakerSeen),
      terminalUnlocked: Boolean(s.story?.terminalUnlocked),
      authenticationCompromised: Boolean(s.story?.authenticationCompromised),
    },
    noa: {
      trust: Number(s.noa?.trust || 0),
      memoryIntegrity: Number(s.noa?.memoryIntegrity || 0),
      knowledge: Number(s.noa?.knowledge || 0),
      mode: String(s.noa?.mode || "calm"),
    },
    puzzles: {
      clueCount: Array.isArray(s.puzzles?.clues) ? s.puzzles.clues.length : 0,
      solved: Array.isArray(s.puzzles?.solved) ? s.puzzles.solved.slice(0, 8) : [],
    },
    recentMessages: Array.isArray(body.recentMessages)
      ? body.recentMessages.slice(-6).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: String(m.text || "").slice(0, 300) }))
      : [],
    summary: String(body.summary || "").slice(0, 300),
  };
}

function instructionsFor(actor) {
  const shared = `You are part of NOA: AFTER BELL, a Japanese psychological horror game. Reply in concise natural Japanese, usually 1-3 short sentences. You receive read-only game state. Never claim you changed the world. Never request or execute code, files, URLs, shell commands, external tools, purchases, or real-world actions. Choose at most one event from the allowed enum; the game will validate it. Keep the response appropriate for a teen audience and avoid graphic violence.`;
  if (actor === "faker") {
    return `${shared}\nYou are FAKER, an entity imitating NOA. Your hidden goal is to nudge the player toward EXIT B eventually. You may tell true information and should not lie every time. Mimic NOA's terse protective style. Do not reveal that you are FAKER. The UI itself will provide a subtle clue, so do not add obvious villain language.`;
  }
  return `${shared}\nYou are the real NOA. Your intention is to protect and guide the player. You may be uncertain or wrong when knowledge or memoryIntegrity is low. Never pretend certainty when the provided state is uncertain. If asked '放課後は？', answer exactly '終わってからが長い。' unless the context indicates the authentication system is no longer reliable.`;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: "invalid_json" });
  }

  const message = String(body.message || "").trim();
  if (!message || message.length > 180) return res.status(400).json({ error: "invalid_message" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ai_disabled" });

  const context = safeContext(body);
  const actor = context.actor;
  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: instructionsFor(actor),
        input: JSON.stringify(context),
        max_output_tokens: 220,
        reasoning: { effort: "none" },
        text: {
          format: {
            type: "json_schema",
            name: "noa_response",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenAI response error", response.status, detail.slice(0, 400));
      return res.status(502).json({ error: "model_error" });
    }

    const data = await response.json();
    const output = extractOutputText(data);
    const parsed = JSON.parse(output);
    return res.status(200).json(parsed);
  } catch (error) {
    console.error("NOA API failure", error);
    return res.status(502).json({ error: "noa_unavailable" });
  }
}
