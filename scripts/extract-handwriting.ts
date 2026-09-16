/**
 * Builds handwriting.ts: the pen strokes written onto the staffs.
 *
 *   bun run scripts/extract-handwriting.ts path/to/Homus-master/HOMUS path/to/ujipenchars2.txt
 *
 * Music symbols come from HOMUS (Handwritten Online Musical Symbols; J. Calvo-Zaragoza and
 * J. Oncina, ICPR 2014), in the revised copy at https://github.com/apacha/Homus. Each sample
 * records the points a musician's stylus passed through, stroke by stroke, in writing order, so
 * replaying them draws the symbol the way it was written. Every symbol is by one musician.
 *
 * Performance text comes from UJI Pen Characters v2 (D. Llorens et al., LREC 2008; UCI Machine
 * Learning Repository, CC BY 4.0), letters by one writer, recorded the same way.
 *
 * HOMUS has no slurs, ties, beams or chords, so those are assembled from the same musician's
 * strokes: chords and beamed notes from their separately drawn heads and stems, slurs and ties
 * from the upper arc of their whole-note loops, and beams from a barline turned on its side.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOMUS = process.argv[2] ?? "";
const UJI = process.argv[3] ?? "";
if (!HOMUS || !UJI) {
  throw new Error(
    "usage: bun run scripts/extract-handwriting.ts <HOMUS directory> <ujipenchars2.txt>",
  );
}

const MUSICIAN = 4;
const WRITER = "W14";
const SPACE = 5; // px between staff lines

type Point = [number, number];
type Stroke = Point[];

/** Whole symbols for the top staff. `head` says which end of the stem the note head is at. */
const SAMPLES = {
  "quarter-up": { ids: [93, 94, 95, 96], head: "bottom" },
  "quarter-down": { ids: [97, 98, 99, 100], head: "top" },
  "half-up": { ids: [81, 82, 83, 84], head: "bottom" },
  "half-down": { ids: [85, 86, 87, 88], head: "top" },
  "eighth-up": { ids: [57, 58, 59, 60], head: "bottom" },
  "eighth-down": { ids: [61, 62, 63, 64], head: "top" },
  whole: { ids: [149, 150, 151, 152], head: "whole" },
  barline: { ids: [33, 34, 35, 36], head: "staff" },
  "time-4-4": { ids: [21, 22, 23, 24], head: "staff" },
} as const;

function read(id: number): Stroke[] {
  const [, ...lines] = readFileSync(join(HOMUS, String(MUSICIAN), `${MUSICIAN}-${id}.txt`), "utf8")
    .trim()
    .split(/\r?\n/);
  return lines
    .map((line) =>
      line
        .split(";")
        .filter((p) => p.trim())
        .map((p) => p.split(",").map(Number) as Point),
    )
    .filter((stroke) => stroke.length);
}

function bounds(points: Point[]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const b = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  return { ...b, w: b.x1 - b.x0, h: b.y1 - b.y0, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 };
}

/** Ramer–Douglas–Peucker: drop points that don't change the line by more than `epsilon`. */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  const [a, b] = [points[0]!, points[points.length - 1]!];
  let worst = 0;
  let at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const d = Math.abs(dy * px - dx * py + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > worst) [worst, at] = [d, i];
  }
  if (worst <= epsilon) return [a, b];
  return [
    ...simplify(points.slice(0, at + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(at), epsilon),
  ];
}

const round = (v: number, places = 1) => Math.round(v * 10 ** places) / 10 ** places;

/** Scale and shift a sample, then flatten each stroke to [x, y, x, y, …] in px. */
function place(strokes: Stroke[], origin: Point, scale: number) {
  return strokes.map((stroke) =>
    simplify(
      stroke.map(([x, y]) => [(x - origin[0]) * scale, (y - origin[1]) * scale] as Point),
      0.12,
    ).flatMap(([x, y]) => [round(x), round(y)]),
  );
}

/** The note head's centre, in sample units. */
function findHead(strokes: Stroke[], end: "top" | "bottom") {
  const all = bounds(strokes.flat());
  const stem = strokes.reduce((tallest, s) => (bounds(s).h > bounds(tallest).h ? s : tallest));
  const target = end === "bottom" ? all.y1 : all.y0;
  // The head is its own stroke when the writer lifted the pen; take the one nearest the head end.
  const others = strokes.filter((s) => s !== stem && bounds(s).h < all.h * 0.6);
  if (others.length) {
    const head = others.reduce((best, s) =>
      Math.abs(bounds(s).cy - target) < Math.abs(bounds(best).cy - target) ? s : best,
    );
    const b = bounds(head);
    if (Math.abs(b.cy - target) < all.h * 0.35) return { cx: b.cx, cy: b.cy };
  }
  // Otherwise head and stem are one stroke: use the points at the head end.
  const band = all.h * 0.22;
  const near = strokes
    .flat()
    .filter(([, y]) => (end === "bottom" ? y > all.y1 - band : y < all.y0 + band));
  const b = bounds(near);
  return { cx: b.cx, cy: b.cy };
}

