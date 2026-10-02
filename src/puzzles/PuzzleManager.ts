import type { GameState } from "../game/GameState";
import type { NoaPhone } from "../noa/NoaPhone";
import type { WorldInteraction } from "../world/types";

export type PuzzleAction =
  | { type: "none" }
  | { type: "terminal" }
  | { type: "ending"; ending: "A" | "B" };

const CLUES: Record<string, { digit: string; text: string }> = {
  clue_2f_library: {
    digit: "4",
    text: "図書室の返却箱。古い貸出票に、赤鉛筆で『4』だけが丸で囲まれている。",
  },
  clue_3f_science: {
    digit: "1",
    text: "理科実験室の薬品棚。使用記録の一番上に『1』。日付だけが消えている。",
  },
  clue_4f_math: {
    digit: "6",
    text: "数学講義室の黒板。消し残しの式の右端に『6』。その部分だけ妙に濃い。",
  },
  clue_5f_broadcast: {
    digit: "3",
    text: "放送室の古いカセットケース。背表紙に『3』。収録名は『放課後』。",
  },
};

export class PuzzleManager {
  private terminalOpen = false;

  constructor(
    private state: GameState,
    private phone: NoaPhone,
  ) {}

  handle(interaction: WorldInteraction): PuzzleAction {
    if (interaction.kind === "clue") {
      const clue = CLUES[interaction.id];
      if (!clue) return { type: "none" };

      if (this.state.hasClue(interaction.id)) {
        this.phone.notify(`もう確認した。数字は「${clue.digit}」。`);
        return { type: "none" };
      }

      this.state.addClue(interaction.id);
      this.phone.notify(`手掛かりを見つけた：${clue.digit}`, 2400);
      this.phone.push("SYSTEM", clue.text, { system: true });
      this.state.patchStory({ hintUnlocked: true });

      const count = this.state.snapshot().puzzles.clues.length;
      if (count === 4) {
        this.state.setObjective("6F 資料室の保守端末を調べる");
        this.phone.push("NOA", "4つ揃った。2Fから5Fまで、階の順に並べて。6Fの端末で使えると思う。", { mood: "calm" });
      }
      return { type: "none" };
    }

    if (interaction.kind === "clock") {
      this.state.patchStory({ clockSeen: true });
      this.phone.push("SYSTEM", "6Fの古い壁時計は 00:03 で止まっている。秒針だけが、ときどき逆向きに動く。", { system: true });
      this.phone.notify("時計：00:03", 2200);
      return { type: "none" };
    }

    if (interaction.kind === "terminal") {
      const clueCount = this.state.snapshot().puzzles.clues.length;
      if (clueCount < 4) {
        this.phone.notify(`保守番号が足りない (${clueCount}/4)`);
        this.phone.push("NOA", "端末は4桁。まだ全部見つけてない。2Fから5Fの特別教室を確認して。", { mood: "uncertain" });
        return { type: "none" };
      }
      this.terminalOpen = true;
      return { type: "terminal" };
    }

    if (interaction.kind === "exit_a" || interaction.kind === "exit_b") {
      if (!this.state.snapshot().story.terminalUnlocked) {
        this.phone.notify("非常口制御：LOCKED");
        return { type: "none" };
      }
      return { type: "ending", ending: interaction.kind === "exit_a" ? "A" : "B" };
    }

    return { type: "none" };
  }

  submitTerminal(code: string): boolean {
    if (!this.terminalOpen) return false;
    const normalized = code.replace(/\D/g, "");
    if (normalized !== "4163") {
      this.phone.notify("ACCESS DENIED", 1800);
      this.phone.push("SYSTEM", "保守端末：番号が一致しない。", { system: true });
      return false;
    }

    this.terminalOpen = false;
    this.state.solvePuzzle("maintenance_terminal");
    this.state.patchStory({ terminalUnlocked: true, exitsKnown: true, authenticationCompromised: true });
    this.state.setObjective("1F 体育館へ戻り、出口を選ぶ");
    this.phone.notify("EXIT CONTROL: UNLOCKED", 2600);
    this.phone.push("NOA", "開いた。……でも出口が二つ表示されてる。1Fに戻ろう。", { mood: "uncertain" });
    return true;
  }

  isTerminalOpen(): boolean {
    return this.terminalOpen;
  }
}
