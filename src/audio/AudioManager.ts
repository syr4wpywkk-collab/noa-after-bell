/**
 * All audio is local: Web Audio synthesis + optional browser Japanese
 * speech synthesis. No sound CDN, microphone, server, or API token.
 */
export class AudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private humGain?: GainNode;
  private airGain?: GainNode;
  private muted = false;
  private lastCreak = 0;

  async start(): Promise<void> {
    if (this.context) {
      if (this.context.state === "suspended") await this.context.resume();
      return;
    }
    const Ctor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.65;
    this.master.connect(this.context.destination);

    const osc = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    this.humGain = this.context.createGain();
    osc.type = "sine";
    osc.frequency.value = 59.4;
    filter.type = "lowpass";
    filter.frequency.value = 165;
    this.humGain.gain.value = 0.018;
    osc.connect(filter).connect(this.humGain).connect(this.master);
    osc.start();

    const buffer = this.noise(3.2);
    const air = this.context.createBufferSource();
    air.buffer = buffer;
    air.loop = true;
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 720;
    this.airGain = this.context.createGain();
    this.airGain.gain.value = 0.012;
    air.connect(lowpass).connect(this.airGain).connect(this.master);
    air.start();
  }

  setEnvironment(inClassroom: boolean, tension: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.humGain?.gain.setTargetAtTime(inClassroom ? 0.021 : 0.012, now, 0.7);
    this.airGain?.gain.setTargetAtTime((inClassroom ? 0.008 : 0.015) + Math.min(0.012, tension * 0.013), now, 1.2);
    if (tension > 0.53 && now - this.lastCreak > 16) {
      this.lastCreak = now;
      this.tone(110, 41, 0.75, 0.014, "triangle");
    }
  }

  footstep(running: boolean): void {
    if (!this.context || !this.master) return;
    const src = this.context.createBufferSource();
    src.buffer = this.noise(0.19);
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = running ? 350 : 260;
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(running ? 0.065 : 0.032, now + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    src.connect(lowpass).connect(gain).connect(this.master);
    src.start();
    src.stop(now + 0.17);
  }

  announce(text: string): void {
    this.chime();
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.76;
    utterance.pitch = 0.70;
    utterance.volume = this.muted ? 0 : 0.52;
    const japaneseVoice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ja"));
    if (japaneseVoice) utterance.voice = japaneseVoice;
    window.speechSynthesis.speak(utterance);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.65, this.context.currentTime, 0.045);
    }
    if (this.muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    return this.muted;
  }

  sting(): void {
    this.tone(96, 39, 0.82, 0.045, "sawtooth");
  }

  radioNoise(): void {
    if (!this.context || !this.master) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noise(0.35);
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1850;
    filter.Q.value = 0.75;
    const gain = this.context.createGain();
    gain.gain.value = 0.065;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  doorSound(): void {
    this.tone(74, 49, 0.28, 0.032, "triangle");
  }

  footstepsFar(): void {
    if (!this.context) return;
    for (let i = 0; i < 3; i++) {
      const when = this.context.currentTime + i * 0.42;
      this.tone(65, 43, 0.19, 0.018, "sine", when);
    }
  }

  private chime(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.tone(880, 880, 0.62, 0.027, "sine", now);
    this.tone(659.25, 659.25, 0.72, 0.028, "sine", now + 0.43);
  }

  private noise(seconds: number): AudioBuffer {
    const context = this.context!;
    const len = Math.ceil(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, len, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) channel[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private tone(start: number, end: number, seconds: number, volume: number, type: OscillatorType, when?: number): void {
    if (!this.context || !this.master) return;
    const now = when ?? this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + seconds);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.028);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.03);
  }
}
