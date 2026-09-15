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

## Templating

`build.tsx` is JSX rendered by
[preact-render-to-string](https://github.com/preactjs/preact-render-to-string), for editor
autocomplete, type checking and escaping by default.

- Raw markup only via `dangerouslySetInnerHTML`, used just for the static inline `BOOT` and `YEAR`
  scripts.
- `prose()` parses the inline markup into nodes rather than an HTML string, keeping escaping
  intact.
- Output is compact (no whitespace between tags); where a space matters, use explicit `{" "}`.
- Output must be deterministic (`check` compares bytes): nothing time- or random-based at build
  time. The footer year is set in the browser.
- JSX types reject string event handlers (`onclick="…"`); wire events in the page's script.

## Design notes

Set like a printed programme note: one narrow measure, section labels hanging in the left margin,
hairline rules, dates in a monospaced column.

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
