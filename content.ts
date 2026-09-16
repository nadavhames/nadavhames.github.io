/**
 * Every word on the site lives here. Edit this file and run `bun run build` (the
 * dev server does it on save); every HTML page is generated from it.
 *
 * Long text wraps across lines — the build folds the line breaks back into single
 * spaces, so wrap wherever it reads best, but don't split a [label](href) in two.
 *
 * Everything is escaped, including raw HTML, which shows up as literal text. The
 * only markup is:
 *
 *     [label](https://example.com)   a link (other sites and PDFs open in a new tab)
 *     *emphasis*                     italic, in the display serif
 */

import type { Tune } from "./score";

export const site = {
  url: "https://nadavhames.com/",
  title: "Nadav Hames — Software Developer",
  description: `
    Nadav Hames is a software developer.
    Co-founder of Scorewright, a real-time collaborative sheet music editor.
  `,
  shortDescription: `
    Software developer. Co-founder of Scorewright, a real-time collaborative sheet music editor.
  `,
  author: "Nadav Hames",
  resume: "/Nadav-Hames-Resume.pdf",
  sourceRepo: "https://github.com/nadavhames/nadavhames.github.io",
};

export const analytics = {
  /** Umami Cloud website ID. Set it to "" to turn tracking off entirely. */
  umamiWebsiteId: "17026d89-d1a2-47c4-989f-f265eb89d184",
  /** Only visits on these exact hostnames are counted, so local dev never pollutes the stats. */
  domains: ["nadavhames.com", "www.nadavhames.com"],
};

