import type { GameSnapshot } from "../game/GameState";
import type { EndingId } from "./EndingDefinitions";
const TRUE_EVIDENCE = ["chemistry_blackboard", "staff_seating_chart", "electrical_wiring", "old_school_map"];
export class EndingController {
  canTrigger(id: EndingId, state: GameSnapshot): boolean {
    switch (id) {
      case "ENDING_01_ESCAPE": return state.story.terminalUnlocked;
      case "ENDING_02_MISSING": return state.endingFlags.fakerRouteDepth >= 3;
      case "ENDING_03_CRITICAL": return state.matRoute.discovered && state.matRoute.courtyardPrepared && !state.threat.pursuitActive;
      case "ENDING_04_FALSE_EXIT": return state.story.terminalUnlocked && state.story.fakerSeen;
      case "ENDING_05_NO_SIGNAL": return state.story.terminalUnlocked && state.connection.manuallyDisconnected;
      case "ENDING_06_AFTER_BELL": return state.story.terminalUnlocked && state.endingFlags.mapContradiction && state.puzzles.solved.includes("maintenance_terminal") && TRUE_EVIDENCE.every((id) => state.evidence.includes(id as never));
    }
  }
  resolveFrontExit(state: GameSnapshot, fake: boolean): EndingId {
    if (this.canTrigger("ENDING_06_AFTER_BELL", state) && !fake) return "ENDING_06_AFTER_BELL";
    if (this.canTrigger("ENDING_05_NO_SIGNAL", state) && !fake) return "ENDING_05_NO_SIGNAL";
    return fake ? "ENDING_04_FALSE_EXIT" : "ENDING_01_ESCAPE";
  }
}
