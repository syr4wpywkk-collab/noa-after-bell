import type { GameSnapshot } from "../game/GameState";
import { FakerState } from "./FakerState";

export type Actor = "noa" | "faker";

export class FakerRouter {
  readonly state = new FakerState();

  chooseActor(snapshot: GameSnapshot, fakerProbabilityCap: number, userText: string): Actor {
    const normalized = userText.replace(/\s/g, "");
    if (normalized.includes("放課後は？") || normalized.includes("放課後は?")) {
      if (!this.state.authenticationCompromised) return "noa";
    }

    if (snapshot.chapter <= 1 || !snapshot.story.fakerSeen) return "noa";
    return Math.random() < fakerProbabilityCap ? "faker" : "noa";
  }
}