function extract(kind: keyof typeof SAMPLES, id: number) {
  const strokes = read(id);
  const all = bounds(strokes.flat());
  const { head } = SAMPLES[kind];

  if (head === "top" || head === "bottom") {
    const h = findHead(strokes, head);
    return place(strokes, [h.cx, h.cy], (4 * SPACE - 1) / all.h); // stem and head span ~4 spaces
  }
  if (head === "whole") return place(strokes, [all.cx, all.cy], (1.5 * SPACE) / all.w);
  return place(strokes, [all.cx, all.y0], (4 * SPACE) / all.h); // fill the staff, from the top
}

const handwriting = Object.fromEntries(
  Object.entries(SAMPLES).map(([kind, { ids }]) => [
    kind,
    ids.map((id) => extract(kind as keyof typeof SAMPLES, id)),
  ]),
);

/* ---------- parts, for the footer staff ---------------------------------- */

/**
 * Separately drawn heads and stems from two-stroke stem-up notes, anchored at the head's centre
 * at the same scale as the whole note, so a head and stem from one sample fit back together.
 */
function split(ids: readonly number[]) {
  return ids.map((id) => {
    const strokes = read(id);
    const all = bounds(strokes.flat());
    const stem = strokes.reduce((tallest, s) => (bounds(s).h > bounds(tallest).h ? s : tallest));
    const head = strokes.find((s) => s !== stem)!;
    const hb = bounds(head);
    const scale = (4 * SPACE - 1) / all.h;
    return {
      head: place([head], [hb.cx, hb.cy], scale),
      stem: place([stem], [hb.cx, hb.cy], scale),
    };
  });
}

/** Scale to a height (or width) in px and anchor at a point given as a fraction of the box. */
function fit(ids: readonly number[], size: number, fx: number, fy: number, by: "h" | "w" = "h") {
  return ids.map((id) => {
    const strokes = read(id);
    const b = bounds(strokes.flat());
    return place(strokes, [b.x0 + b.w * fx, b.y0 + b.h * fy], size / b[by]);
  });
}

/** The top of a whole-note loop as a unit arc: x runs 0→1 left to right, y from 0 at the ends to −1. */
function arc(id: number) {
  const loop = read(id).reduce((a, b) => (a.length > b.length ? a : b));
  const b = bounds(loop);
  const top = loop.reduce((best, p, i) => (p[1] < loop[best]![1] ? i : best), 0);
  const n = loop.length;
  const at = (i: number) => loop[((i % n) + n) % n]!;
  let lo = top;
  let hi = top;
  while (hi - lo < n - 1 && at(lo - 1)[1] < b.cy) lo--;
  while (hi - lo < n - 1 && at(hi + 1)[1] < b.cy) hi++;
  let run: Point[] = [];
  for (let i = lo; i <= hi; i++) run.push(at(i));
  if (run[0]![0] > run[run.length - 1]![0]) run = run.reverse();
  const [x0, ya] = run[0]!;
  const [x1, yb] = run[run.length - 1]!;
  // Level the ends: measure the bow from the line joining them, not from a horizontal.
  const bowed = run.map(([x, y]) => {
    const u = (x - x0) / (x1 - x0);
    return [u, y - (ya + (yb - ya) * u)] as Point;
  });
  const depth = -Math.min(...bowed.map((p) => p[1])) || 1;
  return simplify(
    bowed.map(([u, v]) => [u, v / depth] as Point),
    0.01,
  ).flatMap(([x, y]) => [round(x, 3), round(y, 3)]);
}

/** A barline turned on its side: x runs 0→1 along it, y is sideways wobble as a share of its length. */
function beam(id: number) {
  const line = read(id).reduce((a, b) => (a.length > b.length ? a : b));
  const [sx, sy] = line[0]!;
  const [ex, ey] = line[line.length - 1]!;
  const len = Math.hypot(ex - sx, ey - sy) || 1;
  const [ux, uy] = [(ex - sx) / len, (ey - sy) / len];
  return simplify(
    line.map(([x, y]) => {
      const [dx, dy] = [x - sx, y - sy];
      return [(dx * ux + dy * uy) / len, (dy * ux - dx * uy) / len] as Point;
    }),
    0.004,
  ).flatMap(([x, y]) => [round(x, 3), round(y, 3)]);
}

const quarterParts = split([93, 94, 95, 96]);
const halfParts = split([81, 82, 83, 84]);

