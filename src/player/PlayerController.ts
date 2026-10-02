import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  SpotLight,
  UniversalCamera,
  Vector3
} from "@babylonjs/core";

export class PlayerController {
  readonly camera: UniversalCamera;
  readonly collider: Mesh;

  private yaw = 0;
  private pitch = 0;
  private analogX = 0;
  private analogY = 0;
  private active = false;
  private keys = new Set<string>();
  private flashlight: SpotLight;
  private flashlightOn = true;

  constructor(private scene: Scene, private canvas: HTMLCanvasElement) {
    this.collider = MeshBuilder.CreateBox("player-collider", {
      width: 0.55,
      height: 1.8,
      depth: 0.55
    }, scene);
    this.collider.visibility = 0;
    this.collider.isPickable = false;
    this.collider.checkCollisions = false;
    this.collider.ellipsoid = new Vector3(0.28, 0.86, 0.28);
    this.collider.ellipsoidOffset = new Vector3(0, 0, 0);

    this.camera = new UniversalCamera("player-camera", new Vector3(0, 0.68, 0), scene);
    this.camera.parent = this.collider;
    this.camera.minZ = 0.04;
    this.camera.fov = 0.92;
    this.camera.inertia = 0;
    scene.activeCamera = this.camera;

    this.flashlight = new SpotLight(
      "flashlight",
      Vector3.Zero(),
      new Vector3(0, 0, 1),
      Math.PI / 2.65,
      18,
      scene
    );
    this.flashlight.parent = this.camera;
    this.flashlight.diffuse = new Color3(0.88, 0.93, 0.90);
    this.flashlight.specular = new Color3(0.32, 0.36, 0.34);
    this.flashlight.intensity = 4.7;
    this.flashlight.range = 23;

    this.bindKeyboard();
    this.bindDesktopLook();
  }

  spawn(position: Vector3): void {
    this.collider.position.copyFrom(position);
    this.yaw = 0;
    this.pitch = 0;
    this.syncRotation();
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  setMoveVector(x: number, y: number): void {
    this.analogX = Math.max(-1, Math.min(1, x));
    this.analogY = Math.max(-1, Math.min(1, y));
  }

  look(deltaX: number, deltaY: number): void {
    if (!this.active) return;
    this.yaw += deltaX * 0.0035;
    this.pitch += deltaY * 0.0031;
    this.pitch = Math.max(-1.25, Math.min(1.18, this.pitch));
    this.syncRotation();
  }

  toggleFlashlight(): boolean {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.setEnabled(this.flashlightOn);
    return this.flashlightOn;
  }

  getPosition(): Vector3 {
    return this.collider.position;
  }

  update(dt: number): void {
    if (!this.active) return;

    let forward = this.analogY;
    let strafe = this.analogX;

    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) forward += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) forward -= 1;
    if (this.keys.has("KeyD")) strafe += 1;
    if (this.keys.has("KeyA")) strafe -= 1;

    const magnitude = Math.hypot(forward, strafe);
    if (magnitude > 1) {
      forward /= magnitude;
      strafe /= magnitude;
    }

    const sprinting = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const speed = sprinting ? 4.55 : 2.85;

    const forwardVector = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rightVector = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const displacement = forwardVector.scale(forward * speed * dt)
      .addInPlace(rightVector.scale(strafe * speed * dt));

    if (displacement.lengthSquared() > 0.000001) {
      this.collider.moveWithCollisions(displacement);
    }

    // No jumping in this prototype; keep the camera at a stable human eye level.
    this.collider.position.y = 0.9;
  }

  private syncRotation(): void {
    this.collider.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = 0;
    this.camera.rotation.z = 0;
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
      if (event.code === "KeyF") this.toggleFlashlight();
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  private bindDesktopLook(): void {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    this.canvas.addEventListener("pointerdown", () => {
      if (!this.active) return;
      this.canvas.requestPointerLock?.();
    });

    document.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.look(event.movementX, event.movementY);
    });
  }
}
