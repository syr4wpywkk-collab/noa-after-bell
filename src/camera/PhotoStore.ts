import type { EvidenceId } from "../game/GameState";
import { hasVirtualSpace, NORMAL_PHOTO_SIZE_MB } from "./StorageQuota";
import type { PhotoMutation } from "./PhotoMutation";

export type GamePhoto = { id: string; blob: Blob; createdAt: number; floor: number; location: string; evidenceId?: EvidenceId; mutationLevel: number; mutations: PhotoMutation[]; virtualSizeMb: number; corrupted: boolean };

export class PhotoStore {
  private cache: GamePhoto[] = [];
  private db?: IDBDatabase;

  async open(): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("noa-after-bell-photos", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    this.cache = await this.readAll();
  }

  list(): readonly GamePhoto[] { return [...this.cache].sort((a, b) => b.createdAt - a.createdAt); }
  usedMb(): number { return this.cache.reduce((sum, p) => sum + p.virtualSizeMb, 0); }

  async save(input: Omit<GamePhoto, "id" | "createdAt" | "mutationLevel" | "mutations" | "virtualSizeMb" | "corrupted"> & Partial<Pick<GamePhoto, "virtualSizeMb" | "corrupted" | "mutations">>): Promise<GamePhoto> {
    const virtualSizeMb = input.virtualSizeMb ?? NORMAL_PHOTO_SIZE_MB;
    if (!hasVirtualSpace(this.cache, virtualSizeMb)) throw new Error("virtual_storage_full");
    const photo: GamePhoto = { ...input, id: crypto.randomUUID(), createdAt: Date.now(), mutationLevel: input.mutations?.[0]?.level ?? 0, mutations: input.mutations ?? [], virtualSizeMb, corrupted: input.corrupted ?? false };
    this.cache.push(photo); await this.put(photo); return photo;
  }

  async remove(id: string): Promise<void> {
    this.cache = this.cache.filter((photo) => photo.id !== id);
    if (this.db) await this.request(this.db.transaction("photos", "readwrite").objectStore("photos").delete(id));
  }

  private async readAll(): Promise<GamePhoto[]> { return this.db ? await this.request(this.db.transaction("photos").objectStore("photos").getAll()) : []; }
  private async put(photo: GamePhoto): Promise<void> { if (this.db) await this.request(this.db.transaction("photos", "readwrite").objectStore("photos").put(photo)); }
  private request<T>(request: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
}
