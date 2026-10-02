import type { GameSnapshot } from "../game/GameState";
import type { Actor } from "../faker/FakerRouter";
import { localNoaResponse } from "./LocalNoaRuntime";
import { parseNoaResponse, type NoaResponse } from "./protocol";

export type MemoryMessage = { role: "user" | "assistant"; text: string; gameTime: number };
export type SignalState = "sending" | "unstable" | "connected" | "offline";

export type NoaRequest = {
  message: string;
  snapshot: GameSnapshot;
  actor: Actor;
  recentMessages: MemoryMessage[];
  summary: string;
};

export class NoaClient {
  constructor(private onSignal: (state: SignalState) => void) {}

  async ask(request: NoaRequest): Promise<NoaResponse> {
    const controller = new AbortController();
    const unstableTimer = window.setTimeout(() => this.onSignal("unstable"), 1200);
    const abortTimer = window.setTimeout(() => controller.abort(), 6500);
    this.onSignal("sending");

    try {
      const response = await fetch("/api/noa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`NOA API ${response.status}`);
      const data = await response.json();
      const parsed = parseNoaResponse(data);
      this.onSignal("connected");
      return { ...parsed, source: request.actor };
    } catch (error) {
      console.warn("NOA API fallback", error);
      this.onSignal("offline");
      return localNoaResponse(request.message, request.snapshot, request.actor);
    } finally {
      window.clearTimeout(unstableTimer);
      window.clearTimeout(abortTimer);
    }
  }
}
