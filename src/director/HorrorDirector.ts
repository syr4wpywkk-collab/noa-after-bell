import type { GameSnapshot } from "../game/GameState";

export type HorrorDirectorState = {
  tension: number;
  recentScares: number;
  silenceDuration: number;
  pursuitActive: boolean;
  threatLevel: number;
  threatDistance: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class HorrorDirector {
  private silenceDuration = 0;
  private scareAges: number[] = [];
  private firstFakerTriggered = false;
  private pursuitActive = false;

  setPursuitActive(active: boolean): void { this.pursuitActive = active; }

  update(dt: number, snapshot: GameSnapshot): HorrorDirectorState {
    this.silenceDuration += dt;
    this.scareAges = this.scareAges.map((age) => age + dt).filter((age) => age < 70);

    const floorPressure = (snapshot.floor - 1) * 0.055;
    const chapterPressure = (snapshot.chapter - 1) * 0.09;
    const darkness = snapshot.player.flashlight ? 0 : 0.11;
    const stillness = snapshot.player.moving ? 0 : Math.min(0.11, this.silenceDuration / 160);
    const recentPenalty = Math.min(0.16, this.scareAges.length * 0.04);
    const puzzlePressure = snapshot.story.terminalUnlocked ? 0.12 : 0;

    const tension = clamp01(0.08 + floorPressure + chapterPressure + darkness + stillness + puzzlePressure - recentPenalty);
    const threatLevel = clamp01(0.08 + tension * 0.76 + (snapshot.chapter >= 4 ? 0.08 : 0));
    const threatDistance = Math.max(5, 34 - tension * 23);

    return {
      tension,
      recentScares: this.scareAges.length,
      silenceDuration: this.silenceDuration,
      pursuitActive: this.pursuitActive,
      threatLevel,
      threatDistance,
    };
  }

  noteScare(): void {
    this.scareAges.push(0);
    this.silenceDuration = 0;
  }

  noteEvent(): void {
    this.silenceDuration = 0;
  }

  shouldTriggerFirstFaker(snapshot: GameSnapshot): boolean {
    if (this.firstFakerTriggered || snapshot.story.fakerSeen) return false;
    if (snapshot.chapter < 2) return false;
    if (snapshot.floor < 3) return false;
    this.firstFakerTriggered = true;
    return true;
  }

  fakerProbabilityCap(snapshot: GameSnapshot): number {
    if (!snapshot.story.fakerSeen || snapshot.chapter < 2) return 0;
    const base = snapshot.chapter === 2 ? 0.08 : snapshot.chapter === 3 ? 0.14 : 0.2;
    return Math.min(0.24, base + snapshot.horror.tension * 0.06);
  }
}
