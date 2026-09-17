# nadavhames.com — guide for agents

A static personal site on GitHub Pages. Bun renders the HTML from `content.ts` at build time and
runs the local dev server; no framework code reaches the browser.

Three files hold what you need, and they have separate jobs:

| file                             | holds                                                      |
| -------------------------------- | ---------------------------------------------------------- |
| **AGENTS.md** (this file)        | how to work here: rules, checks, and keeping the docs true |
| [CODEBASE.md](CODEBASE.md)       | how the site works **now** — no history                    |
| [PROJECT_LOG.md](PROJECT_LOG.md) | dated entries for every substantive change, newest first   |

Read CODEBASE.md before changing anything you don't already know; it names the file for every
feature. Read PROJECT_LOG.md when you need the reason behind a decision, or what was already tried.

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

## Keeping the docs true

After substantive work — anything that changes behaviour, structure, content, tooling or a
decision worth remembering — update both files before you finish. A typo fix, a formatting run or
a change you reverted doesn't count.

1. **CODEBASE.md** — edit it so it describes the code as it now stands. Replace what changed and
   delete what is gone. Never write history there: no "previously", no dates, no "now uses". If a
   change adds a concept (a new tune, a new script, a new token), it belongs in the section that
   already covers that area rather than a new one at the end.
2. **PROJECT_LOG.md** — add one entry at the top, under today's date (`date +%F`), saying what
   changed, why, and anything the code can't show: sources used, measurements taken, approaches
   tried and dropped, and anything the owner asked for. Keep entries short; they are a record, not
   a tutorial. Never rewrite or delete older entries — they are the history.

Both files are documentation only: the deploy excludes `*.md`, so neither ever ships.
