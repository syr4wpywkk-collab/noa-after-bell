import type { NoaMood } from "./protocol";

export type MessageOptions = {
  mood?: NoaMood;
  system?: boolean;
  user?: boolean;
  glitch?: boolean;
  minuteOffset?: number;
  signalOverride?: string;
};

export class NoaPhone {
  private root = document.querySelector<HTMLElement>("#phone");
  private feed = document.querySelector<HTMLElement>("#phone-feed");
  private button = document.querySelector<HTMLButtonElement>("#phone-button");
  private toast = document.querySelector<HTMLElement>("#toast");
  private signal = document.querySelector<HTMLElement>("#phone-signal");
  private time = document.querySelector<HTMLElement>("#phone-time");
  private form = document.querySelector<HTMLFormElement>("#phone-form");
  private input = document.querySelector<HTMLInputElement>("#phone-input");
  private typing = document.querySelector<HTMLElement>("#phone-typing");
  private open = false;
  private toastTimer?: number;
  private submitHandler?: (text: string) => void | Promise<void>;

  constructor() {
    this.button?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.toggle();
    });
    this.root?.addEventListener("pointerdown", (event) => event.stopPropagation());
    this.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = this.input?.value.trim() ?? "";
      if (!text || !this.submitHandler) return;
      if (this.input) this.input.value = "";
      void this.submitHandler(text);
    });
  }

  setSubmitHandler(handler: (text: string) => void | Promise<void>): void {
    this.submitHandler = handler;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root?.classList.toggle("open", this.open);
    this.root?.setAttribute("aria-hidden", this.open ? "false" : "true");
    if (this.open) window.setTimeout(() => this.input?.focus(), 180);
  }

  isOpen(): boolean {
    return this.open;
  }

  push(author: string, message: string, options: MessageOptions = {}): void {
    if (!this.feed) return;
    const block = document.createElement("div");
    block.className = "message";
    if (options.system) block.classList.add("system-message");
    if (options.user) block.classList.add("user-message");
    if (options.glitch) block.classList.add("glitch-message");
    if (options.mood) block.dataset.mood = options.mood;

    const meta = document.createElement("div");
    meta.className = "message-meta";
    const label = document.createElement("strong");
    label.textContent = author;
    const timestamp = document.createElement("time");
    timestamp.textContent = this.displayTime(options.minuteOffset ?? 0);
    meta.append(label, timestamp);

    const body = document.createElement("span");
    body.textContent = message;
    block.append(meta, body);
    this.feed.append(block);
    this.feed.scrollTop = this.feed.scrollHeight;

    if (options.signalOverride) this.setSignalText(options.signalOverride);
  }

  showTyping(show: boolean): void {
    this.typing?.classList.toggle("visible", show);
    if (show && this.feed) this.feed.scrollTop = this.feed.scrollHeight;
  }

  setSignal(state: "sending" | "unstable" | "connected" | "offline"): void {
    const labels = {
      sending: "SIGNAL 82% · ••",
      unstable: "SIGNAL UNSTABLE · •••",
      connected: "CONNECTED",
      offline: "LOCAL FALLBACK",
    } as const;
    this.setSignalText(labels[state]);
    this.signal?.classList.toggle("unstable", state === "unstable");
  }

  setClock(gameTimeMs: number, minuteOffset = 0): void {
    if (!this.time) return;
    const totalMinutes = 3 + Math.floor(gameTimeMs / 60_000) + minuteOffset;
    this.time.textContent = `00:${String(totalMinutes).padStart(2, "0")}`;
  }

  notify(message: string, duration = 2100): void {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast?.classList.remove("show"), duration);
  }

  private setSignalText(text: string): void {
    if (this.signal) this.signal.textContent = text;
  }

  private displayTime(minuteOffset: number): string {
    const source = this.time?.textContent ?? "00:03";
    const parts = source.split(":");
    const minute = Math.max(0, (Number(parts[1]) || 3) + minuteOffset);
    return `00:${String(minute).padStart(2, "0")}`;
  }
}
