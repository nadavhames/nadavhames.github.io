/**
 * Turns a tune's ABC notation (from thesession.org or abcnotation.com) into the scores the
 * handwritten staffs write: bars 1–4 on the masthead, bars 5–8 on the footer.
 *
 * Only the subset the handwriting can draw is accepted — notes, rests, accidentals, bars, ties
 * (`-`), dotted lengths (`3` of a quarter, or a broken rhythm `>`) and beaming by spacing — and
 * anything else stops the build, so a tune that can't be written properly never ships. One ABC
 * unit is written as a quarter: a 2/4 tune with L:1/8 is written in 4/4 with every length
 * doubled, and a 4/4 tune with L:1/4 as it is.
 */

export type Key = "C" | "G" | "D" | "A" | "F";

export type ScoreEvent =
  | {
      note: "whole" | "half" | "quarter" | "eighth";
      /** Staff steps up from the bottom line: 0 E, 2 G, 4 B, 8 F, 9 G above the staff. */
      pitch: number | number[];
      accidental?: "sharp" | "flat" | "natural";
      /** Joins eighth notes: "start" on the first, "end" on the last. */
      beam?: "start" | "end";
      /** A slur from a "start" note to its "end" note. */
      slur?: "start" | "end";
      /** Tie this note to the next one. */
      tie?: true;
      /** An augmentation dot: half as long again. */
      dot?: true;
    }
  | { rest: "half" | "quarter" | "eighth" }
  /** A barline. */
  | { bar: true }
  /** A handwritten treble clef, for a staff without a printed one. */
  | { clef: "treble" }
  /** A key signature, written as its sharps (or, for F, its flat). */
  | { key: Key }
  | { time: "4/4" }
  /** Handwritten performance text, written at the next note. Letters a–z and "." only. */
  | { text: string; place: "above" | "below" }
  /** A chord symbol, written above the staff at the next note and played in the backing. */
  | { chord: string };

export type Tune = {
  name: string;
  /** Where the transcription comes from. */
  source: string;
  key: Key;
  /**
   * How it is played back: "polka" (the default) is brisk over an oom-pah bass; "ballad" is slow,
   * with each chord held.
   */
  feel?: "polka" | "ballad";
  /** Eight bars, separated by "|". */
  abc: string;
  /**
   * Chords for the same eight bars, separated by "|": one chord for the whole bar, or two for its
   * two halves, or any number placed on a beat with "@" (`Em7 A7@2` changes on beat 2). An empty
   * bar carries on the chord before it, and only changes are written.
   */
  chords: string;
  /** Where the chords come from, and anything done to them (such as transposing). */
  chordSource: string;
};

/** A root (with an optional flat), a quality, and an optional bass note after "/". */
const CHORD = /^[A-G]b?(ma7|m7|m|7|6)?(\/[A-G]b?)?$/;

type Note = Extract<ScoreEvent, { note: string }>;