export const masthead = {
  name: "Nadav Hames",
  role: "Full Stack Developer",
  lead: `
    Co-founder of [Scorewright](https://scorewright.com). Before that, I worked on enterprise
    project management software at OpenText and on a GIS platform at Mapsted. I enjoy thinking
    laterally and designing robust systems that solve interesting problems. I occaisionally play the trumpet in concert bands.
  `,
  contacts: [
    { label: "nddhames@gmail.com", href: "mailto:nddhames@gmail.com" },
    { label: "GitHub", href: "https://github.com/nadavhames" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/nadavhames/" },
    { label: "Resume", href: site.resume },
  ],
};

/**
 * Stick to symbols from the Basic Multilingual Plane (♩ ♪ ♫ ♬ ♭ ♮ ♯). Clefs and
 * time signatures live in a Unicode plane most text fonts don't cover, and would
 * render as empty boxes.
 */
export const marginalia = {
  symbols: ["♩", "♪", "♫", "♬", "♭", "♮", "♯"],
  perSide: 10,
};

/**
 * The tunes handwritten onto the two staffs, as ABC notation (thesession.org, abcnotation.com):
 * eight bars, bars 1–4 written under the masthead and 5–8 in the footer. The small dots before the
 * masthead staff step through them, and a visitor's choice is remembered.
 *
 * All must be public domain. Most are traditional 2/4 dance tunes, written in 4/4 with every
 * length doubled; a 4/4 tune with L:1/4 is written as it is. score.ts turns them into scores and
 * stops the build on anything it can't write. Allowed: notes A–G/a–g with ' and , for octaves,
 * lengths like 2, 3, /, /2, rests z (not whole or dotted), accidentals ^ _ =, ties -, broken
 * rhythms like D>E, and spaces to break beams. Each bar must come to four units. No triplets or
 * grace notes, and every tune must end its eighth bar on a cadence, since the footer closes on a
 * final barline.
 *
 * `chords` are written above the staffs where they change and played as backing when it's switched
 * on. Use chords published with a matching setting; where none exist, only harmony the melody
 * spells out plainly, and say so in `chordSource`.
 */
export const tunes: Tune[] = [
  {
    name: "The Rakes of Mallow",
    source: "https://thesession.org/tunes/85",
    key: "G",
    abc: `GB GB | GB c/B/A/G/ | FA FA | FA B/A/G/F/ | GB GB | GB d2 | c/B/A/G/ F/G/A/c/ | BG G2`,
    chords: `G | | D | | G | | Am D | G`,
    chordSource: `thesession.org/tunes/85, setting 47155, whose melody matches this one note for note`,
  },
  {
    name: "Scotland the Brave",
    source: "https://thesession.org/tunes/4960",
    key: "D",
    abc: `D2 D>E | FD FA | d2 d>^c | dA FD | G2 B>G | FA FD | E2 D>C | D4`,
    chords: `D | | D G | D D7 | G | D Bm | E7 A7 | D`,
    chordSource: `thesession.org/tunes/4960, setting 53645 in C, melody and chords both transposed up a tone to D`,
  },
  {
    name: "Georgia on My Mind",
    source:
      "https://abcnotation.com/tunePage?a=github.com/ian-hayden/abc-music-files/abc-music-files-main.zip/abc-music-files-main/Jazz%20songs/Georgia%20on%20my%20Mind.no-ext/0000",
    key: "F",
    feel: "ballad",
    abc: `A c3 | A G3 | z A d A | F3 F/G/ | A c e d | B D A A | F4- | F2 z2`,
    chords: `Fmaj7 | Em7 A7@2 | Dm7 Dm7/C@4 | Bm7 | Am7 D7@3 | Gm7 C7@3 | Fmaj7 | `,
    chordSource: `the same lead sheet (Ian Hayden's collection on abcnotation.com), bars 25-32 as written, except the last bar's Gm7–C7, a turnaround back to the top, which is left out so the excerpt ends on F`,
  },
  {
    name: "Radetzky March",
    source: "https://www.flutetunes.com/tunes.php?id=364",
    key: "D",
    abc: `F F/^E/ F F/^E/ | F E D F/^E/ | F F/^E/ F F/^E/ | F B A A/F/ | ^G f e2 | z e d2 | c3/B/ A/G/F/E/ | D D D z`,
    chords: `D | | | | E A7@3 | D | A7/G A7@3 | D`,
    chordSource: `the harmony of 8notes.com's piano duet arrangement (in C), transposed up a tone: D under the opening bars, E then A7 under G sharp–F sharp–E, D under E–D, A7 over G in the bass then A7 under the run down, and D`,
  },
];

export const work = [
  {
    role: "Co-Founder",
    org: "Scorewright",
    orgHref: "https://scorewright.com",
    when: "2025 - now",
    where: "Remote",
    body: `
      A real-time collaborative sheet music editor for the web. It features a performant notation
      renderer built from scratch, synced audio playback, and a collaboration engine using
      Operational Transformation that preserves user intent.
    `,
    stack: [
      "React",
      "TypeScript",
      "Bun",
      "tRPC",
      "Prisma",
      "PostgreSQL",
      "WebSockets",
      "AWS",
      "Stripe",
    ],
  },
  {
    role: "Full Stack Developer",
    org: "OpenText",
    orgHref: "https://www.opentext.com/products/saas/core-software-delivery-platform",
    when: "2021 - 2025",
    where: "Yehud, IL · formerly Micro Focus / HPE",
    body: `
      Joined platform team working on OpenText Core Software Delivery Platform (ValueEdge / ALM Octane).
      I owned the tooling devs and CI use to run SaaS environments locally enabling db multitenancy and
      cloud license provisioning on local machines. Lead 10s of large features across the stack and was a point-person for UI design and development.
    `,
    stack: [
      "Java",
      "Spring",
      "PostgreSQL",
      "Angular",
      "React",
      "TypeScript",
      "Hazelcast",
      "Elasticsearch",
    ],
  },
  {
    role: "Full Stack Developer",
    org: "Mapsted",
    orgHref: "https://mapsted.com/",
    when: "2020 - 2021",
    where: "Toronto, ON",
    body: `
      Built the SPAs making up client-facing platform for a suite of GIS solutions, and the
      data integrations connecting it to enterprise customers.
    `,
    stack: ["React", ".NET Core", "Node.js", "MongoDB", "SQL Server"],
  },
];

export const projects = [
  {
    name: "Scorewright",
    href: "https://scorewright.com",
    meta: "React · TS",
    body: `
      Collaborative music notation editor and renderer, built from scratch, SMuFL compliant.
      With Jonah Dlin.
    `,
  },
  {
    name: "Perms DSL",
    meta: "TypeScript · LSP",
    body: "A domain-specific language and language server generating type-safe code for user permissions. Built and used by Scorewright.",
  },
  {
    name: "Algorithmics Animation Workshop",
    href: "https://www.eecs.yorku.ca/~aaw/",
    meta: "d3.js · TS",
    body: `
      A platform for building visualizations of algorithms and data structures for teaching,
      hosted by York University's EECS department. With [Jay Karon](https://jaykaron.github.io/).
    `,
  },
  {
    name: "MyMusic",
    meta: "C# · WinUI 3",
    body: `
      Windows desktop app for managing songs on a USB or MP3 player. Search, preview and
      download straight to the device.
    `,
  },
  {
    name: "Othello",
    href: "/Othello/menu.html",
    meta: "JavaScript",
    body: "Playable in the browser - offline against the computer, or online P2P against a friend.",
  },
  {
    name: "Turmite Sim",
    href: "/Turmite%20Sim/sim.html",
    meta: "JavaScript",
    body: "Two-dimensional Turing machines that leave surprisingly intricate trails on a grid.",
  },
  {
    name: "Steam Game Analytics",
    href: "https://github.com/arules15/EECS4415Project2019",
    meta: "Python · Spark",
    body: `
      Time-series gaming analytics from the Steam Store, YouTube and PC Gamer.
      For a Big Data Systems course at York University.
    `,
  },
  {
    name: "Hoodie",
    href: "https://jaykaron.github.io/Hoodie/",
    meta: "ArcGIS",
    body: `
      Spatial analysis for apartment hunting: find a rental by what surrounds it.
      Built for the ESRI App Challenge.
    `,
  },
];

export const education = {
  school: "York University",
  detail: "— Lassonde School of Engineering",
  qualification: "Honours BSc, Computer Science",
  when: "2016 - 2020",
};

export const labels = {
  work: "Work",
  projects: "Projects",
  education: "Education",
  contact: "Contact",
  skipToContent: "Skip to content",
  themeToggle: "Switch colour theme",
  resume: "Resume",
  source: "Source",
  /** Read aloud for the handwritten staffs, which play their tune when clicked. {tune} is its name. */
  playExcerpt: "Play {tune}",
  stopExcerpt: "Stop playing",
  /** The dots before the masthead staff that switch tunes. */
  nextTune: "Switch tune, now {tune}",
  /** The small button beside those dots that turns the guitar backing on and off. */
  backingChords: "Backing chords",
};

export const contact = {
  /**
   * Web3Forms access key. It is designed to sit in public HTML — what stops abuse is
   * restricting it to nadavhames.com under Settings in the Web3Forms dashboard.
   */
  accessKey: "fcdb61d5-a7c3-4712-9b4b-278151aacc50",
  /** Subject line of the email you receive. */
  subject: "New message from nadavhames.com",
  intro: `
    Send me a note and I'll get back to you by email.
  `,
  fields: {
    name: "Name",
    email: "Email",
    message: "Message",
  },
  send: "Send message",
  sending: "Sending…",
  sent: "Thanks - your message is on its way.",
  error: "That didn't go through. Try again, or email me at nddhames@gmail.com.",
};

export const peek = {
  loading: "Loading preview",
  /** Rendered one line per entry. */
  error: ["Preview unavailable —", "click to open the PDF"],
  fallbackCount: "PDF",
  open: "Open ↗",
};

export const notFound = {
  title: "Not found — Nadav Hames",
  code: "404",
  heading: "Oops",
  blurb: "There's nothing at this address.",
  links: [
    { label: "Home", href: "/" },
    { label: "Resume", href: site.resume },
    { label: "Email", href: "mailto:nddhames@gmail.com" },
  ],
  /** The easter egg: press the 404. {score} is filled in with the rounds cleared. */
  game: {
    /** Not shown — it names the game for screen readers. */
    title: "Echo",
    start: "Play",
    again: "Again",
    listen: "Listen…",
    yourTurn: "Your turn",
    over: "Missed a note. Score: {score}.",
    newBest: "New best score: {score}!",
    best: "Best",
  },
};

/**
 * The Othello and Turmite Sim pages. Words their scripts write or compare against
 * (Start/Stop, the preset names, win messages) live in those scripts instead.
 */
export const games = {
  backToProjects: "Projects",
  othello: {
    title: "Othello",
    blurb: "The classic board game of flipping discs, in the browser.",
    modes: [
      {
        label: "One screen",
        note: "Two players take turns on this device.",
        href: "/Othello/offline/othello.html",
      },
      {
        label: "Two screens",
        note: "Play a friend on their own device, peer to peer.",
        href: "/Othello/online/othello.html",
      },
    ],
    offlineBlurb: "One screen: black moves first, then pass the device back and forth.",
    onlineBlurb: "Two screens: one player hosts and sends an invite, the other joins with it.",
    newGame: "New game",
    unavailable: `
      Online play isn't available in this browser right now. Try
      [one screen](/Othello/offline/othello.html) instead.
    `,
    /** Placeholders in braces are filled in by Othello/online/game.js. */
    online: {
      host: "Host",
      join: "Join",
      codeLabel: "Game code",
      connect: "Connect",
      copyLink: "Copy invite link",
      copied: "Copied",
      connecting: "Connecting…",
      invite: "Send your opponent the invite link, or this code to enter under Join.",
      joining: "Joining game {code}…",
      youPlay: "You play {colour}.",
      black: "black",
      white: "white",
      yourTurn: "Your turn",
      theirTurn: "Their turn",
      youPass: "You have no moves, so your turn is skipped.",
      theyPass: "Your opponent has no moves. Go again.",
      win: "You win, {you} to {them}.",
      lose: "You lose, {you} to {them}.",
      tie: "It's a tie, {you} all.",
      rematch: "Rematch",
      rematchSent: "Waiting for your opponent to accept…",
      rematchOffered: "Your opponent wants a rematch.",
      left: "Your opponent left the game.",
      away: "Lost contact with your opponent. Waiting for them to come back…",
      startOver: "Start over",
      notFound: "No game found with that code. Check it and try again.",
      serverDown: "Couldn't reach the connection server. Try again in a moment.",
      failed: "The connection failed. Start over and try again.",
    },
  },
  turmite: {
    title: "Turmite Sim",
    blurb: "Two-dimensional Turing machines that leave surprisingly intricate trails on a grid.",
    clear: "Clear",
    preset: "Preset",
    speed: "ms / move",
    onWhite: "On white",
    onBlack: "On black",
    addState: "Add a state",
    removeState: "Remove the last state",
    notes: [
      {
        heading: "About",
        paragraphs: [
          `
            After learning about models of computation, Turing machines included, in EECS 2001 at
            York University, I wanted to build something visually interesting that shows some of
            the course's ideas at work.
          `,
          `
            Try the presets, or write your own rules. More on turmites at
            [Wikipedia](https://en.wikipedia.org/wiki/Turmite) and in
            [Vincent Verheyen's notes](https://web.archive.org/web/20161023060939/http://vincentverheyen.com/node/40).
          `,
        ],
      },
      {
        heading: "Guide",
        paragraphs: [
          `
            Each step, the turmite paints the square it stands on, turns, and moves forward one
            square. What it does depends on its current state and the colour beneath it.
          `,
          `
            Every state has a rule for a white square and one for a black square: the colour to
            paint (B or W), the turn (L left, R right, N none, U about-face) and the state to
            switch to next.
          `,
        ],
      },
    ],
  },
};
