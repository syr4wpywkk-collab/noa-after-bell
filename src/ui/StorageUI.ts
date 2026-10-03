import { MAX_VIRTUAL_STORAGE_MB } from "../camera/StorageQuota";
export class StorageUI {
  showFull(used: number): void {
    const panel = document.querySelector<HTMLElement>("#storage-warning");
    const value = panel?.querySelector<HTMLElement>("[data-storage-value]");
    if (value) value.textContent = `${used} / ${MAX_VIRTUAL_STORAGE_MB} MB（ゲーム内容量）`;
    panel?.classList.add("open");
  }
}
