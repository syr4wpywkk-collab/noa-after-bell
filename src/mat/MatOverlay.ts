export class MatOverlay {
  setCarrying(carrying: boolean): void { document.querySelector("#app")?.classList.toggle("carrying-mat", carrying); }
}
