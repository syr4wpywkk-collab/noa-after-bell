import type { GameSnapshot } from "../game/GameState";
import type { MemoryMessage } from "../noa/NoaClient";

export class SessionMemory {
  private messages: MemoryMessage[] = [];
  private lastPersisted = 0;

  record(role: MemoryMessage["role"], text: string, gameTime: number): void {
    this.messages.push({ role, text: text.slice(0, 500), gameTime });
    if (this.messages.length > 40) this.messages.splice(0, this.messages.length - 40);
  }

  recent(limit = 6): MemoryMessage[] {
    return this.messages.slice(-limit).map((message) => ({ ...message }));
  }

  summary(): string {
    const recent = this.messages.slice(-12);
    const userCount = recent.filter((m) => m.role === "user").length;
    const suspicious = recent.filter((m) => /嘘|偽物|FAKER|信用|本物|違う/.test(m.text)).length;
    if (suspicious >= 2) return "プレイヤーはNOAの真正性を強く疑っている。";
    if (userCount >= 4) return "プレイヤーはNOAへ頻繁に確認しながら進んでいる。";
    return "プレイヤーは探索を優先し、必要な時だけNOAを確認している。";
  }

  async persist(snapshot: GameSnapshot): Promise<void> {
    if (this.messages.length === this.lastPersisted) return;
    this.lastPersisted = this.messages.length;
    const payload = {
      session: {
        id: snapshot.sessionId,
        chapter: snapshot.chapter,
        noa_state: snapshot.noa,
        ending: null,
      },
      messages: this.recent(8),
      summary: this.summary(),
      story_flags: snapshot.story,
    };

    try {
      await fetch("/api/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Memory persistence must never block or break play.
    }
  }
}
