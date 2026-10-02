import "./style.css";
import { Game } from "./core/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas");
if (!canvas) throw new Error("renderCanvas not found");

const game = new Game(canvas);
game.boot().catch((error) => {
  console.error(error);
  const status = document.querySelector<HTMLElement>("#boot-status");
  if (status) status.textContent = "起動に失敗しました。コンソールを確認してください。";
});
