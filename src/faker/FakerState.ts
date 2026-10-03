export type FakerClue =
  | { kind: "author"; author: "NOA." }
  | { kind: "clock"; minuteOffset: 1 }
  | { kind: "signal"; signal: "100%" }
  | { kind: "glitch"; glitch: true }
  | { kind: "timing"; delayMs: 40 }
  | { kind: "contradiction"; field: "route" };

export class FakerState {
  imitationLevel = 0.12;
  appearances = 0;
  authenticationCompromised = false;
  private clueCursor = 0;

  observeNoaConversation(): void {
    this.imitationLevel = Math.min(1, this.imitationLevel + 0.035);
  }

  noteAppearance(): void {
    this.appearances += 1;
    this.imitationLevel = Math.min(1, this.imitationLevel + 0.1);
  }

  compromiseAuthentication(): void {
    this.authenticationCompromised = true;
    this.imitationLevel = Math.max(this.imitationLevel, 0.72);
  }

  nextClue(chapter: number = 2): FakerClue {
    const clues: FakerClue[] = chapter <= 2 ? [
      { kind: "author", author: "NOA." },
      { kind: "clock", minuteOffset: 1 },
    ] : chapter === 3 ? [{ kind: "timing", delayMs: 40 }, { kind: "signal", signal: "100%" }]
      : chapter === 4 ? [{ kind: "glitch", glitch: true }, { kind: "timing", delayMs: 40 }]
        : [{ kind: "contradiction", field: "route" }, { kind: "signal", signal: "100%" }];
    const clue = clues[this.clueCursor % clues.length];
    this.clueCursor += 1;
    return clue;
  }
}
