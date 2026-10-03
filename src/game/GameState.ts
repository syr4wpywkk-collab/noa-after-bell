import type { FloorId } from "./WorldLayout";
import type { ThreatSnapshot } from "../threat/ThreatState";

export type EvidenceId = "chemistry_blackboard" | "staff_seating_chart" | "electrical_wiring" | "old_school_map";

export type StoryFlags = {
  heardBell: boolean;
  fakerSeen: boolean;
  authenticationIntroduced: boolean;
  authenticationCompromised: boolean;
  terminalUnlocked: boolean;
  exitsKnown: boolean;
  hintUnlocked: boolean;
  clockSeen: boolean;
};

export type NoaHiddenState = {
  trust: number;
  corruption: number;
  knowledge: number;
  memoryIntegrity: number;
  intention: "guide" | "protect" | "conceal" | "unknown";
  mode: "calm" | "uncertain" | "urgent" | "distorted";
};

export type GameSnapshot = {
  sessionId: string;
  gameTimeMs: number;
  chapter: 1 | 2 | 3 | 4 | 5;
  location: string;
  floor: FloorId;
  objective: string;
  player: {
    flashlight: boolean;
    stamina: number;
    moving: boolean;
  };
  nearby: string[];
  threat: ThreatSnapshot & { level: number };
  horror: {
    tension: number;
    recentScares: number;
    silenceDuration: number;
    pursuitActive: boolean;
  };
  story: StoryFlags;
  noa: NoaHiddenState;
  puzzles: {
    clues: string[];
    solved: string[];
    finalCodeReady: boolean;
  };
  evidence: EvidenceId[];
  matRoute: { discovered: boolean; matsAvailable: number; matsPlaced: number; carrying: boolean; courtyardPrepared: boolean };
  connection: { manuallyDisconnected: boolean };
  safeZone: boolean;
  endingFlags: { fakerRouteDepth: number; falseExitSeen: boolean; mapContradiction: boolean };
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class GameState {
  private readonly startedAt = performance.now();
  private readonly sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  private chapter: 1 | 2 | 3 | 4 | 5 = 1;
  private location = "1F 北廊下";
  private floor: FloorId = 1;
  private objective = "校舎を確認する";
  private nearby: string[] = [];
  private player = { flashlight: true, stamina: 100, moving: false };
  private threat: GameSnapshot["threat"] = { mode: "DORMANT", awareness: 0, level: 0.12, distance: 32, visible: false, investigating: false, pursuitActive: false };
  private horror = { tension: 0.08, recentScares: 0, silenceDuration: 0, pursuitActive: false };
  private story: StoryFlags = {
    heardBell: true,
    fakerSeen: false,
    authenticationIntroduced: false,
    authenticationCompromised: false,
    terminalUnlocked: false,
    exitsKnown: false,
    hintUnlocked: false,
    clockSeen: false,
  };
  private noa: NoaHiddenState = {
    trust: 0.82,
    corruption: 0.02,
    knowledge: 0.88,
    memoryIntegrity: 0.98,
    intention: "protect",
    mode: "calm",
  };
  private clues = new Set<string>();
  private solved = new Set<string>();
  private evidence = new Set<EvidenceId>();
  private matRoute = { discovered: false, matsAvailable: 3, matsPlaced: 0, carrying: false, courtyardPrepared: false };
  private connection = { manuallyDisconnected: false };
  private safeZone = false;
  private endingFlags = { fakerRouteDepth: 0, falseExitSeen: false, mapContradiction: false };

  getSessionId(): string {
    return this.sessionId;
  }

  getChapter(): 1 | 2 | 3 | 4 | 5 {
    return this.chapter;
  }

  getFloor(): FloorId {
    return this.floor;
  }

  setChapter(chapter: 1 | 2 | 3 | 4 | 5): void {
    this.chapter = chapter;
    if (chapter === 2) this.noa.mode = "uncertain";
    if (chapter === 3) this.noa.memoryIntegrity = Math.min(this.noa.memoryIntegrity, 0.9);
    if (chapter === 4) {
      this.noa.mode = "uncertain";
      this.noa.knowledge = Math.min(this.noa.knowledge, 0.72);
      this.noa.corruption = Math.max(this.noa.corruption, 0.12);
    }
    if (chapter === 5) this.noa.mode = "urgent";
  }

  setObjective(objective: string): void {
    this.objective = objective;
  }

  updatePlayer(input: {
    floor: FloorId;
    location: string;
    flashlight: boolean;
    stamina: number;
    moving: boolean;
    nearby?: string[];
  }): void {
    this.floor = input.floor;
    this.location = input.location;
    this.player.flashlight = input.flashlight;
    this.player.stamina = Math.max(0, Math.min(100, input.stamina));
    this.player.moving = input.moving;
    this.nearby = input.nearby ?? this.nearby;
  }

  setThreat(level: number, distance: number, visible: boolean): void {
    this.threat = {
      level: clamp01(level),
      distance: Math.max(0, distance),
      visible, mode: this.threat.mode, awareness: this.threat.awareness,
      investigating: this.threat.investigating, pursuitActive: this.threat.pursuitActive,
    };
  }

  setThreatSnapshot(threat: ThreatSnapshot): void { this.threat = { ...threat, level: clamp01(threat.awareness) }; }

  setSafeZone(value: boolean): void { this.safeZone = value; }
  addEvidence(id: EvidenceId): void { this.evidence.add(id); }
  hasEvidence(id: EvidenceId): boolean { return this.evidence.has(id); }
  setDisconnected(value: boolean): void { this.connection.manuallyDisconnected = value; }
  patchEndingFlags(patch: Partial<GameSnapshot["endingFlags"]>): void { this.endingFlags = { ...this.endingFlags, ...patch }; }
  discoverMatRoute(): void { this.matRoute.discovered = true; }
  takeMat(): boolean { if (this.matRoute.carrying || this.matRoute.matsAvailable <= 0) return false; this.matRoute.carrying = true; this.matRoute.matsAvailable--; return true; }
  placeMat(required = 3): boolean { if (!this.matRoute.carrying) return false; this.matRoute.carrying = false; this.matRoute.matsPlaced++; this.matRoute.courtyardPrepared = this.matRoute.matsPlaced >= required; return true; }

  setHorror(input: GameSnapshot["horror"]): void {
    this.horror = {
      tension: clamp01(input.tension),
      recentScares: Math.max(0, Math.floor(input.recentScares)),
      silenceDuration: Math.max(0, input.silenceDuration),
      pursuitActive: input.pursuitActive,
    };
  }

  patchStory(patch: Partial<StoryFlags>): void {
    this.story = { ...this.story, ...patch };
  }

  patchNoa(patch: Partial<NoaHiddenState>): void {
    this.noa = { ...this.noa, ...patch };
    this.noa.trust = clamp01(this.noa.trust);
    this.noa.corruption = clamp01(this.noa.corruption);
    this.noa.knowledge = clamp01(this.noa.knowledge);
    this.noa.memoryIntegrity = clamp01(this.noa.memoryIntegrity);
  }

  addClue(clue: string): void {
    this.clues.add(clue);
  }

  hasClue(clue: string): boolean {
    return this.clues.has(clue);
  }

  solvePuzzle(id: string): void {
    this.solved.add(id);
  }

  isSolved(id: string): boolean {
    return this.solved.has(id);
  }

  snapshot(): GameSnapshot {
    return {
      sessionId: this.sessionId,
      gameTimeMs: Math.max(0, performance.now() - this.startedAt),
      chapter: this.chapter,
      location: this.location,
      floor: this.floor,
      objective: this.objective,
      player: { ...this.player },
      nearby: [...this.nearby],
      threat: { ...this.threat },
      horror: { ...this.horror },
      story: { ...this.story },
      noa: { ...this.noa },
      puzzles: {
        clues: [...this.clues],
        solved: [...this.solved],
        finalCodeReady: this.story.terminalUnlocked,
      },
      evidence: [...this.evidence],
      matRoute: { ...this.matRoute },
      connection: { ...this.connection },
      safeZone: this.safeZone,
      endingFlags: { ...this.endingFlags },
    };
  }
}
