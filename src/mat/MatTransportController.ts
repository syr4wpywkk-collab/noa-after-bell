import type { GameState } from "../game/GameState";
export class MatTransportController {
  constructor(private state: GameState) {}
  pickup(): boolean { this.state.discoverMatRoute(); return this.state.takeMat(); }
  place(): boolean { return this.state.placeMat(3); }
}
