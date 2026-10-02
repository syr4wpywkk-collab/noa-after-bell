import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  Engine,
  GlowLayer,
  HemisphericLight,
  Scene,
  ScenePerformancePriority,
  Vector3,
} from "@babylonjs/core";
import { AudioManager } from "../audio/AudioManager";
import { EventValidator } from "../director/EventValidator";
import { HorrorDirector } from "../director/HorrorDirector";
import { FakerRouter } from "../faker/FakerRouter";
import type { FakerClue } from "../faker/FakerState";
import { GameState } from "../game/GameState";
import { describeZone, zoneDisplayName, type FloorId } from "../game/WorldLayout";
import { SessionMemory } from "../memory/SessionMemory";
import { NoaClient } from "../noa/NoaClient";
import { NoaPhone, type MessageOptions } from "../noa/NoaPhone";
import type { NoaEvent, NoaResponse } from "../noa/protocol";
import { MobileControls } from "../player/MobileControls";
import { PlayerController } from "../player/PlayerController";
import { PuzzleManager } from "../puzzles/PuzzleManager";
import { School6F } from "../world/School6F";
import type { WorldInteraction } from "../world/types";

export class Game {
  private engine: Engine;
  private scene!: Scene;
  private school!: School6F;
  private player!: PlayerController;
  private mobile!: MobileControls;
  private phone!: NoaPhone;
  private puzzles!: PuzzleManager;
  private readonly state = new GameState();
  private readonly director = new HorrorDirector();
  private readonly validator = new EventValidator();
  private readonly faker = new FakerRouter();
  private readonly memory = new SessionMemory();
  private readonly audio = new AudioManager();
  private noaClient!: NoaClient;
  private lastFrame = performance.now();
  private currentInteraction: WorldInteraction | null = null;
  private lastInteractionAt = 0;
  private fakeFollowupTimer?: number;
  private started = false;

