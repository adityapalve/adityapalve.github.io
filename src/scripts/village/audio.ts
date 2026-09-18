/**
 * An original chiptune loop in the handheld-RPG style: two square-wave voices, a triangle bass
 * and a noise hi-hat, scheduled a little ahead of time on the Web Audio clock.
 */
export type Chiptune = {
  start: () => void;
  stop: () => void;
  toggle: () => boolean;
  isPlaying: () => boolean;
  blip: () => void;
  chime: () => void;
};

type Note = [midi: number | null, beats: number];

const bpm = 152;

const beat = 60 / bpm;

// Chord roots per bar (C major loop: C, Am, F, G, C, Am, F, G)
const roots = [60, 57, 53, 55, 60, 57, 53, 55];

const thirds = [64, 60, 57, 59, 64, 60, 57, 59];

const fifths = [67, 64, 60, 62, 67, 64, 60, 62];

const lead: Note[] = [
  [76, 0.5], [79, 0.5], [81, 1], [79, 0.5], [76, 0.5], [74, 1],
  [72, 0.5], [74, 0.5], [76, 1], [79, 1], [null, 1],
  [81, 0.5], [79, 0.5], [76, 1], [74, 0.5], [72, 0.5], [74, 1],
  [76, 1.5], [72, 0.5], [74, 2],
  [76, 0.5], [79, 0.5], [81, 0.5], [83, 0.5], [84, 1], [81, 1],
  [79, 0.5], [76, 0.5], [74, 1], [76, 1], [79, 1],
  [81, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [72, 1], [69, 1],
  [72, 1], [74, 1], [72, 2],
];

const loopBeats = 32;

const frequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export function createChiptune(): Chiptune {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let noiseBuffer: AudioBuffer | undefined;
  let timer: number | undefined;
  let nextLoopStart = 0;
  let playing = false;

  const ensure = (): [AudioContext, GainNode] => {
    if (context !== undefined && master !== undefined) return [context, master];

    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.11;
    master.connect(context.destination);

    const seconds = 1;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;

    noiseBuffer = buffer;

    return [context, master];
  };

  const tone = (type: OscillatorType, midi: number, at: number, length: number, volume: number) => {
    const [audio, out] = ensure();
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency(midi);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + 0.006);
    envelope.gain.setValueAtTime(volume, at + Math.max(0.01, length * 0.6));
    envelope.gain.linearRampToValueAtTime(0, at + length);
    oscillator.connect(envelope);
    envelope.connect(out);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
  };

  const hat = (at: number, length: number, volume: number) => {
    const [audio, out] = ensure();

    if (noiseBuffer === undefined) return;

    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const envelope = audio.createGain();

    source.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    envelope.gain.setValueAtTime(volume, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(out);
    source.start(at);
    source.stop(at + length);
  };

  /** Schedule one full pass of the loop starting at `start` seconds. */
  const scheduleLoop = (start: number) => {
    let cursor = 0;

    for (const [midi, beats] of lead) {
      if (midi !== null) tone('square', midi, start + cursor * beat, beats * beat * 0.9, 0.5);

      cursor += beats;
    }

    for (let bar = 0; bar < 8; bar++) {
      const barStart = start + bar * 4 * beat;
      const arpeggio = [roots[bar]!, thirds[bar]!, fifths[bar]!, thirds[bar]!];

      for (let eighth = 0; eighth < 8; eighth++) {
        const at = barStart + eighth * beat * 0.5;

        tone('square', arpeggio[eighth % 4]! - 12, at, beat * 0.42, 0.16);
        hat(at, eighth % 2 === 0 ? 0.04 : 0.025, eighth % 4 === 2 ? 0.5 : 0.22);
      }

      for (let quarter = 0; quarter < 4; quarter++) {
        const bass = quarter % 2 === 0 ? roots[bar]! - 24 : fifths[bar]! - 24;

        tone('triangle', bass, barStart + quarter * beat, beat * 0.85, 0.55);
      }
    }
  };

  const tick = () => {
    const [audio] = ensure();

    // Keep about one loop scheduled ahead of the clock
    while (nextLoopStart < audio.currentTime + 0.3) {
      scheduleLoop(nextLoopStart);
      nextLoopStart += loopBeats * beat;
    }
  };

  const start = () => {
    const [audio] = ensure();

    void audio.resume();
    playing = true;
    nextLoopStart = Math.max(nextLoopStart, audio.currentTime + 0.05);
    tick();

    if (timer === undefined) timer = window.setInterval(tick, 200);
  };

  const stop = () => {
    playing = false;

    if (timer !== undefined) window.clearInterval(timer);

    timer = undefined;

    if (context !== undefined) void context.suspend();
  };

  return {
    start,
    stop,
    toggle: () => {
      if (playing) stop();
      else start();

      return playing;
    },
    isPlaying: () => playing,
    blip: () => {
      if (!playing) return;

      const [audio] = ensure();

      tone('square', 88, audio.currentTime, 0.05, 0.25);
    },
    chime: () => {
      if (!playing) return;

      const [audio] = ensure();

      for (const [index, midi] of [79, 84, 88].entries()) tone('square', midi, audio.currentTime + index * 0.07, 0.16, 0.3);
    },
  };
}
