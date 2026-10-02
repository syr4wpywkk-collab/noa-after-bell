export type FakerClue =
  | { kind: "author"; author: "NOA." }
  | { kind: "clock"; minuteOffset: 1 }
  | { kind: "signal"; signal: "100%" }
  | { kind: "glitch"; glitch: true };

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

  nextClue(): FakerClue {
    const clues: FakerClue[] = [
      { kind: "author", author: "NOA." },
      { kind: "clock", minuteOffset: 1 },
      { kind: "signal", signal: "100%" },
      { kind: "glitch", glitch: true },
    ];
    const clue = clues[this.clueCursor % clues.length];
    this.clueCursor += 1;
    return clue;
  }
}