const LENGTHS: Record<number, Note["note"]> = {
  4: "whole",
  2: "half",
  1: "quarter",
  0.5: "eighth",
};
const DOTTED: Record<number, Note["note"]> = { 3: "half", 1.5: "quarter" };
const ACCIDENTALS = { "^": "sharp", _: "flat", "=": "natural" } as const;
const NOTE = /^(\^|_|=)?([A-Ga-gz])([',]*)(\d*)(\/*)(\d*)/;

function step(letter: string, octaveMarks: string): number {
  const octave =
    (letter === letter.toLowerCase() ? 5 : 4) +
    (octaveMarks.match(/'/g)?.length ?? 0) -
    (octaveMarks.match(/,/g)?.length ?? 0);
  return (octave - 4) * 7 + "CDEFGAB".indexOf(letter.toUpperCase()) - 2;
}

/** One bar of ABC → events. Notes written together (no space) are beamed when they're eighths. */
function bar(source: string, tune: string, index: number): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  let beats = 0;
  // The event index of whatever starts on each beat, for placing chords.
  const starts: Record<number, number> = {};
  for (const word of source.trim().split(/\s+/)) {
    let group: Note[] = [];
    // Only a run of eighths is beamed; a longer note in the same word ends the run.
    const flush = () => {
      if (group.length > 1) {
        group[0]!.beam = "start";
        group[group.length - 1]!.beam = "end";
      }
      group = [];
    };
    let rest = word;
    let shortened = false;
    while (rest) {
      const m = rest.match(NOTE);
      if (!m) throw new Error(`${tune}, bar ${index + 1}: can't write "${rest}"`);
      const [all, accidental, letter, octaves, num, slashes, den] = m;
      rest = rest.slice(all.length);
      // ABC length: a number multiplies, each "/" halves (or "/n" divides by n).
      let length = num ? Number(num) : 1;
      if (slashes) length /= den ? Number(den) : 2 ** slashes.length;
      const tied = rest.startsWith("-");
      if (tied) rest = rest.slice(1);
      // A broken rhythm, "A>B": the first note is dotted and the second loses what it gained.
      if (shortened) length /= 2;
      shortened = rest.startsWith(">");
      if (shortened) {
        length *= 1.5;
        rest = rest.slice(1);
      }
      const dotted = DOTTED[length];
      const kind = LENGTHS[length] ?? dotted;
      if (!kind) throw new Error(`${tune}, bar ${index + 1}: no single note lasts ${length} beats`);
      starts[beats] = events.length;
      beats += length;
      if (letter === "z") {
        if (dotted || tied || kind === "whole") {
          throw new Error(
            `${tune}, bar ${index + 1}: only undotted half, quarter and eighth rests can be written`,
          );
        }
        flush();
        events.push({ rest: kind });
        continue;
      }
      const note: Note = { note: kind, pitch: step(letter!, octaves ?? "") };
      if (dotted) note.dot = true;
      if (tied) note.tie = true;
      if (accidental) note.accidental = ACCIDENTALS[accidental as keyof typeof ACCIDENTALS];
      events.push(note);
      if (kind === "eighth") group.push(note);
      else flush();
    }
    if (shortened) throw new Error(`${tune}, bar ${index + 1}: ">" needs a note after it`);
    flush();
  }
  if (beats !== 4) throw new Error(`${tune}, bar ${index + 1} has ${beats} beats, not 4`);
  return Object.assign(events, { starts });
}

/** Put the bar's chords in front of the notes (or rests) they start on, skipping repeats. */
function chordBar(
  events: ScoreEvent[] & { starts?: Record<number, number> },
  chords: string,
  previous: string,
  tune: string,
  index: number,
): { events: ScoreEvent[]; last: string } {
  const words = chords.trim() ? chords.trim().split(/\s+/) : [];
  // Beats count from 0 here, from 1 as written after "@". Two plain chords split the bar in half.
  const placed = words
    .map((word, k) => {
      const [name, at] = word.split("@") as [string, string | undefined];
      if (!CHORD.test(name))
        throw new Error(`${tune}, bar ${index + 1}: can't write chord "${name}"`);
      const beat = at !== undefined ? Number(at) - 1 : k === 0 ? 0 : 2;
      if (at === undefined && k > 1) {
        throw new Error(`${tune}, bar ${index + 1}: give "${name}" a beat with "@"`);
      }
      return { name, beat };
    })
    .sort((a, b) => a.beat - b.beat);
  const out = events.slice();
  let sounding = previous;
  const inserts: { position: number; name: string }[] = [];
  for (const { name, beat } of placed) {
    const position = events.starts?.[beat];
    if (position === undefined) {
      throw new Error(
        `${tune}, bar ${index + 1}: nothing starts on beat ${beat + 1} for "${name}"`,
      );
    }
    if (name !== sounding) inserts.push({ position, name });
    sounding = name;
  }
  // Insert from the back so earlier positions stay valid.
  for (const { position, name } of inserts.reverse()) out.splice(position, 0, { chord: name });
  return { events: out, last: sounding };
}

/** Slur the first run of four or more beamed eighths, the way the tune would be bowed. */
function slurFirstRun(events: ScoreEvent[]) {
  let start = -1;
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (!("note" in e)) continue;
    if (e.beam === "start") start = i;
    if (e.beam === "end" && start >= 0) {
      const notes = events.slice(start, i + 1).filter((n) => "note" in n);
      if (notes.length >= 4) {
        (events[start] as Note).slur = "start";
        (events[i] as Note).slur = "end";
        return;
      }
      start = -1;
    }
  }
}

export function scoresFor(tune: Tune): { masthead: ScoreEvent[]; footer: ScoreEvent[] } {
  const bars = tune.abc
    .split("|")
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b, i) => bar(b, tune.name, i));
  if (bars.length !== 8) throw new Error(`${tune.name}: needs exactly 8 bars, has ${bars.length}`);

  const chordBars = tune.chords.split("|");
  if (chordBars.length !== 8)
    throw new Error(`${tune.name}: chords need 8 bars, have ${chordBars.length}`);
  let chord = "";
  bars.forEach((b, i) => {
    const result = chordBar(b, chordBars[i]!, chord, tune.name, i);
    bars[i] = result.events;
    chord = result.last;
  });

  const masthead: ScoreEvent[] = [
    { key: tune.key },
    { time: "4/4" },
    { text: "mf", place: "below" },
    ...bars[0]!,
    { bar: true },
    ...bars[1]!,
    { bar: true },
    ...bars[2]!,
    { bar: true },
    ...bars[3]!,
    { bar: true },
  ];
  const footer: ScoreEvent[] = [
    { clef: "treble" },
    { key: tune.key },
    ...bars[4]!,
    { bar: true },
    ...bars[5]!,
    { bar: true },
    ...bars[6]!,
    { bar: true },
    { text: "rit.", place: "above" },
    ...bars[7]!,
  ];
  slurFirstRun(masthead);
  slurFirstRun(footer);
  return { masthead, footer };
}
