# nadavhames.com — guide for agents

A static personal site on GitHub Pages. Bun renders the HTML from `content.ts` at build time and
runs the local dev server; no framework code reaches the browser.

## Rules

- **All copy lives in `content.ts`.** Headings, blurbs, labels, status messages — add new wording
  there, never inline in `build.tsx` or a script. The exceptions are strings the older games'
  scripts write or compare against (noted where they occur).
- **Never edit `.html` files.** They are build output from `build.tsx`. Change `content.ts` or
  `build.tsx` and run `bun run build`.
- **Theme values are tokens.** Colours live as custom properties at the top of `assets/site.css`,
  repeated for the light theme. Don't add theme selectors further down; add a token.
- **Keep it dense.** The site should read in a screen or two; tighten an existing block rather
  than adding another.
- **Before finishing**, run:

  ```bash
  bunx tsc --noEmit
  bun run build
  bun run check      # generated HTML matches content.ts
  bun run format
  ```

  `bun build` is Bun's bundler, not the script — always `bun run build`.

## Layout

```
content.ts                 every word on the site
build.tsx                  renders content.ts into every HTML page, in JSX (Preact, build time only)
index.html, 404.html       GENERATED
Othello/**/*.html          GENERATED (game.js beside them is hand-written)
Turmite Sim/sim.html       GENERATED (scripts live in Styles/)
assets/site.css            every style, plus the theme tokens
assets/theme.js            light/dark toggle, sticky-header hairline, Contact scroll
assets/resume-peek.js      hover preview of the résumé PDF
assets/marginalia.js       parallax for the margin symbols
assets/contact.js          sends the contact form inline
assets/echo.js             the 404 page's easter egg
assets/staff-writing.js    lays out and writes both staffs' scores
handwriting.ts             GENERATED pen strokes for the staffs (see Handwritten staffs)
score.ts                   turns the tunes' ABC notation into the staffs' scores
scripts/                   one-off generators, never deployed
Nadav-Hames-Resume.pdf     the résumé
dev.ts                     local dev server with live reload (never deployed)
package.json               bun scripts: dev, build, check, format
tsconfig.json              strict TS, Preact supplies the JSX types
.prettierrc.json           Prettier; .prettierignore skips generated HTML and vendored watch.js
mise.toml                  pins the Bun version; its tasks call the same scripts
.github/workflows/         deploy on push; import-resume pulls a new PDF on demand
```

## Editing the text

Prose fields in `content.ts` take a little inline markup and nothing else. Everything is escaped,
so `&` and `<` are safe to type:

| you write                                | you get                                         |
| ---------------------------------------- | ----------------------------------------------- |
| `[Scorewright](https://scorewright.com)` | a link — other sites and PDFs open in a new tab |
| `*sheet music*`                          | italics, set in the display serif               |

Longer text is a backtick template literal wrapped across lines; the build folds line breaks and
indentation back into single spaces. Never split a `[label](href)` across two lines — the link
syntax is matched on a single line.

The deploy runs the build, so editing `content.ts` and pushing is enough to change the live text.

## Local preview

