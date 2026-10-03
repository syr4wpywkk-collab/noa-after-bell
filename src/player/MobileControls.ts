import { PlayerController } from "./PlayerController";
import { NoaPhone } from "../noa/NoaPhone";

export class MobileControls {
  private active = false;
  private joystickId: number | null = null;
  private lookId: number | null = null;
  private lastLookX = 0;
  private lastLookY = 0;

  private joystickZone = document.querySelector<HTMLElement>("#joystick-zone");
  private joystickBase = document.querySelector<HTMLElement>("#joystick-base");
  private joystickKnob = document.querySelector<HTMLElement>("#joystick-knob");
  private lookZone = document.querySelector<HTMLElement>("#look-zone");
  private flashlightButton = document.querySelector<HTMLButtonElement>("#flashlight-button");
  private interactButton = document.querySelector<HTMLButtonElement>("#interact-button");

  constructor(
    private player: PlayerController,
    private phone: NoaPhone,
    private onInteract: () => void,
  ) {
    this.bindJoystick();
    this.bindLook();
    this.bindButtons();
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.player.setMoveVector(0, 0);
  }

  private bindJoystick(): void {
    this.joystickZone?.addEventListener("pointerdown", (event) => {
      if (!this.active || this.joystickId !== null || this.phone.isOpen()) return;
      event.preventDefault();
      this.joystickId = event.pointerId;
      try {
        this.joystickZone?.setPointerCapture(event.pointerId);
      } catch {
        // iOS Safari may reject pointer capture in some browser/UI states.
        // Window-level move/up listeners below keep the stick usable anyway.
      }
      this.updateJoystick(event.clientX, event.clientY);
    });

    window.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.joystickId) return;
      event.preventDefault();
      this.updateJoystick(event.clientX, event.clientY);
    }, { passive: false });

    const release = (event: PointerEvent) => {
      if (event.pointerId !== this.joystickId) return;
      try {
        if (this.joystickZone?.hasPointerCapture(event.pointerId)) {
          this.joystickZone.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Safe fallback for Safari capture edge cases.
      }
      this.joystickId = null;
      this.player.setMoveVector(0, 0);
      if (this.joystickKnob) this.joystickKnob.style.transform = "translate(0, 0)";
    };

    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  private updateJoystick(x: number, y: number): void {
    if (!this.joystickBase || !this.joystickKnob) return;
    const rect = this.joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.34;

    let dx = x - cx;
    let dy = y - cy;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = dx / length * max;
      dy = dy / length * max;
    }

    this.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.player.setMoveVector(dx / max, -dy / max);
  }

  private bindLook(): void {
    this.lookZone?.addEventListener("pointerdown", (event) => {
      if (!this.active || this.lookId !== null || this.phone.isOpen()) return;
      event.preventDefault();
      this.lookId = event.pointerId;
      this.lastLookX = event.clientX;
      this.lastLookY = event.clientY;
      try {
        this.lookZone?.setPointerCapture(event.pointerId);
      } catch {
        // Keep looking usable even when Safari refuses capture.
      }
    });

    window.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookId || this.phone.isOpen()) return;
      event.preventDefault();
      const dx = event.clientX - this.lastLookX;
      const dy = event.clientY - this.lastLookY;
      this.lastLookX = event.clientX;
      this.lastLookY = event.clientY;
      this.player.look(dx, dy);
    }, { passive: false });

    const release = (event: PointerEvent) => {
      if (event.pointerId !== this.lookId) return;
      try {
        if (this.lookZone?.hasPointerCapture(event.pointerId)) {
          this.lookZone.releasePointerCapture(event.pointerId);
        }
      } catch {
        // No-op: the pointer may already have been released by Safari.
      }
      this.lookId = null;
    };

    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  private bindButtons(): void {
    this.flashlightButton?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      const on = this.player.toggleFlashlight();
      if (this.flashlightButton) this.flashlightButton.style.opacity = on ? "1" : ".45";
    });

    this.interactButton?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      if (this.active && !this.phone.isOpen()) this.onInteract();
    });
  }
}
