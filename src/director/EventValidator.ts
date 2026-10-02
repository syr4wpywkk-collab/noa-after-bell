import type { GameSnapshot } from "../game/GameState";
import type { NoaEvent, NoaResponse } from "../noa/protocol";

const COOLDOWN_MS: Record<NoaEvent, number> = {
  none: 0,
  flicker_lights: 20_000,
  radio_noise: 12_000,
  door_sound: 30_000,
  footsteps_far: 18_000,
  objective_hint: 15_000,
};

export class EventValidator {
  private lastTriggered = new Map<NoaEvent, number>();

  validate(response: NoaResponse, state: GameSnapshot, now = Date.now()): NoaEvent {
    const event = response.event;
    if (event === "none") return "none";

    const previous = this.lastTriggered.get(event) ?? -Infinity;
    if (now - previous < COOLDOWN_MS[event]) return "none";

    if (event === "flicker_lights" && !this.zoneHasLights(state.location)) return "none";
    if (event === "footsteps_far" && state.threat.level <= 0.2) return "none";
    if (event === "objective_hint" && !state.story.hintUnlocked && state.chapter < 2) return "none";

    this.lastTriggered.set(event, now);
    return event;
  }

  private zoneHasLights(location: string): boolean {
    return !location.includes("屋上") && !location.includes("外");
  }
}
