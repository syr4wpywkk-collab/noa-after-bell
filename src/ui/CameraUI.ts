export class CameraUI {
  flash(): void { const el = document.querySelector("#camera-flash"); el?.classList.add("active"); window.setTimeout(() => el?.classList.remove("active"), 120); }
}
