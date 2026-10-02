export class AudioManager {
  private context?: AudioContext;
  private master?: GainNode;
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
    this.master = this.context.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.context.destination);

    this.hum = this.context.createOscillator();
    this.humGain = this.context.createGain();
    this.hum.type = "sine";
    this.hum.frequency.value = 58.5;
    this.humGain.gain.value = 0.012;

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 145;
    this.hum.connect(filter).connect(this.humGain).connect(this.master);
    this.hum.start();
  }

  sting(): void {
    this.tone(96, 39, 0.82, 0.045, "sawtooth");
  }

  radioNoise(): void {
    if (!this.context || !this.master) return;
    const length = Math.floor(this.context.sampleRate * 0.32);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1900;
    filter.Q.value = 0.7;
    gain.gain.value = 0.032;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  doorSound(): void {
    this.tone(74, 49, 0.28, 0.025, "triangle");
  }

  footstepsFar(): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.value = 52 + i * 3;
      gain.gain.setValueAtTime(0.0001, now + i * 0.42);
      gain.gain.exponentialRampToValueAtTime(0.022, now + i * 0.42 + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.42 + 0.16);
      osc.connect(gain).connect(this.master);
      osc.start(now + i * 0.42);
      osc.stop(now + i * 0.42 + 0.19);
    }
  }

  private tone(startHz: number, endHz: number, duration: number, volume: number, type: OscillatorType): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }
}
