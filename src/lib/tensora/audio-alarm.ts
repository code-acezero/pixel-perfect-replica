/**
 * Industrial Floor Acoustic Siren & Alert Synthesizer.
 * Generates high-visibility acoustic warnings for noisy weaving/knitting sheds (85-95 dB)
 * using the native browser Web Audio API — zero external sound assets or network load.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtor) {
      audioCtx = new AudioCtor();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function playMillAlarmSound(type: "critical" | "warning" | "beep" = "critical") {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "critical") {
      // 2-tone industrial mill siren (Sawtooth 880 Hz -> 1760 Hz -> 880 Hz)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1760, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.24);
      osc.frequency.setValueAtTime(1760, now + 0.36);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "warning") {
      // Single attention pulse (Square 980 Hz)
      osc.type = "square";
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.setValueAtTime(650, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Subtle operator tick (Sine 1200 Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // Ignore autoplay restriction before user interaction
  }
}