const parts = {
  "head-filled": quarterParts.map((p) => p.head),
  "head-open": halfParts.map((p) => p.head),
  stem: quarterParts.map((p) => p.stem),
  whole: handwriting.whole!,
  // A treble clef spans about seven spaces; anchored at its top left.
  "g-clef": fit([77, 78, 79, 80], 7.2 * SPACE, 0, 0),
  sharp: fit([105, 106, 107, 108], 2.8 * SPACE, 0.5, 0.5),
  natural: fit([89, 90, 91, 92], 2.8 * SPACE, 0.5, 0.5),
  // A flat's bowl, not its box, sits on the note's line or space.
  flat: fit([73, 74, 75, 76], 2.4 * SPACE, 0.5, 0.75),
  "rest-quarter": fit([101, 102, 103, 104], 2.8 * SPACE, 0.5, 0.5),
  "rest-eighth": fit([65, 66, 67, 68], 1.8 * SPACE, 0.5, 0.5),
  // A half rest: the musician's whole/half rest is a short bar, sitting on the middle line.
  "rest-half": fit([145, 146, 147, 148], 1.2 * SPACE, 0.5, 1, "w"),
  // An augmentation dot, scribbled small, anchored at its centre.
  dot: fit([49, 50, 51, 52], 1.6, 0.5, 0.5),
  barline: handwriting.barline!,
};
const arcs = [150, 151, 152].map(arc);
const beams = [33, 34, 35, 36].map(beam);

/* ---------- letters ------------------------------------------------------ */

type Letter = { strokes: number[][]; width: number };

function readLetters() {
  const lines = readFileSync(UJI, "utf8").split(/\r?\n/);
  const found: Record<string, Stroke[][]> = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(/^WORD (\S+) \w+_\w+_(W\d+)-\d+/);
    if (!m || m[2] !== WRITER) continue;
    const count = Number(lines[i + 1]!.trim().split(/\s+/)[1]);
    const strokes: Stroke[] = [];
    for (let s = 0; s < count; s++) {
      const nums = lines[i + 2 + s]!.split("#")[1]!.trim().split(/\s+/).map(Number);
      const stroke: Stroke = [];
      for (let k = 0; k < nums.length; k += 2) stroke.push([nums[k]!, nums[k + 1]!]);
      // Runs of identical points were recorded mid-stroke; they add nothing.
      strokes.push(
        stroke.filter(
          (p, j) => j === 0 || p[0] !== stroke[j - 1]![0] || p[1] !== stroke[j - 1]![1],
        ),
      );
    }
    (found[m[1]!] ??= []).push(strokes);
  }
  return found;
}

const raw = readLetters();
const heightOf = (c: string) => bounds(raw[c]![0]!.flat()).h;
const xHeight = ["o", "a", "c", "e"].map(heightOf).sort((a, b) => a - b)[1]!;
const ascender = heightOf("l");
const scaleText = SPACE / xHeight; // x-height of one staff space

/** Baseline in sample units: descenders hang below it, so measure those from the top instead. */
function baseline(c: string, b: ReturnType<typeof bounds>) {
  if ("gjpqy".includes(c)) return b.y0 + xHeight;
  if (c === "f") return b.y0 + ascender;
  return b.y1;
}

const letters: Record<string, Letter[]> = {};
for (const c of "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.") {
  letters[c] = (raw[c] ?? []).map((strokes) => {
    const b = bounds(strokes.flat());
    return {
      strokes: place(strokes, [b.x0, baseline(c, b)], scaleText),
      width: round(b.w * scaleText),
    };
  });
}

/* ---------- write -------------------------------------------------------- */

const out = `/**
 * GENERATED by scripts/extract-handwriting.ts — do not edit.
 *
 * Music symbols by one musician (no. ${MUSICIAN}) from HOMUS, the Handwritten Online Musical Symbols
 * dataset: J. Calvo-Zaragoza and J. Oncina, "Recognition of Pen-Based Music Notation: The HOMUS
 * Dataset", ICPR 2014. Revised copy: https://github.com/apacha/Homus
 *
 * Letters by one writer (${WRITER}) from UJI Pen Characters v2: D. Llorens et al., "The UJIpenchars
 * Database: A Pen-Based Database of Isolated Handwritten Characters", LREC 2008. UCI Machine
 * Learning Repository, CC BY 4.0.
 *
 * Strokes are flat [x, y, x, y, …] in writing order, in px at a 5px staff space. Notes and heads
 * are anchored at the head's centre, barlines and time signatures at the top line, letters at
 * their left edge on the baseline. Arcs and beams are unit shapes stretched between notes.
 */

export type HandStroke = readonly number[];
export type HandSymbol = readonly HandStroke[];

export const handwriting: Record<${Object.keys(SAMPLES)
  .map((k) => JSON.stringify(k))
  .join(" | ")}, readonly HandSymbol[]> = ${JSON.stringify(handwriting)};

export const parts: Record<${Object.keys(parts)
  .map((k) => JSON.stringify(k))
  .join(" | ")}, readonly HandSymbol[]> = ${JSON.stringify(parts)};

/** Unit arcs (x 0→1, y 0 at the ends to −1 at the top), for slurs and ties. */
export const arcs: readonly HandStroke[] = ${JSON.stringify(arcs)};

/** Unit lines (x 0→1, y sideways wobble as a share of length), for beams. */
export const beams: readonly HandStroke[] = ${JSON.stringify(beams)};

export const letters: Record<string, readonly { strokes: HandSymbol; width: number }[]> = ${JSON.stringify(letters)};
`;

await Bun.write(join(import.meta.dir, "..", "handwriting.ts"), out);
console.log(`  wrote handwriting.ts (${(out.length / 1024).toFixed(1)} kB)`);
