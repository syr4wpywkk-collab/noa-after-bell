import type { PhotoStore } from "../camera/PhotoStore";
import { mutationForProgress } from "../camera/PhotoMutation";
export class AlbumUI {
  constructor(private store: PhotoStore, private getChapter: () => number) {
    document.querySelector("#album-close")?.addEventListener("click", () => this.toggle(false));
  }
  toggle(open = true): void { document.querySelector("#album-panel")?.classList.toggle("open", open); if (open) this.render(); }
  render(): void {
    const grid = document.querySelector<HTMLElement>("#album-grid"); if (!grid) return; grid.replaceChildren();
    for (const photo of this.store.list()) {
      const card = document.createElement("article"); card.className = "photo-card";
      const image = document.createElement("img"); image.src = URL.createObjectURL(photo.blob); image.alt = `${photo.floor}F ${photo.location}`; image.onload = () => URL.revokeObjectURL(image.src);
      const mutations = photo.mutations.length ? photo.mutations : mutationForProgress(photo.id, this.getChapter(), photo.corrupted);
      const overlay = document.createElement("div"); overlay.className = `photo-mutation ${mutations[0]?.kind ?? ""}`;
      const meta = document.createElement("small"); meta.textContent = `${photo.floor}F · ${photo.virtualSizeMb}MB${photo.evidenceId ? " · EVIDENCE" : ""}`;
      const del = document.createElement("button"); del.textContent = "削除"; del.onclick = async () => { await this.store.remove(photo.id); this.render(); };
      card.append(image, overlay, meta, del); grid.append(card);
    }
  }
}