  constructor(private canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
      adaptToDeviceRatio: false,
      powerPreference: "high-performance",
    });
    this.engine.setHardwareScalingLevel(Math.max(1, dpr / 1.55));
  }

  async boot(): Promise<void> {
    this.scene = this.createScene();
    this.school = new School6F(this.scene);
    this.school.build();

    this.player = new PlayerController(this.scene, this.canvas);
    this.player.spawn(new Vector3(0, 0.9, 6), 1);

    this.phone = new NoaPhone();
    this.noaClient = new NoaClient((signal) => this.phone.setSignal(signal));
    this.puzzles = new PuzzleManager(this.state, this.phone);
    this.mobile = new MobileControls(this.player, this.phone, () => this.interact());
    this.phone.setSubmitHandler((text) => this.handleNoaInput(text));

    this.bindDesktopActions();
    this.bindTerminal();
    this.setupStartScreen();
    this.setupResize();

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.04, (now - this.lastFrame) / 1000);
      this.lastFrame = now;

      this.player.update(dt);
      this.school.update(now);
      if (this.started) this.updateGame(dt);
      this.scene.render();
    });
  }

  private updateGame(dt: number): void {
    const floor = this.player.getFloor();
    const position = this.player.getPosition();
    const zone = describeZone(floor, position.x, position.z);
    const location = zoneDisplayName(floor, zone);
    const nearby = this.school.getNearbyLabels(position, floor);

    this.state.updatePlayer({
      floor,
      location,
      flashlight: this.player.isFlashlightOn(),
      stamina: this.player.getStamina(),
      moving: this.player.isMoving(),
      nearby,
    });

    this.updateChapter();
    let snapshot = this.state.snapshot();
    const horror = this.director.update(dt, snapshot);
    this.state.setHorror({
      tension: horror.tension,
      recentScares: horror.recentScares,
      silenceDuration: horror.silenceDuration,
      pursuitActive: horror.pursuitActive,
    });
    this.state.setThreat(horror.threatLevel, horror.threatDistance, false);
    snapshot = this.state.snapshot();

    this.currentInteraction = this.school.getNearbyInteraction(position, floor);
    this.updateHud(snapshot);
    this.updateInteractionPrompt();

    if (this.director.shouldTriggerFirstFaker(snapshot)) this.triggerFirstFaker();
  }

  private updateChapter(): void {
    const snapshot = this.state.snapshot();
    if (snapshot.chapter === 1 && snapshot.floor >= 3) {
      this.state.setChapter(2);
      this.state.setObjective("上階の異常と保守番号を調べる");
    }
    if (snapshot.chapter <= 2 && snapshot.puzzles.clues.length >= 2) {
      this.state.setChapter(3);
    }
    if (snapshot.chapter <= 3 && snapshot.story.terminalUnlocked) {
      this.state.setChapter(4);
      this.faker.state.compromiseAuthentication();
      this.state.patchStory({ authenticationCompromised: true });
      this.state.patchNoa({ mode: "uncertain", memoryIntegrity: 0.78, knowledge: 0.68 });
    }
    if (snapshot.chapter <= 4 && snapshot.story.terminalUnlocked && snapshot.floor === 1 && snapshot.location.includes("体育館")) {
      this.state.setChapter(5);
    }
  }

  private updateHud(snapshot: ReturnType<GameState["snapshot"]>): void {
    const floorLabel = document.querySelector<HTMLElement>("#floor-label");
    const objective = document.querySelector<HTMLElement>("#objective");
    const tension = document.querySelector<HTMLElement>("#tension-meter");
    if (floorLabel) floorLabel.textContent = `${snapshot.floor}F · CH${snapshot.chapter}`;
    if (objective) objective.textContent = snapshot.objective;
    if (tension) tension.style.transform = `scaleX(${Math.max(0.04, snapshot.horror.tension)})`;
    this.phone.setClock(snapshot.gameTimeMs);
  }

  private updateInteractionPrompt(): void {
    const prompt = document.querySelector<HTMLElement>("#interaction-prompt");
    const button = document.querySelector<HTMLButtonElement>("#interact-button");
    const label = this.currentInteraction?.label ?? "";
    if (prompt) {
      prompt.textContent = label ? `調べる：${label}` : "";
      prompt.classList.toggle("visible", Boolean(label));
    }
    if (button) button.classList.toggle("available", Boolean(label));
  }

  private interact(): void {
    if (!this.currentInteraction) return;
    const now = performance.now();
    if (now - this.lastInteractionAt < 450) return;
    this.lastInteractionAt = now;
    const interaction = this.currentInteraction;

    if (interaction.kind === "stairs_up" || interaction.kind === "stairs_down") {
      const delta = interaction.kind === "stairs_up" ? 1 : -1;
      const next = Math.max(1, Math.min(6, this.player.getFloor() + delta)) as FloorId;
      if (next === this.player.getFloor()) return;
      const arriveZ = interaction.z < 10 ? 4.8 : 35.2;
      this.school.setActiveFloor(next);
      this.player.setFloor(next, 0, arriveZ);
      this.phone.notify(`${next}F`, 1200);
      this.state.setObjective(next === 6 ? "6F 資料室の保守端末を調べる" : "手掛かりと上階への経路を探す");
      return;
    }

    const action = this.puzzles.handle(interaction);
    if (action.type === "terminal") this.openTerminal();
    if (action.type === "ending") this.showEnding(action.ending);
  }

  private async handleNoaInput(text: string): Promise<void> {
    const before = this.state.snapshot();
    this.phone.push("YOU", text, { user: true });
    this.memory.record("user", text, before.gameTimeMs);

    if (!before.story.authenticationIntroduced) {
      this.state.patchStory({ authenticationIntroduced: true });
    }

    const cap = this.director.fakerProbabilityCap(before);
    const actor = this.faker.chooseActor(before, cap, text);
    if (actor === "faker") this.faker.state.noteAppearance();
    else this.faker.state.observeNoaConversation();

    this.phone.showTyping(true);
    const response = await this.noaClient.ask({
      message: text,
      snapshot: this.state.snapshot(),
      actor,
      recentMessages: this.memory.recent(6),
      summary: this.memory.summary(),
    });
    this.phone.showTyping(false);

    const delay = Math.max(80, Math.min(3000, response.delayMs));
    await new Promise((resolve) => window.setTimeout(resolve, delay));

    const visual = response.source === "faker" ? this.visualForFaker(this.faker.state.nextClue()) : { mood: response.mood };
    const author = response.source === "faker" && visual.author ? visual.author : "NOA";
    const streamDelay = response.source === "faker" && this.faker.state.imitation < 0.72 ? 7 : 18;
    await this.phone.pushStreamed(author, response.message, visual, streamDelay);
    this.memory.record("assistant", response.message, this.state.snapshot().gameTimeMs);

    const event = this.validator.validate(response, this.state.snapshot());
    this.applyAiEvent(event);
    void this.memory.persist(this.state.snapshot());
  }

  private visualForFaker(clue: FakerClue): MessageOptions & { author?: string } {
    if (clue.kind === "author") return { author: clue.author, mood: "calm" };
    if (clue.kind === "clock") return { minuteOffset: clue.minuteOffset, mood: "calm" };
    if (clue.kind === "signal") return { signalOverride: clue.signal, mood: "calm" };
    return { glitch: true, mood: "distorted" };
  }

  private applyAiEvent(event: NoaEvent): void {
    if (event === "none") return;
    this.director.noteEvent();
    if (event === "flicker_lights") this.school.flickerLights(this.player.getFloor());
    if (event === "radio_noise") this.audio.radioNoise();
    if (event === "door_sound") this.audio.doorSound();
    if (event === "footsteps_far") this.audio.footstepsFar();
    if (event === "objective_hint") this.phone.notify("NOAが周辺情報を照合中…", 1500);
  }

  private triggerFirstFaker(): void {
    this.state.patchStory({ fakerSeen: true });
    this.faker.state.noteAppearance();
    this.director.noteScare();
    this.audio.radioNoise();
    this.phone.push("NOA.", "後ろを見て。", { glitch: true, minuteOffset: 1, mood: "uncertain" });
    this.phone.notify("NEW MESSAGE", 1500);
    window.clearTimeout(this.fakeFollowupTimer);
    this.fakeFollowupTimer = window.setTimeout(() => {
      this.phone.push("NOA", "……私は送ってない。\n\nこれから、表示名だけで判断しないで。", { mood: "urgent" });
      this.state.patchNoa({ trust: 0.72, mode: "uncertain" });
      this.state.setObjective("NOAと表示の違和感を確認しながら進む");
    }, 3400);
  }

  private openTerminal(): void {
    const panel = document.querySelector<HTMLElement>("#terminal-panel");
    const input = document.querySelector<HTMLInputElement>("#terminal-input");
    panel?.classList.add("open");
    input?.focus();
    this.player.setActive(false);
    this.mobile.setActive(false);
  }

  private closeTerminal(): void {
    document.querySelector<HTMLElement>("#terminal-panel")?.classList.remove("open");
    this.player.setActive(true);
    this.mobile.setActive(true);
  }

  private bindTerminal(): void {
    const form = document.querySelector<HTMLFormElement>("#terminal-form");
    const input = document.querySelector<HTMLInputElement>("#terminal-input");
    const close = document.querySelector<HTMLButtonElement>("#terminal-close");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = input?.value ?? "";
      if (this.puzzles.submitTerminal(code)) {
        if (input) input.value = "";
        this.closeTerminal();
        this.faker.state.compromiseAuthentication();
        this.director.noteScare();
        window.setTimeout(() => {
          this.phone.push("NOA.", "1F。体育館。Bの出口。急いで。", this.visualForFaker(this.faker.state.nextClue()));
        }, 2100);
      }
    });
    close?.addEventListener("click", () => this.closeTerminal());
  }

  private bindDesktopActions(): void {
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyE") this.interact();
      if (event.code === "Tab") {
        event.preventDefault();
        this.phone.toggle();
      }
    });
  }

  private setupStartScreen(): void {
    const start = document.querySelector<HTMLElement>("#start-screen");
    const button = document.querySelector<HTMLButtonElement>("#enter-button");
    const status = document.querySelector<HTMLElement>("#boot-status");
    if (status) status.textContent = "v0.3 · TRUST / FAKER · 6F CAMPUS";

    button?.addEventListener("click", async () => {
      start?.classList.add("hidden");
      await this.audio.start();
      this.started = true;
      this.state.setObjective("6Fまで校内保守番号の手掛かりを集める");
      this.phone.push("NOA", "接続できてる。\n\nこの校舎は6階。2Fから5Fの特別教室に、保守番号の断片があるみたい。", { mood: "calm" });
      window.setTimeout(() => {
        this.phone.push("NOA", "もし通信がおかしくなったら、私に『放課後は？』って聞いて。", { mood: "calm" });
        this.state.patchStory({ authenticationIntroduced: true });
      }, 1700);
      this.player.setActive(true);
      this.mobile.setActive(true);
      this.canvas.focus();
      void this.memory.persist(this.state.snapshot());
    }, { once: true });
  }

  private showEnding(ending: "A" | "B"): void {
    this.player.setActive(false);
    this.mobile.setActive(false);
    const screen = document.querySelector<HTMLElement>("#ending-screen");
    const title = document.querySelector<HTMLElement>("#ending-title");
    const copy = document.querySelector<HTMLElement>("#ending-copy");
    if (title) title.textContent = ending === "A" ? "SIGNAL" : "AFTER BELL";
    if (copy) {
      copy.innerHTML = ending === "A"
        ? "非常口Aを押した。<br>NOAの表示は、最後まで消えなかった。<br><br>それが本物だった証拠はない。"
        : "非常口Bを押した。<br>扉の向こうで、同じ通知音が二度鳴った。<br><br>どちらが先だったか思い出せない。";
    }
    screen?.classList.remove("hidden");
  }

  private createScene(): Scene {
    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0.006, 0.01, 0.014, 1);
    scene.ambientColor = new Color3(0.035, 0.045, 0.05);
    scene.collisionsEnabled = true;
    scene.performancePriority = ScenePerformancePriority.Intermediate;
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.011;
    scene.fogColor = new Color3(0.022, 0.03, 0.035);

    const hemi = new HemisphericLight("night-fill", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.1;
    hemi.diffuse = new Color3(0.34, 0.43, 0.48);
    hemi.groundColor = new Color3(0.025, 0.03, 0.035);

    const glow = new GlowLayer("emissive-glow", scene, { blurKernelSize: 24 });
    glow.intensity = 0.24;

    const pipeline = new DefaultRenderingPipeline("after-bell-pipeline", true, scene);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.13;
    pipeline.bloomKernel = 32;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.13;
    pipeline.imageProcessing.exposure = 0.86;
    return scene;
  }

  private setupResize(): void {
    window.addEventListener("resize", () => this.engine.resize());
    window.addEventListener("orientationchange", () => window.setTimeout(() => this.engine.resize(), 120));
  }
}