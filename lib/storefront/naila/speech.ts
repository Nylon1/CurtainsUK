/** Optional presentation: resolve only at end/error, never at playback start.
 * Timeout first cancels playback and then returns to the caption fallback. */
export class NailaSpeech {
  private finish: (() => void) | null = null;
  constructor(private synth: SpeechSynthesis | undefined) {}
  stop() { this.synth?.cancel(); this.finish?.(); }
  async speak(text: string): Promise<void> {
    this.stop();
    if (!this.synth || !this.synth.getVoices().length) return;
    await new Promise<void>(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB'; utterance.rate = 0.95;
      utterance.voice = this.synth!.getVoices().find(v => v.lang === 'en-GB') ?? null;
      const finish = () => { clearTimeout(timer); this.finish = null; resolve(); };
      this.finish = finish;
      utterance.onend = finish;
      utterance.onerror = () => { this.synth?.cancel(); finish(); };
      const timer = setTimeout(() => { this.synth?.cancel(); finish(); }, Math.min(90_000, Math.max(15_000, text.length * 120)));
      try { this.synth!.speak(utterance); } catch { finish(); }
    });
  }
}
