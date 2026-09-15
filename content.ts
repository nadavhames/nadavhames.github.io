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
 * Scores handwritten onto the two staffs, both in 4/4. Pitch counts staff steps up from the
 * bottom line: 0 is E, 2 is G on the second line, 4 is B on the middle line, 8 is F on the top
 * line; below 0 or above 8 gets ledger lines. Stems point down from the middle line up, as in
 * print; beamed groups and chords take the direction of their average.
 */
export type ScoreEvent =
  | {
      note: "whole" | "half" | "quarter" | "eighth";
      /** One pitch, or several for a chord. */
      pitch: number | number[];
      accidental?: "sharp" | "flat" | "natural";
      /** Joins eighth notes: "start" on the first, "end" on the last. */
      beam?: "start" | "end";
      /** A slur from a "start" note to its "end" note. */
      slur?: "start" | "end";
      /** Tie this note to the next one. */
      tie?: true;
    }
  | { rest: "quarter" | "eighth" }
  | { bar: true }
  /** A handwritten treble clef, for a staff without a printed one. */
  | { clef: "treble" }
  | { time: "4/4" }
  /** Handwritten performance text, written at the next note. Letters a–z and "." only. */
  | { text: string; place: "above" | "below" };

/**
 * Written under the masthead as the page loads, after the printed clef: an opening in 4/4 with
 * stems-down beams, a slur above, flat, natural, eighth rest and a tie within the bar.
 */
export const mastheadScore: ScoreEvent[] = [
  { time: "4/4" },
  { text: "mf", place: "below" },
  { note: "quarter", pitch: 7 },
  { note: "eighth", pitch: 6, beam: "start" },
  { note: "eighth", pitch: 5, beam: "end" },
  { note: "quarter", pitch: 4, accidental: "flat" },
  { rest: "eighth" },
  { note: "eighth", pitch: 3 },
  { bar: true },
  { note: "quarter", pitch: [2, 4, 6] },
  // Under the beamed run, whose stems stay inside the staff, not the chord's long stem.
  { text: "cresc.", place: "below" },
  { note: "eighth", pitch: 8, beam: "start", slur: "start" },
  { note: "eighth", pitch: 7 },
  { note: "eighth", pitch: 6 },
  { note: "eighth", pitch: 5, beam: "end", slur: "end" },
  { note: "quarter", pitch: 4, accidental: "natural" },
  { bar: true },
  { note: "half", pitch: 3, tie: true },
  { note: "quarter", pitch: 3 },
  { note: "quarter", pitch: 5 },
  { bar: true },
];

/**
 * Written onto the footer staff once it scrolls into view. It closes on the footer's final
 * barline, so it is written as an ending: rising stems-up beams under a slur, a sharp, a tie
 * across the barline, chords, and a final chord.
 */
export const footerScore: ScoreEvent[] = [
  { clef: "treble" },
  { text: "p", place: "below" },
  { note: "eighth", pitch: 2, beam: "start", slur: "start" },
  { note: "eighth", pitch: 3 },
  { note: "eighth", pitch: 4 },
  { note: "eighth", pitch: 5, beam: "end", slur: "end" },
  { note: "quarter", pitch: 6 },
  { rest: "quarter" },
  { bar: true },
  { note: "quarter", pitch: 1, accidental: "sharp" },
  { note: "quarter", pitch: 2 },
  { note: "half", pitch: 5, tie: true },
  { bar: true },
  { note: "quarter", pitch: 5 },
  { note: "eighth", pitch: 4, beam: "start" },
  { note: "eighth", pitch: 3, beam: "end" },
  { note: "half", pitch: [0, 2, 4] },
  { bar: true },
  { text: "rit.", place: "above" },
  { note: "whole", pitch: [-2, 0, 2] },
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
