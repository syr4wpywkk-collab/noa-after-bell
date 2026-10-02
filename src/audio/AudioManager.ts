export class AudioManager {
  private context?: AudioContext;
  private hum?: OscillatorNode;
  private humGain?: GainNode;

  async start(): Promise<void> {
    if (this.context) {
      if (this.context.state === "suspended") await this.context.resume();
      return;
    }

    const AudioCtor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    this.context = new AudioCtor();
    this.hum = this.context.createOscillator();
    this.humGain = this.context.createGain();

    this.hum.type = "sine";
    this.hum.frequency.value = 58.5;
    this.humGain.gain.value = 0.012;

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 145;

    this.hum.connect(filter).connect(this.humGain).connect(this.context.destination);
    this.hum.start();
  }

  sting(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(96, now);
    osc.frequency.exponentialRampToValueAtTime(39, now + 0.8);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);

    osc.connect(gain).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + 0.85);
  }
}
