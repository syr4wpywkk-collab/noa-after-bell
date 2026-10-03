import { detectionRate } from "./DetectionModel";
import type { NoiseSignal, ThreatMode, ThreatSnapshot } from "./ThreatState";

export type ThreatPlayerSignal = {
  floor: number; x: number; z: number; flashlight: boolean; moving: boolean; sprinting: boolean;
  hiding: boolean; safeZone: boolean; lineOfSight: boolean;
};

export class ThreatController {
  private mode: ThreatMode = "DORMANT";
  private awareness = 0;
  private floor = 2;
  private x = 0;
  private z = 32;
  private target = { floor: 2, x: 0, z: 20 };
  private stateTime = 0;

  update(dt: number, player: ThreatPlayerSignal, directorPressure: number): ThreatSnapshot {
    this.stateTime += dt;
    const sameFloor = player.floor === this.floor;
    const distance = sameFloor ? Math.hypot(player.x - this.x, player.z - this.z) : 45;
    const rate = detectionRate({ ...player, distance, lineOfSight: sameFloor && player.lineOfSight });
    this.awareness = clamp(this.awareness + rate * dt * (0.55 + directorPressure * 0.35));

    if (this.mode === "DORMANT" && directorPressure > 0.18) this.enter("PATROL");
    if (this.awareness >= 0.92 && sameFloor && !player.safeZone) this.enter("CHASE");
    else if (this.awareness >= 0.5 && this.mode !== "CHASE") this.enter("INVESTIGATE");
    else if (this.awareness >= 0.22 && this.mode === "PATROL") this.enter("SUSPICIOUS");
    if (this.mode === "CHASE" && (this.awareness < 0.35 || !sameFloor || player.safeZone)) this.enter("SEARCH");
    if (this.mode === "SEARCH" && this.stateTime > 9) this.enter("RETURN");
    if (this.mode === "RETURN" && this.stateTime > 6) this.enter("PATROL");

    if (this.mode === "CHASE") this.target = { floor: player.floor, x: player.x, z: player.z };
    this.move(dt, this.mode === "CHASE" ? 3.5 : this.mode === "INVESTIGATE" ? 2.2 : 1.15);
    const finalDistance = player.floor === this.floor ? Math.hypot(player.x - this.x, player.z - this.z) : 45;
    return {
      mode: this.mode, awareness: this.awareness, distance: finalDistance,
      visible: sameFloor && finalDistance < 16 && player.lineOfSight,
      investigating: this.mode === "INVESTIGATE" || this.mode === "SEARCH",
      pursuitActive: this.mode === "CHASE",
    };
  }

  hear(signal: NoiseSignal): void {
    const distance = signal.floor === this.floor ? Math.hypot(signal.x - this.x, signal.z - this.z) : 30;
    if (distance > signal.strength) return;
    this.target = { floor: signal.floor, x: signal.x, z: signal.z };
    this.awareness = clamp(this.awareness + 0.18 + signal.strength / 60);
    if (this.mode !== "CHASE") this.enter("INVESTIGATE");
  }

  getPosition(): { floor: number; x: number; z: number } { return { floor: this.floor, x: this.x, z: this.z }; }

  private enter(mode: ThreatMode): void { if (this.mode !== mode) { this.mode = mode; this.stateTime = 0; } }
  private move(dt: number, speed: number): void {
    if (this.mode === "DORMANT" || this.mode === "SUSPICIOUS") return;
    if (this.floor !== this.target.floor) { if (this.stateTime > 2) this.floor = this.target.floor; return; }
    const dx = this.target.x - this.x; const dz = this.target.z - this.z; const length = Math.hypot(dx, dz);
    if (length < 0.4) { if (this.mode === "PATROL") this.target.z = this.target.z < 20 ? 34 : 6; return; }
    this.x += dx / length * speed * dt; this.z += dz / length * speed * dt;
  }
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
