export class NoaPhone {
  private root = document.querySelector<HTMLElement>("#phone");
  private feed = document.querySelector<HTMLElement>("#phone-feed");
  private button = document.querySelector<HTMLButtonElement>("#phone-button");
  private toast = document.querySelector<HTMLElement>("#toast");
  private open = false;
  private toastTimer?: number;

  constructor() {
    this.button?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.toggle();
    });
    this.root?.addEventListener("pointerdown", (event) => event.stopPropagation());
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root?.classList.toggle("open", this.open);
  }

  isOpen(): boolean {
    return this.open;
  }

  push(author: string, message: string): void {
    if (!this.feed) return;
    const block = document.createElement("div");
    block.className = "message";
    const label = document.createElement("strong");
    label.textContent = author;
    const body = document.createElement("span");
    body.textContent = message;
    block.append(label, body);
    this.feed.append(block);
    this.feed.scrollTop = this.feed.scrollHeight;
  }

  notify(message: string, duration = 2100): void {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast?.classList.remove("show");
    }, duration);
  }
}
