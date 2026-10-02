import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  Engine,
  GlowLayer,
  HemisphericLight,
  Scene,
  ScenePerformancePriority,
  Vector3
} from "@babylonjs/core";
import { School } from "../world/School";
import { PlayerController } from "../player/PlayerController";
import { MobileControls } from "../player/MobileControls";
import { NoaPhone } from "../noa/NoaPhone";
import { AnomalyDirector } from "../horror/AnomalyDirector";
import { AudioManager } from "../audio/AudioManager";

export class Game {
  private engine: Engine;
  private scene!: Scene;
  private school!: School;
  private player!: PlayerController;
  private mobile!: MobileControls;
  private phone!: NoaPhone;
  private anomaly!: AnomalyDirector;
  private audio = new AudioManager();
  private lastFrame = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
      adaptToDeviceRatio: false
    });
    this.engine.setHardwareScalingLevel(Math.max(1, dpr / 1.55));
  }

  async boot(): Promise<void> {
    this.scene = this.createScene();
    this.school = new School(this.scene);
    this.school.build();

    this.player = new PlayerController(this.scene, this.canvas);
    this.player.spawn(new Vector3(0, 0.9, 2.4));

    this.phone = new NoaPhone();
    this.mobile = new MobileControls(this.player, this.phone);
    this.anomaly = new AnomalyDirector(
      this.scene,
      this.player,
      this.phone,
      this.audio
    );

    this.setupStartScreen();
    this.setupResize();

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.04, (now - this.lastFrame) / 1000);
      this.lastFrame = now;

      this.player.update(dt);
      this.school.update(now);
      this.anomaly.update(now);
      this.scene.render();
    });
  }

  private createScene(): Scene {
    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0.008, 0.012, 0.016, 1);
    scene.ambientColor = new Color3(0.045, 0.052, 0.06);
    scene.collisionsEnabled = true;
    scene.performancePriority = ScenePerformancePriority.Intermediate;

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.012;
    scene.fogColor = new Color3(0.025, 0.033, 0.038);

    const hemi = new HemisphericLight("night-fill", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.11;
    hemi.diffuse = new Color3(0.35, 0.44, 0.5);
    hemi.groundColor = new Color3(0.03, 0.035, 0.04);

    const glow = new GlowLayer("emissive-glow", scene, { blurKernelSize: 24 });
    glow.intensity = 0.28;

    const pipeline = new DefaultRenderingPipeline("after-bell-pipeline", true, scene);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.78;
    pipeline.bloomWeight = 0.16;
    pipeline.bloomKernel = 32;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.12;
    pipeline.imageProcessing.exposure = 0.88;

    return scene;
  }

  private setupStartScreen(): void {
    const start = document.querySelector<HTMLElement>("#start-screen");
    const button = document.querySelector<HTMLButtonElement>("#enter-button");
    const status = document.querySelector<HTMLElement>("#boot-status");

    if (status) status.textContent = "3D REBUILD / FIRST WALK";

    button?.addEventListener("click", async () => {
      start?.classList.add("hidden");
      await this.audio.start();
      this.phone.push("NOA", "接続できてる。\n\n体育館の非常口まで行こう。");
      this.player.setActive(true);
      this.mobile.setActive(true);
      this.canvas.focus();
    }, { once: true });
  }

  private setupResize(): void {
    window.addEventListener("resize", () => this.engine.resize());
    window.addEventListener("orientationchange", () => {
      window.setTimeout(() => this.engine.resize(), 120);
    });
  }
}