`bun dev` builds and serves on <http://localhost:8000> (`bun run dev.ts 3000` for another port).
With [mise](https://mise.jdx.dev), run `mise trust` once, then `mise run dev|build|check`.

The server watches the directory:

- **`content.ts` or `build.tsx`** — rebuilds the pages, then reloads the browser.
- **a `.css` file** — swaps the stylesheet in place, keeping scroll position, theme and the
  rendered résumé preview.
- **anything else** — reloads the page. Editor temp files are ignored.

The reload snippet is injected on the way out, so files on disk stay as they ship. Use the server
rather than `file://` — pages use root-absolute `/assets/...` paths.

## Deploying

Pushing to `master` runs `.github/workflows/deploy.yml`: checkout, install the pinned Bun,
`bun run build`, copy what should be served into `_site/`, hand it to GitHub Pages. It can also be
run by hand and is called by the résumé import. Nothing else runs in CI.

The `_site/` step excludes tooling (`*.ts`, `*.tsx`, `*.md`, `package.json`, lockfile, configs).
`CNAME`, `favicon.ico`, `robots.txt`, `sitemap.xml`, the PDF, `assets/` and the game folders ship.
Generated HTML is committed too (so `check` and local preview work), but the deploy rebuilds it,
so a stale copy never ships.

## Résumé

Replace `Nadav-Hames-Resume.pdf`, keeping the filename; no rebuild needed. The hover preview
renders page 1 of the live file with [pdf.js](https://mozilla.github.io/pdf.js/), loaded lazily from
a CDN on first hover, and shows "Page 1 of N" for longer files. To rename the file, change
`site.resume` in `content.ts` — every link and the preview read from it. GitHub Pages caches
briefly, so repeat visitors may see the old PDF for a few minutes.

### Importing from FlowCV

`.github/workflows/import-resume.yml` (**Actions → import resume → Run workflow**, owner only,
manual only) downloads the PDF, replaces the file, commits, and redeploys.

- It fetches `https://app.flowcv.com/api/public/download_resume?token=<token>`, the endpoint behind
  the Download button on the public share page. The token defaults to the public share link's;
  there is also a "url" input.
- Nothing is committed unless the response is HTTP 200, starts with `%PDF-`, and is at least 10 kB.
- **FlowCV rate-limits**: a repeat download within minutes returns 429 with `Retry-After` ≈ 3 min.
  Curl honours it, which is why the step doesn't set `--retry-delay` (that would override it).
- **FlowCV re-renders the PDF per request**, so bytes always differ; there is no "skip if
  unchanged". Running it twice makes two commits.
- Deploy is triggered by _calling_ `deploy.yml`, because pushes made with `GITHUB_TOKEN` don't
  start other workflows. The called workflow checks out the branch tip so it sees the new commit.

## Contact form

The Contact section posts to [Web3Forms](https://web3forms.com), which emails each message. Its
wording and the access key are `contact` in `content.ts`. The key is meant to be public; abuse is
prevented by restricting it to `nadavhames.com` in the Web3Forms dashboard.

- Browser validation runs first. `assets/contact.js` sends in the background and shows the result
  in place: clears on success, keeps the text on failure.
- Without JavaScript it is an ordinary form post landing on Web3Forms' confirmation page.
- A hidden `botcheck` checkbox is a honeypot; Web3Forms discards submissions with it ticked.
- The header **Contact** link glides to the form (instantly with reduced motion). From the keyboard
  it also focuses the Name field; from a tap it doesn't, to avoid popping up the phone keyboard. On
  pages without the form it navigates to `/#contact`.

## 404 easter egg (Echo)

Pressing the big "404" opens a Simon-style melody game: five wedges around a hub play a tune, you
repeat it, and it grows a note each round. Nothing on the page explains it, deliberately. Wording
is `notFound.game` in `content.ts`; the title is used only as an aria-label.

- **Entrance.** Wedges spin out one after another, each chiming its note as it lands, then the hub
  pops in. Timing constants in `assets/echo.js` are written onto the panel as custom properties, so
  CSS animation delays and chimes can't drift apart.
- **Sound.** All Web Audio synthesis, no files. Notes are A minor pentatonic so random sequences
  sound musical; chimes are bell-like (fundamental plus fading inharmonic partials). Sound is
  scheduled on the audio clock, and unlocked by the click that opens the game.
- **Shape.** Wedges are SVG paths computed in `build.tsx` with a constant-width gap; clicks land
  exactly on the shape.
- **Colour.** Each wedge has a hue per theme (`--echo-1`…`--echo-5`); idle, hover and lit states are
  mixed from it by per-theme tokens. Light mode shows full-strength hues and flashes pale with a
  wider glow (`--echo-glow`) — mixing toward dark made them murky. Hover has its own token because
  adding to the idle mix would exceed 100% in light mode, which is invalid and paints black.
- **Controls.** Click/tap, Enter/Space on a focused wedge, or keys 1–5 / A S D F G. Best score is
  per browser in `localStorage`.

## Othello and Turmite Sim

Older projects, generated like the rest (shared header, theme, footer, back link); copy is `games`
in `content.ts`. Game logic is hand-written JavaScript (`Othello/*/game.js`, `Turmite Sim/Styles/`)
that finds its board and controls by id — keep those ids in `build.tsx`. Each script wires up its
own buttons at the bottom; there are no inline handlers.

- **One-screen Othello** paints cells with inline colours and reads them back: literal `black` and
  `white` are the discs, so they can't follow the theme.
- **Turmite Sim** names cells `white`, `black`, `red`; `canvas-grid.js` draws them in the theme's
  surface, text and accent colours and repaints on theme change. `sim.js` matches presets by their
  option text, so the names in `TURMITE_PRESETS` can't be reworded.
- **Two-screen Othello** (`Othello/online/game.js`) connects browsers over WebRTC with
  [PeerJS](https://peerjs.com) and its free cloud server. The host gets a six-letter code (peer ID
  `nadavhames-othello-CODE`) and an invite link (`?join=CODE`); the host plays black and moves
  first. Each side validates moves on its own board; a player with no legal move is skipped; a
  rematch starts once both ask, with the host sending the shared board colour. Its wording is
  `games.othello.online`, passed to the page as `data-text-*` attributes.
- **PeerJS is pinned** (`PEERJS_VERSION` plus `PEERJS_INTEGRITY`) and loaded from jsDelivr, falling
  back to cdnjs (identical file). If neither loads, or WebRTC is missing, the page shows
  `games.othello.unavailable`. To upgrade, change the version and regenerate the hash:

  ```bash
  curl -s https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js | openssl dgst -sha384 -binary | openssl base64 -A
  ```

- **Dropped connections.** A closed tab doesn't always close the data channel and a backgrounded
  phone just pauses, so both sides ping every 3 s. After 15 s of silence the other player sees
  "Lost contact…" and Start over; if pings resume, play continues.

## Analytics

[Umami Cloud](https://cloud.umami.is), configured by `analytics` in `content.ts`: no cookies, no
consent banner. It records pageviews (auto-tracked), visitors, referrers, countries, devices and
languages, and only counts the hostnames in `analytics.domains`, so local dev is never counted. Set
`umamiWebsiteId` to `""` to omit the script entirely.

Custom events:

| event            | fires when                                  | recorded with it                                                        |
| ---------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `resume-open`    | a Resume link is clicked                    | `location`: `header`, `header-preview`, `contacts`, `404-header`, `404` |
| `resume-preview` | the header preview renders on hover         | —                                                                       |
| `outbound-click` | a link to another site is clicked           | `url`, `location`: `intro`, `contacts`, `work`, `projects`, `footer`    |
| `email-click`    | the email link is clicked                   | `location`                                                              |
| `project-click`  | Othello or Turmite Sim is opened            | `url`                                                                   |
| `contact-nav`    | the header Contact link is clicked          | —                                                                       |
| `contact-submit` | a contact message is accepted               | —                                                                       |
| `contact-error`  | a contact send fails — means the form broke | —                                                                       |
| `echo-open`      | the 404 easter egg is opened                | —                                                                       |
| `echo-start`     | a game of Echo starts                       | —                                                                       |
| `echo-game-over` | a game ends on a wrong note                 | `score`, `best` (that browser's), `newBest`, `seconds`                  |
| `echo-new-best`  | a game beats that browser's best            | `best`                                                                  |
| `echo-quit`      | the game is closed mid-round                | `round`                                                                 |
| `staff-play`     | a handwritten staff is clicked to play/stop | `tune`                                                                  |
| `tune-switch`    | the tune dots are pressed                   | `tune`: the tune switched to                                            |
| `chords-toggle`  | the backing-chords button is pressed        | `on`                                                                    |

- Links get their event automatically from their href in `Link` in `build.tsx`, so new links in
  `content.ts` are tracked with no extra work.
- Umami's dashboard counts property values; it can't average them. The highest Echo score is the
  largest `score` value in the event's property breakdown.
- `/?notrack` sets `localStorage['umami.disabled']` in that browser (handled in the inline `BOOT`
  script); `/?track` undoes it. The owner should visit it on each of their browsers.
- Ad blockers often block `cloud.umami.is`, so numbers are a floor.

## Margin symbols

Musical symbols fill the space beside the page column and move with parallax on scroll.

- Each symbol gets one depth value (0 far → 1 near) in `build.tsx`; size, opacity and speed all
  derive from it. Change the depth range rather than tuning properties separately.
- Positions come from a seeded PRNG so builds are deterministic; the symbol pool and count per side
  are `marginalia` in `content.ts`.
- `assets/marginalia.js`: the layer is `position: fixed`; each scroll burst is one
  `requestAnimationFrame` setting transforms, wrapped over a band taller than the viewport. Strips
  are masked top and bottom, and fade in briefly on load.
- Hidden below 60rem. `prefers-reduced-motion` leaves them static and skips the scroll listener.
- Use Basic Multilingual Plane symbols only (♩ ♪ ♫ ♬ ♭ ♮ ♯); clefs render as empty boxes in most
  fonts.

## Handwritten staffs

Both staffs on the home page have music written onto them in amber ink, stroke by stroke, as if
with a pen: the masthead's as the page loads (about 24 seconds, after the printed clef), the
footer's once it scrolls into view (about 21 seconds, closing on the final barline).

**Tunes.** The music is eight bars of a public-domain tune, bars 1–4 on the masthead carrying
straight on to 5–8 in the footer, which close on a cadence at the final barline. The tunes are
`tunes` in `content.ts`, as ABC notation:

- Three Irish polkas from thesession.org (The Rakes of Mallow, John Ryan's Polka, The Ballydesmond
  Polka), using their first eight bars.
- The Scottish pipe march Scotland the Brave, also from The Session. It uses bars 9–16, since its
  first eight stop on a half cadence.
- Georgia on My Mind (Carmichael and Gorrell, 1930), from a simplified lead sheet on
  abcnotation.com. It is public domain in the US since 2026 but not everywhere: in life-plus-70
  countries it stays in copyright until 2052. It uses bars 25–32, the last A section, and plays as a
  ballad (`feel: "ballad"`).

- **Switching.** Faint dots just above the start of the masthead staff (`TuneSwitch`, one per tune,
  the current one lit) are a button, not a menu: each press moves to the next tune, stops any
  playback, and rewrites both staffs at 2.5× pen speed. The choice is saved in `localStorage`
  (`staff-tune`, by name) and restored on the next visit.
- **`score.ts`** turns each tune's ABC into the two staffs' `ScoreEvent`s, and stops the build on
  anything the handwriting can't draw (triplets, grace notes, chords of notes, dotted rests, whole
  rests) or a bar that isn't four units. One ABC unit is written as a quarter: 2/4 tunes with L:1/8
  come out in 4/4 with every length doubled, and 4/4 tunes with L:1/4 as they are. Ties (`F4-`) are
  drawn and held in playback, not struck again. Broken rhythms
  (`D>E`) become a dotted quarter and a lone flagged eighth; a dot sits right of the head, in the
  space above when the head is on a line, and dotted notes get a little extra room. It adds the expression:
  key signature and 4/4 on the masthead, clef and key on the footer, _mf_ at the start, a slur on
  each staff's first run of four beamed eighths, and _rit._ over the last bar. To add a tune, paste
  eight bars from The Session and check they end on a cadence. _mf_ and other text below the staff
  drops just clear of low notes (`clearBelow`).
- **Scores** are typed `ScoreEvent`s: notes with a pitch or chord, accidental, beam and slur
  start/end, tie; rests; bars; clef; key (C, G, D, A, or F with its flat); time; text above or below. Pitch
  counts staff steps up from the bottom line (0 E, 2 G, 4 B, 8 F, 9 G above the staff); stems point
  down from the middle line up; beamed groups and chords follow their average.
- **Phones show all four bars** on both staffs. Two things make room. The staff is engraved
  smaller: `--space` in `site.css` is 5px, 4px under 440px and 3.5px under 350px. The staff lines,
  clef and handwriting offsets are all sized from it, and `widthOf` in `staff-writing.js` reads the
  scale back from the staff's height and sets the svg's `viewBox`, so strokes are always laid out in
  5px-space units and a narrow staff lays out as a wider one. Spacing is by duration, but once an
  eighth would get less than `MIN_EIGHTH` (11 units) every note, barline and accidental also takes
  an equal share of the room (`SHARE`), trending toward even spacing. Dotted notes and lone flagged
  eighths add a few fixed units (`ROOM`), so a dot or flag never runs into the next mark. At 320px
  the tightest gap between marks is under 1px, with nothing touching; check that again after
  adding a busy tune.

**Chords.** Each tune has chords (`chords` in `content.ts`, the source in `chordSource`): one per
bar, two for its halves, or any number on given beats with `@` (`Em7 A7@2`). Symbols can be a root
with an optional flat, then nothing, `m`, `7`, `m7`, `ma7` or `6`, and an optional `/bass`. The
letters dataset has no "/", so it is drawn with a slanted barline stroke. Only published chords are
used, checked against the melody: The Rakes of Mallow from setting 47155; John Ryan's from settings 28845 and
56765, which agree (46677's G under bar 2 clashes with the melody, so it isn't used); The
Ballydesmond from setting 27994, which is the same melody in G, transposed down to D; Scotland the
Brave from setting 53645 in C, melody and chords both transposed up a tone to D; Georgia on My
Mind from the same lead sheet as its melody, leaving out the last bar's Gm7–C7 turnaround so it
ends on F. `score.ts` places each chord at the note (or rest) starting on its beat and writes a symbol only where the
chord changes, just above the staff (30% larger than other text). `clearChords` lifts a symbol
only as far as a high stem, beam or slur under it needs (3px clearance). Tempo text such as _rit._
also belongs above the staff, so where it shares a note with a chord it stacks above the symbol
(`above-chord`) and lifts with it. On a squeezed staff, chords a beat apart can meet, so
`spaceChords` nudges the later symbol right to keep a 4-unit gap. Capitals and digits come from the same UJI writer
(`scripts/extract-handwriting.ts` extracts a–z, A–Z, 0–9 and "."). A tiny stack of dots after the
tune dots (`data-chords-switch`) turns the backing on and off, live during playback, saved as
`staff-chords` (on by default). The backing is on the same synthesised piano, quieter than the
tune, and follows the tune's feel (`FEELS`). A polka gets an oom-pah: each beat is either a bass
note (root, or the fifth on the off half of the bar, root again wherever the chord changes) or a
short chord. A ballad gets held chords, bass and chord together, struck on beats 1 and 3 and
wherever the chord changes. Both are timed off the melody, so they slow under _rit._, and the last
chord rings. Voicings put the bass in E2–D♯3 (or the slash note) and the chord tones in E3–D♯4
(`voicing`). Four-note chords leave the root to the bass, so sevenths don't cluster. While the backing is on, the sounding chord's symbol lights up with the note.

**Playback.** Clicking a staff (or Enter/Space when focused) plays the whole excerpt, masthead then
footer; clicking either again stops it. Pressed before the pen is done, both staffs finish writing
at 45× speed (`hurry`, about half a second, drawing the footer on the spot if it hasn't scrolled
into view) and then play. The click flashes a ring that fades within a second and a half; keyboard
focus keeps a steady ring instead. While playing, the rest of the music dims and each note rises in
full ink as it sounds (no lift with reduced motion). When the music reaches the footer and it isn't
fully on screen, the page scrolls to the bottom (`follow`; smooth unless reduced motion). It waits until the
masthead's last note has finished, so that note is seen playing. No recording exists for these settings, so
the piano is synthesised with Web Audio in `assets/staff-writing.js`: a filtered-noise hammer over
slightly stretched overtones that fade faster the higher they are. Pitches come from the score (key
signature and accidentals included); `FEELS` sets each feel's tempo (0.3 s a quarter for polkas, 0.8 s for the ballad) and `RIT` how far the notes after
_rit._ ease out. Only a note's own marks light up (head, stem, accidental, ledger). Labels are
`labels.playExcerpt` / `labels.stopExcerpt` / `labels.nextTune`, with `{tune}` filled in.

- **The strokes are real handwriting.** Music comes from HOMUS (Handwritten Online Musical Symbols;
  Calvo-Zaragoza & Oncina, ICPR 2014; revised copy at github.com/apacha/Homus), which recorded
  musicians' stylus paths in writing order. Every symbol is by one musician (no. 4), cycling through
  their four drawings of each. HOMUS has no stated licence. Text comes from UJI Pen Characters v2
  (Llorens et al., LREC 2008; UCI repository, **CC BY 4.0 — attribution required**), letters by
  writer W14; only a–z and "." exist. Both are credited in `handwriting.ts`, each staff's `<desc>`,
  and here.
- **Augmentation dots** are musician 4's own HOMUS dots (samples 49–52), scaled to 1.6px (`parts.dot`).
- **Half rests** are the same musician's whole/half rest bar (samples 145–148, `parts["rest-half"]`),
  drawn in two close passes on the middle line. Flats in a key signature reuse `parts.flat`.
- **HOMUS has no slurs, ties, beams, chords or text**, so they're assembled from musician 4's
  strokes: chords and beamed notes from separately drawn heads and stems (`parts`), stems stretched
  to meet the beam (stems-down ones are the same strokes turned round); slurs and ties from the
  levelled upper arc of whole-note loops (`arcs`); beams and ledger lines from a barline turned on
  its side (`beams`). A beam is two passes of one shape, with wobble capped at a short barline's so
  long beams stay smooth.
- **`handwriting.ts` is generated** by `scripts/extract-handwriting.ts` from a downloaded HOMUS
  directory and `ujipenchars2.txt` (neither is in the repo). Edit `SAMPLES`, `MUSICIAN` or `WRITER`
  there and rerun it with both paths.
- **Laid out in the browser** by `assets/staff-writing.js`, because slurs, ties and beams join notes
  whose pixel positions depend on each staff's width. Each staff is `StaffWriting` in `build.tsx`
  (`data-staff-writing` names its score, `data-start` is `load` or `view`); the scores and only the
  strokes they use are inlined once as JSON (`StaffWritingData`). Clef, key and time signature take fixed
  room so narrow screens squeeze the notes instead. When the staff changes width (a ResizeObserver, so scrollbars and
  reflows count too) every stroke is re-laid and eases to its new shape each frame; paths are
  reshaped in place, so writing in progress carries on. Layout must never add or drop a stroke, only
  move them. Without JavaScript the staffs are empty.
- **Animation is CSS**: `pathLength="1"` plus a dash offset reveals each stroke, delayed until the
  one before is done; strokes start transparent so round caps don't leave dots early. Timing is
  `PEN` in the script — duration grows with the square root of stroke length, so scribbled note
  heads don't crawl. With reduced motion the music is simply there. Shared styles are `.ink`.

## Templating

`build.tsx` is JSX rendered by
[preact-render-to-string](https://github.com/preactjs/preact-render-to-string), for editor
autocomplete, type checking and escaping by default.

- Raw markup only via `dangerouslySetInnerHTML`, used just for the static inline `BOOT` and `YEAR`
  scripts and the staff-writing JSON (which escapes `<`).
- `prose()` parses the inline markup into nodes rather than an HTML string, keeping escaping
  intact.
- Output is compact (no whitespace between tags); where a space matters, use explicit `{" "}`.
- Output must be deterministic (`check` compares bytes): nothing time- or random-based at build
  time. The footer year is set in the browser.
- JSX types reject string event handlers (`onclick="…"`); wire events in the page's script.

## Design notes

Clean and printed rather than atmospheric: the look borrows from engraved sheet music. One narrow
measure, hairline rules, dates in a monospaced column, and:

- **Palette** — near-neutral ink and paper with a single amber accent (the owner prefers amber;
  don't swap it). No glows, gradients or soft shadows; the only shadow is the crisp `--shadow-pop` on the
  résumé preview.
- **Staff** — home page only. A five-line staff (`--staff`, drawn with gradients, `--space` apart: 5px, smaller on phones) opens it under
  the masthead with a barline and treble clef, and the footer closes on one ending in a final
  double barline (`footer__inner--staff`, set by `Footer score`). Other pages keep a plain hairline. The clef is Noto Music's outline (OFL) embedded as an SVG mask in `--clef`, so
  it takes the theme colour and needs no font; its size and offset are multiples of `--space`,
  so they scale with it.
- **Rehearsal marks** — section labels are boxed mono caps hanging in the left margin.
- **Margin symbols** print in `--muted` ink, not the accent.

Keep new elements within this vocabulary (hairlines, boxes, staff motifs, one accent) rather than
adding decoration.

Layout comes from four tokens in `assets/site.css`: `--measure` (text column), `--label` (hanging
label column), `--gutter`, and `--pad` (page margin). `--pad` sits outside the other three, so
widening the margin never squeezes the text. Every block uses the same `.shell` container, keeping
left and right margins identical from masthead to footer.

Readability rules:

- Three tiers, each with its own face and brightness, so the eye hops from title to title: serif
  titles in `--text` (job roles, project names, page titles), sans paragraphs in `--body`, mono
  details in `--faint`. Keep `--body` about a third dimmer than `--text` (≈ 1.5:1 between them) or
  titles stop standing out.
- Running text (the prose classes grouped near the top of `site.css`) is at least 16px, line-height
  1.7, `text-wrap: pretty`, in `--body`. Add new
  paragraph classes to that group rather than styling them separately; links inside get an
  underline there too.
- Lines stay around 60–70 characters (`--measure`). Mono metadata and labels stay at 0.72rem or
  more (larger on small screens); `--faint` is the dimmest colour allowed for text, ≥ 5:1.
- Font smoothing is a token (`--smoothing`): thinned only in dark mode, where light-on-dark text
  otherwise looks heavy. Inter is loaded with its optical-size axis.

Dark is the default palette on `:root`; light is repeated under
`@media (prefers-color-scheme: light)` and `:root[data-theme="light"]` (the header toggle, stored in
`localStorage`). Pages must work at 320px wide and keep text contrast at WCAG AA in both themes.
