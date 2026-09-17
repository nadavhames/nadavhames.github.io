# Project log

Every substantive change, newest first, dated the day it landed. Each entry says what changed, why,
and anything the code can't show: sources, measurements, and approaches tried and dropped. Entries
are never rewritten — this is the history. How the site works today is [CODEBASE.md](CODEBASE.md);
the rules for working here are [AGENTS.md](AGENTS.md).

Entries before 2026-09-15 were reconstructed from commit messages, so they are thinner than the
ones written as the work happened.

## 2026-09-17

### Docs split into three files

`AGENTS.md` had grown to 426 lines that mixed working rules with a description of every feature,
and nothing recorded why past decisions were made. It is now three files: AGENTS.md (rules, checks,
and the duty to update the other two), CODEBASE.md (current state only, moved from AGENTS.md
unchanged), and this log. Agents update CODEBASE.md and add a log entry after substantive work.

CODEBASE.md was then read through for anything that described the past rather than the present.
Fixed: provenance written in the past tense ("was read from the MIDI"), a claim that the UJI writer
supplies "only a–z and '.'" when capitals and digits are extracted too, a tightest-gap measurement
that goes stale with every new tune, and the pen's writing times, which were quoted as 24 s and
21 s but measured 20–36 s (masthead) and 18–25 s (footer) across the four tunes. The analytics
table, the file list and every identifier the docs name were checked against the code and match.

### A speaker icon warns that clicking plays sound

Someone can click a staff without knowing it makes noise, which matters if people are around. A
faint outline speaker now fades in over the staff on hover, after a 0.2 s pause so passing the
mouse over doesn't flicker it, and hides while the tune plays. It only appears where hover exists,
plus on keyboard focus.

- First tried past the right-hand end of the staff, then following the mouse pointer; the owner
  rejected both. It now sits centred above the staff, rising above a chord symbol or stem if one
  reaches up into its spot.
- It sits on a plate of page colour, or staff lines and note stems show through the icon.
- Checked on all four tunes, both staffs: at least 3.5 px clear of ink at desktop width, 2 px at
  320 px, and no overlap with the links row above the masthead staff or the contact form.

### Radetzky March replaces three tunes

The owner kept The Rakes of Mallow, Scotland the Brave and Georgia on My Mind, and asked for the
Radetzky March (Strauss I, 1848, public domain everywhere). John Ryan's Polka, The Ballydesmond
Polka and the Styrian Polka were removed.

- No ABC of the march exists in the usual archives (abcnotation.com, The Session, Mutopia). The
  melody was read from the MIDI of flutetunes.com's solo flute arrangement with a throwaway MIDI
  parser: bars 13–20, the main theme's second statement, which ends on the tonic. The flute plays
  it an octave up with grace notes, so it is written an octave down without them.
- The chords first came from my own reading of the melody, and the owner heard that the A7 across
  bars 6–7 was wrong: its C sharp fought the melody's held D. Chord sites are paywalled or render
  their charts in JavaScript, so the harmony came from 8notes.com's piano duet MIDI (in C, moved up
  a tone): E–A7, then D, then A7 over G in the bass, then D. That also confirmed D for bars 1–4.
- Its quick F sharp–E sharp turns put sharps close together; at phone widths they overlapped the
  note before, so accidentals now take a few fixed units of room like dots and flags.

### Georgia on My Mind, and the notation it needed

The owner asked for it, and 1930 songs entered the US public domain in 2026 — but not everywhere:
in life-plus-70 countries it is protected until 2052, which is noted beside the tune. The Session
has only traditional music, so melody and chords come from a simplified lead sheet on
abcnotation.com, bars 25–32 (the last A section). The source's final Gm7–C7 turnaround is dropped so
the excerpt ends on F.

It needed five things the staffs couldn't do: a flat key signature, ties (held in playback, not
struck again), half rests, chords on any beat (`@`), and jazz chord symbols (`maj7`, `m7`, `/bass`).
The letters dataset has no "/", so it is drawn with a slanted barline stroke. It plays as a ballad:
slower, with held chords instead of the polka oom-pah.

