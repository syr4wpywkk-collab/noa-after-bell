import {
  Color3,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import { PlayerController } from "../player/PlayerController";
import { NoaPhone } from "../noa/NoaPhone";
import { AudioManager } from "../audio/AudioManager";

type State = "idle" | "visible" | "gone" | "escaped";

export class AnomalyDirector {
  private state: State = "idle";
  private ghost: TransformNode;
  private appearedAt = 0;
  private objective = document.querySelector<HTMLElement>("#objective");

  constructor(
    private scene: Scene,
    private player: PlayerController,
    private phone: NoaPhone,
    private audio: AudioManager
  ) {
    this.ghost = this.buildGhost();
    this.ghost.setEnabled(false);
  }

  update(now: number): void {
    const position = this.player.getPosition();

    if (this.state === "idle" && position.z > 18.5) {
      this.appear(now);
    }

    if (this.state === "visible") {
      if (now - this.appearedAt > 4600) {
        this.ghost.setEnabled(false);
        this.state = "gone";
        this.phone.notify("……消えた。");
        this.phone.push("NOA", "……消えた。\n\n戻らなくていい。そのまま体育館へ。");
      }
    }

    if (this.state !== "escaped" && position.z > 69.2) {
      this.state = "escaped";
      this.objective!.textContent = "OUTSIDE.";
      this.phone.notify("非常口に着いた。", 3000);
      this.phone.push("NOA", "外に出よう。\n\nここでは、振り返らなくていい。");
      this.showEnding();
    }
  }

  private appear(now: number): void {
    this.state = "visible";
    this.appearedAt = now;
    this.ghost.setEnabled(true);
    this.phone.notify("廊下の先に、何かいる。", 2400);
    this.phone.push("NOA", "止まらなくていい。\n\n近づいて確認しなくていい。体育館まで進んで。");
    if (this.objective) this.objective.textContent = "目的：体育館へ。確認のために戻らない";
    this.audio.sting();
  }

  private buildGhost(): TransformNode {
    const root = new TransformNode("ghost-root", this.scene);
    root.position = new Vector3(0.45, 0, 39.5);

    const cloth = new PBRMaterial("ghost-cloth", this.scene);
    cloth.albedoColor = new Color3(0.55, 0.60, 0.59);
    cloth.emissiveColor = new Color3(0.055, 0.062, 0.061);
    cloth.roughness = 0.96;

    const skin = new PBRMaterial("ghost-skin", this.scene);
    skin.albedoColor = new Color3(0.64, 0.67, 0.65);
    skin.roughness = 0.98;

    const hair = new StandardMaterial("ghost-hair", this.scene);
    hair.diffuseColor = new Color3(0.008, 0.009, 0.01);
    hair.specularColor = new Color3(0.02, 0.02, 0.02);

    const body = MeshBuilder.CreateCylinder("ghost-body", {
      height: 1.62,
      diameterTop: 0.42,
      diameterBottom: 0.88,
      tessellation: 28
    }, this.scene);
    body.position.y = 0.82;
    body.material = cloth;
    body.parent = root;

    const head = MeshBuilder.CreateSphere("ghost-head", {
      diameter: 0.52,
      segments: 20
    }, this.scene);
    head.position.y = 1.79;
    head.material = skin;
    head.parent = root;

    const hairShell = MeshBuilder.CreateSphere("ghost-hair-shell", {
      diameter: 0.59,
      segments: 20
    }, this.scene);
    hairShell.scaling = new Vector3(1.04, 1.22, 1.03);
    hairShell.position = new Vector3(0, 1.86, 0.035);
    hairShell.material = hair;
    hairShell.parent = root;

    const hairCurtain = MeshBuilder.CreateBox("ghost-hair-curtain", {
      width: 0.5,
      height: 0.82,
      depth: 0.16
    }, this.scene);
    hairCurtain.position = new Vector3(0, 1.57, -0.22);
    hairCurtain.material = hair;
    hairCurtain.parent = root;

    return root;
  }

  private showEnding(): void {
    if (document.querySelector("#ending-card")) return;

    const ending = document.createElement("section");
    ending.id = "ending-card";
    ending.innerHTML = `
      <div>
        <small>FIRST WALK COMPLETE</small>
        <h2>OUTSIDE.</h2>
        <p>校舎の外に出た。<br>でも、体育館の灯りはまだ点いている。</p>
      </div>
    `;

    Object.assign(ending.style, {
      position: "fixed",
      inset: "0",
      zIndex: "30",
      display: "grid",
      placeItems: "center",
      textAlign: "center",
      color: "#eef7f7",
      background: "rgba(1,4,6,.86)",
      backdropFilter: "blur(12px)",
      opacity: "0",
      transition: "opacity .7s ease",
      pointerEvents: "none"
    });

    document.body.append(ending);
    requestAnimationFrame(() => ending.style.opacity = "1");
    window.setTimeout(() => ending.style.opacity = "0", 4200);
    window.setTimeout(() => ending.remove(), 5100);
  }
}
