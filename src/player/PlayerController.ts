import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  SpotLight,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import { floorBaseY, type FloorId } from "../game/WorldLayout";
import { floorFromPlayerHeight, sampleStairRamp } from "../world/StairNavigation";

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
  private floor: FloorId = 1;
  private stamina = 100;
  private moving = false;
  private sprinting = false;
  private sprintAllowed = true;
  private movementScale = 1;

  constructor(private scene: Scene, private canvas: HTMLCanvasElement) {
    this.collider = MeshBuilder.CreateBox("player-collider", {
      width: 0.55,
      height: 1.8,
      depth: 0.55,
    }, scene);
    this.collider.visibility = 0;
    this.collider.isPickable = false;
    this.collider.checkCollisions = true;
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
      scene,
    );
    this.flashlight.parent = this.camera;
    this.flashlight.diffuse = new Color3(0.88, 0.93, 0.90);
    this.flashlight.specular = new Color3(0.32, 0.36, 0.34);
    this.flashlight.intensity = 4.7;
    this.flashlight.range = 23;

    this.bindKeyboard();
    this.bindDesktopLook();
  }

  spawn(position: Vector3, floor: FloorId = 1): void {
    this.floor = floor;
    this.collider.position.copyFrom(position);
    this.collider.position.y = floorBaseY(floor) + 0.9;
    this.yaw = 0;
    this.pitch = 0;
    this.syncRotation();
  }

  setFloor(floor: FloorId, x = 0, z = 4.2): void {
    this.floor = floor;
    this.collider.position.set(x, floorBaseY(floor) + 0.9, z);
    this.analogX = 0;
    this.analogY = 0;
  }

  getFloor(): FloorId {
    return this.floor;
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.setMoveVector(0, 0);
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

  isFlashlightOn(): boolean {
    return this.flashlightOn;
  }

  getPosition(): Vector3 {
    return this.collider.position;
  }

  getStamina(): number {
    return this.stamina;
  }

  isMoving(): boolean {
    return this.moving;
  }

  update(dt: number): void {
    if (!this.active) {
      this.moving = false;
      return;
    }

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

    const wantsSprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const sprinting = this.sprintAllowed && wantsSprint && this.stamina > 2 && magnitude > 0.2;
    this.sprinting = sprinting;
    const speed = (sprinting ? 4.55 : 2.85) * this.movementScale;
    this.stamina = sprinting
      ? Math.max(0, this.stamina - dt * 11)
      : Math.min(100, this.stamina + dt * 6.5);

    const forwardVector = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rightVector = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const displacement = forwardVector.scale(forward * speed * dt)
      .addInPlace(rightVector.scale(strafe * speed * dt));

    this.moving = displacement.lengthSquared() > 0.00001;
    if (this.moving) this.collider.moveWithCollisions(displacement);

    const stair = sampleStairRamp(
      this.collider.position.x,
      this.collider.position.z,
      this.collider.position.y,
    );
    if (stair) {
      this.collider.position.y = stair.playerY;
      this.floor = floorFromPlayerHeight(stair.playerY);
    } else {
      this.collider.position.y = floorBaseY(this.floor) + 0.9;
    }
  }

  isSprinting(): boolean { return this.sprinting; }
  setSprintAllowed(allowed: boolean): void { this.sprintAllowed = allowed; if (!allowed) this.sprinting = false; }
  setCarryingObstruction(carrying: boolean): void {
    this.setSprintAllowed(!carrying);
    this.movementScale = carrying ? 0.58 : 1;
    this.flashlight.direction = carrying ? new Vector3(0, -0.82, 0.3) : new Vector3(0, 0, 1);
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