Spelling it "Fma7" read as "FmG7" to the owner, so it is spelled `maj7` now. That exposed two flaws
in the handwriting data: the writer's "a" is drawn as tall as a capital (small letters are now
scaled to the writer's x-height), and letters with tails were aligned by their topmost point, which
for "j" is its dot (they now align by their main stroke, and their hooks tuck under the letter
before). Chord symbols also lift clear of the top staff line so a tail never touches it.

### Phones show all four bars

Previously a narrow staff dropped a bar, and the smallest dropped two. The owner wants all four on
both staffs at every width, so the bar-dropping was removed. Two changes make room: the staff is
engraved smaller on phones (`--space`: 5 px, 4 px under 440 px, 3.5 px under 350 px, with the
layout engine reading the scale back from the staff's height), and a squeezed staff gives every
note a minimum share of the room instead of spacing purely by duration. Four bars need about 340 px
of full-size staff; a 320 px phone has 244 px, which is why scaling was unavoidable.

At 320 px the tightest gap between marks is now 0.4 px, with nothing touching. Worth re-measuring
after adding a busy tune.

### Playback follows the music to the footer

When the music reached the footer staff off screen, there was nothing to see. The page now scrolls
to the bottom, but only once the masthead's last note has finished sounding — the first version
started early and the owner wanted to watch that note play.

## 2026-09-16

### Backing chords, on piano

Each tune gained chords published with a matching setting, checked against the melody, written above
the staff where they change and played under the tune. A tiny stack of dots next to the tune dots
turns the backing on and off.

- The first backing was a Karplus–Strong guitar; the owner found it tinny, so it is the same
  synthesised piano as the melody, quieter.
- The sounding chord's symbol lights up with the note while the backing is on.
- Chord symbols sit just above the staff and lift only as far as a high stem, beam or slur needs.
  _rit._ stacks above the symbol rather than moving below the staff, since tempo text belongs above
  by convention.

### Clicking a staff plays the excerpt

Clicking (or Enter/Space) plays both staffs in order on a synthesised piano — no recording exists
for these settings — dimming the rest of the music and lifting each note as it sounds. Clicking
before the pen has finished writing finishes both staffs at 45× speed first. The click flashes a
ring that fades; keyboard focus keeps a steady one.

Faint dots above the masthead staff round-robin through the tunes and save the choice in
`localStorage`; the owner asked for a button, not a menu.

### The tunes, and score.ts

The staffs were hand-written `ScoreEvent` arrays; they now come from ABC notation in `content.ts`
through `score.ts`, which refuses anything the handwriting can't draw. The music is an excerpt of a
real tune (starting with The Rakes of Mallow), the footer carrying straight on from the masthead.

### Handwriting details

Pen speed raised slightly at the owner's request. Staffs are confined to the home page; other pages
keep a plain hairline. The first beam was drawn as two separate wobbly lines and looked messy, so a
beam is two passes of one shape with its wobble capped.

## 2026-09-15

### Site refresh

The site was rebuilt around an engraved-sheet-music look: one narrow measure, hairline rules,
monospaced dates, a five-line staff under the masthead and closing the footer, and margin symbols
with parallax. The owner asked for a clean, distinctive feel rather than an atmospheric one, and
kept the amber accent over a proposed replacement.

### Readability pass

Running text went to at least 16 px with a 1.7 line height and a 60–70 character measure. With the
body text nearly as light as the titles, the titles stopped standing out, so the three tiers
(serif titles, sans paragraphs, mono details) were separated by brightness as well as face.

## Earlier

Reconstructed from commit messages.

- **2026-04-23** — résumé link updated; the timeline section removed.
- **2025-11-30** — index.html updated.
- **2023-01-05** — project info updated, broken image fixed.
- **2021-01-04** — the site became a Markdown-driven page; title changed.
- **2020-06-24** — first deploy to GitHub Pages.
