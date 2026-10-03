export class CameraController {
  constructor(private canvas: HTMLCanvasElement) {}
  capture(): Promise<Blob> {
    return new Promise((resolve, reject) => this.canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("camera_capture_failed")), "image/webp", 0.72,
    ));
  }
}
