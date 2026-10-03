export const MAX_VIRTUAL_STORAGE_MB = 150;
export const NORMAL_PHOTO_SIZE_MB = 15;
export const CORRUPTED_PHOTO_SIZE_MB = 30;

export function virtualStorageUsed(records: readonly { virtualSizeMb: number }[]): number {
  return records.reduce((sum, photo) => sum + Math.max(0, photo.virtualSizeMb), 0);
}

export function hasVirtualSpace(records: readonly { virtualSizeMb: number }[], requiredMb: number): boolean {
  return virtualStorageUsed(records) + requiredMb <= MAX_VIRTUAL_STORAGE_MB;
}
