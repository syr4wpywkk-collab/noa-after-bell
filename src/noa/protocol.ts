export const NOA_EVENTS = [
  "none",
  "flicker_lights",
  "radio_noise",
  "door_sound",
  "footsteps_far",
  "objective_hint",
] as const;

export type NoaEvent = typeof NOA_EVENTS[number];
export type NoaSource = "noa" | "faker" | "unknown";
export type NoaMood = "calm" | "uncertain" | "urgent" | "distorted";

export type NoaResponse = {
  message: string;
  source: NoaSource;
  mood: NoaMood;
  event: NoaEvent;
  delayMs: number;
  confidence: number;
};

const moods = new Set<NoaMood>(["calm", "uncertain", "urgent", "distorted"]);
const sources = new Set<NoaSource>(["noa", "faker", "unknown"]);
const events = new Set<NoaEvent>(NOA_EVENTS);

export function parseNoaResponse(value: unknown): NoaResponse {
  if (!value || typeof value !== "object") throw new Error("NOA response must be an object");
  const input = value as Record<string, unknown>;
  const message = typeof input.message === "string" ? input.message.trim().slice(0, 420) : "";
  if (!message) throw new Error("NOA response message is empty");

  const source = sources.has(input.source as NoaSource) ? input.source as NoaSource : "unknown";
  const mood = moods.has(input.mood as NoaMood) ? input.mood as NoaMood : "uncertain";
  const event = events.has(input.event as NoaEvent) ? input.event as NoaEvent : "none";
  const delayMs = Math.max(0, Math.min(3500, Number(input.delayMs) || 0));
  const confidence = Math.max(0, Math.min(1, Number(input.confidence) || 0));

  return { message, source, mood, event, delayMs, confidence };
}
