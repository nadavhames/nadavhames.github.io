/**
 * Renders every HTML page on the site from content.ts.
 *
 * Preact is a build-time dependency only: the output is plain static HTML and no
 * framework code reaches the browser. Everything interpolated into JSX is escaped
 * by the renderer — dangerouslySetInnerHTML, used twice below for inline <script>
 * source, is the only way raw markup can get out.
 */

import { join } from "node:path";
import type { ComponentChildren, VNode } from "preact";
import { render } from "preact-render-to-string";

import {
  site,
  analytics,
  masthead,
  work,
  projects,
  education,
  contact,
  labels,
  peek,
  notFound,
  marginalia,
  games,
  tunes,
} from "./content";
import { handwriting, parts, arcs, beams, letters } from "./handwriting";
import { scoresFor } from "./score";

/* ---------- prose -------------------------------------------------------- */

/** A mailto: hands off to the mail client, so a new tab would just be left behind. */
function opensNewTab(href: string): boolean {
  return /^https?:/i.test(href) || /\.pdf$/i.test(href);
}

function eventFor(href: string): string | undefined {
  if (/^\/?#/.test(href)) return undefined;
  if (/\.pdf$/i.test(href)) return "resume-open";
  if (/^mailto:/i.test(href)) return "email-click";
  if (/^https?:/i.test(href)) return "outbound-click";
  if (href !== "/") return "project-click";
  return undefined;
}

/** `where` records which part of the page the click came from. */
function Link({
  href,
  where,
  class: className,
  children,
}: {
  href: string;
  where?: string;
  class?: string;
  children: ComponentChildren;
}) {
  const newTab = opensNewTab(href);
  const event = eventFor(href);
  return (
    <a
      class={className}
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener" : undefined}
      data-umami-event={event}
      data-umami-event-url={event && href}
      data-umami-event-location={event && where}
    >
      {children}
    </a>
  );
}

/**
 * Fold the line breaks of a wrapped template literal back into single spaces.
 * Without this they reach the markup: harmless in a paragraph, wrong inside an
 * attribute, and awkward when the text is copied or read aloud.
 */
function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*([^*]+)\*/g;

/**
 * Nodes rather than an HTML string is what keeps escaping automatic: anything
 * that isn't [label](href) or *emphasis* stays text.
 */
function prose(source: string, where?: string): ComponentChildren {
  const value = collapse(source);
  const out: ComponentChildren[] = [];
  let last = 0;

  for (const match of value.matchAll(INLINE)) {
    const at = match.index;
    if (at > last) out.push(value.slice(last, at));

    const [, label, href, emphasis] = match;
    if (label !== undefined && href !== undefined) {
      out.push(
        <Link href={href} where={where}>
          {label}
        </Link>,
      );
    } else if (emphasis !== undefined) {
      out.push(<em>{emphasis}</em>);
    }
    last = at + match[0].length;
  }

  if (last < value.length) out.push(value.slice(last));
  return out;
}

/* ---------- shared chrome ------------------------------------------------ */

const BOOT = `
(function () {
    document.documentElement.classList.add('js');
    try {
        var s = localStorage.getItem('theme');
        if (s === 'light' || s === 'dark') document.documentElement.setAttribute('data-theme', s);
    } catch (e) {}

    // Umami skips any browser with this key set. Visit /?notrack once on each of
    // your own browsers so your visits aren't counted; /?track undoes it.
    try {
        var params = new URLSearchParams(location.search);
        if (params.has('notrack')) localStorage.setItem('umami.disabled', '1');
        if (params.has('track')) localStorage.removeItem('umami.disabled');
    } catch (e) {}

    // Start a refresh at the top, leaving back/forward restoration alone. This
    // must stay 'manual' for the life of the page: setting it back to 'auto'
    // re-arms restoration, which then undoes the scroll.
    try {
        var nav = performance.getEntriesByType('navigation')[0];
        if (nav && nav.type === 'reload' && 'scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
            addEventListener('load', function () { scrollTo(0, 0); });
        }
    } catch (e) {}
})();
`.trim();

const YEAR = `
// Set at view time, not build time, so the same content.ts always renders the
// same bytes. Without JS the line reads "© Nadav Hames".
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('year').textContent = ' ' + new Date().getFullYear();
});
`.trim();

const FONTS =
  // Inter's optical-size axis sturdies small text and tightens large text automatically.
  "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..600" +
  "&family=Newsreader:ital,opsz,wght@0,6..72,300..500;1,6..72,300..400" +
  "&family=JetBrains+Mono:wght@400&display=swap";

function Head({ title, children }: { title: string; children?: ComponentChildren }) {
  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      {children}
      {/* Keep in step with --bg in assets/site.css. */}
      <meta name="theme-color" content="#16171a" media="(prefers-color-scheme: dark)" />
      <meta name="theme-color" content="#fafaf8" media="(prefers-color-scheme: light)" />

      <link rel="icon" href="/favicon.ico" sizes="any" />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONTS} />
      <link rel="stylesheet" href="/assets/site.css" />

      {/* Raw on purpose: escaping would break the JS. */}
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      {analytics.umamiWebsiteId && (
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id={analytics.umamiWebsiteId}
          data-domains={analytics.domains.join(",")}
        />
      )}
    </head>
  );
}

function ThemeToggle() {
  return (
    <button class="theme-toggle" type="button" aria-label={labels.themeToggle}>
      <svg
        class="icon-sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
      </svg>
      <svg
        class="icon-moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20.5 14.3A8.6 8.6 0 1 1 9.7 3.5a6.9 6.9 0 0 0 10.8 10.8z" />
      </svg>
    </button>
  );
}

function ResumePeek() {
  return (
    <span class="peek" data-resume-peek="">
      <a
        class="is-cta"
        href={site.resume}
        target="_blank"
        rel="noopener"
        data-peek-link=""
        data-umami-event="resume-open"
        data-umami-event-url={site.resume}
        data-umami-event-location="header"
      >
        {labels.resume}
      </a>
      <a
        class="peek__card"
        href={site.resume}
        target="_blank"
        rel="noopener"
        tabindex={-1}
        aria-hidden="true"
        data-umami-event="resume-open"
        data-umami-event-url={site.resume}
        data-umami-event-location="header-preview"
      >
        <span class="peek__frame">
          <canvas data-peek-canvas="" />
          <span class="peek__state">
            <span class="peek__spinner" />
            <span class="wait">{peek.loading}</span>
            <span class="err">
              {peek.error.map((line, i) => (
                <>
                  {i > 0 && <br />}
                  {line}
                </>
              ))}
            </span>
          </span>
        </span>
        <span class="peek__foot">
          <span data-peek-count="">{peek.fallbackCount}</span>
          <span class="open">{peek.open}</span>
        </span>
      </a>
    </span>
  );
}

/** Glides to the form on the home page; from the 404 it simply navigates there. */
function ContactNav() {
  return (
    <a href="/#contact" data-scroll-to="contact" data-umami-event="contact-nav">
      {labels.contact}
    </a>
  );
}

function TopBar({ children }: { children: ComponentChildren }) {
  return (
    <header class="topbar">
      <div class="shell topbar__inner">
        <a class="mark" href="/">
          {masthead.name}
        </a>
        <nav class="nav" aria-label="Primary">
          {children}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function Footer({ children, score }: { children: ComponentChildren; score?: boolean }) {
  return (
    <footer class="footer shell">
      <div class={score ? "footer__inner footer__inner--staff" : "footer__inner"}>
        {score && <StaffWriting score="footer" start="view" class="staff-writing" />}
        <span>
          &copy;
          <span id="year" /> {masthead.name}
        </span>
        <span>{children}</span>
      </div>
    </footer>
  );
}

function Scripts({ home, notFound: isNotFound }: { home?: boolean; notFound?: boolean }) {
  return (
    <>
      <script src="/assets/theme.js" defer />
      <script src="/assets/marginalia.js" defer />
      <script dangerouslySetInnerHTML={{ __html: YEAR }} />
      {home && <script src="/assets/resume-peek.js" defer />}
      {home && <script src="/assets/contact.js" defer />}
      {home && <script src="/assets/staff-writing.js" defer />}
      {isNotFound && <script src="/assets/echo.js" defer />}
    </>
  );
}

/* ---------- margin symbols ----------------------------------------------- */

/** Seeded, so every build renders identical HTML. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Size, opacity and speed all follow from one depth value, which is what makes
 *  the field read as depth rather than clutter. */
function MarginSide({ side, rand }: { side: "left" | "right"; rand: () => number }) {
  const symbols = [];
  for (let i = 0; i < marginalia.perSide; i++) {
    const depth = rand();
    const size = (0.95 + depth * 1.95).toFixed(2);
    const speed = (0.1 + depth * 0.34).toFixed(3);
    const peakOpacity = (0.13 + depth * 0.17).toFixed(3);
    // One band per symbol so the field reaches both edges. `left` is the glyph's
    // centre; the stylesheet pulls it back by half its own width.
    const band = (i + 0.5 + (rand() - 0.5) * 0.8) / marginalia.perSide;
    const x = Math.round(4 + band * 92);
    const y = Math.round(rand() * 100);
    const rot = Math.round(-14 + rand() * 28);
    const glyph =
      marginalia.symbols[(i * 3 + (side === "right" ? 2 : 0)) % marginalia.symbols.length];
    symbols.push(
      <span
        key={i}
        style={`--x:${x}%;--y:${y};--size:${size}rem;--speed:${speed};--peak:${peakOpacity};--rot:${rot}deg`}
      >
        {glyph}
      </span>,
    );
  }
  return <div class={`marginalia__side marginalia__side--${side}`}>{symbols}</div>;
}

function Marginalia() {
  const rand = seeded(20260915);
  return (
    <div class="marginalia" aria-hidden="true">
      <MarginSide side="left" rand={rand} />
      <MarginSide side="right" rand={rand} />
    </div>
  );
}

/* ---------- handwritten staffs ------------------------------------------- */

const HANDWRITING_CREDIT = `Handwritten music by one musician from the HOMUS dataset (Calvo-Zaragoza
  and Oncina, ICPR 2014) and lettering by one writer from UJI Pen Characters v2 (Llorens et al.,
  LREC 2008, CC BY 4.0), replayed stroke by stroke.`;

/**
 * A staff's writing surface; assets/staff-writing.js fills it with the score named by `score`.
 * `start` is when the pen begins: as the page loads, or once the staff scrolls into view.
 */
function StaffWriting({
  score,
  start,
  class: className,
  delay,
}: {
  score: "masthead" | "footer";
  start: "load" | "view";
  class: string;
  delay?: number;
}) {
  return (
    <svg
      class={`${className} ink`}
      aria-hidden="true"
      data-staff-writing={score}
      data-start={start}
      data-delay={delay}
      data-play-label={labels.playExcerpt}
      data-stop-label={labels.stopExcerpt}
    >
      <desc>{collapse(HANDWRITING_CREDIT)}</desc>
    </svg>
  );
}

/** Every tune, as the two scores the staffs write. The first is shown until a visitor switches. */
const scoredTunes = tunes.map((tune) => ({
  name: tune.name,
  feel: tune.feel ?? "polka",
  ...scoresFor(tune),
}));

/**
 * The small dots before the masthead staff: one per tune, the current one filled. A button, not a
 * menu — each press moves to the next tune (assets/staff-writing.js).
 */
function TuneSwitch() {
  const first = tunes[0]!.name;
  return (
    <div class="staff-controls">
      <button
        class="tune-switch"
        type="button"
        data-tune-switch=""
        data-label={labels.nextTune}
        aria-label={labels.nextTune.replace("{tune}", first)}
        title={first}
      >
        {tunes.map((_, i) => (
          <span class={i === 0 ? "is-current" : undefined} />
        ))}
      </button>
      {/* Three stacked dots, like a chord; filled while the guitar backing is on. */}
      <button
        class="chords-switch"
        type="button"
        data-chords-switch=""
        aria-pressed="true"
        aria-label={labels.backingChords}
        title={labels.backingChords}
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  );
}

/**
 * Everything assets/staff-writing.js needs: the scores and the strokes they draw from. JSON can't
 * be escaped as HTML, so "<" is written as < instead, which keeps "</script>" in any string
 * from closing the tag.
 */
function staffWritingData(): string {
  const all = scoredTunes.flatMap((t) => [...t.masthead, ...t.footer]);
  const letterSet = new Set(
    all
      .flatMap((e) => ("text" in e ? [...e.text] : "chord" in e ? [...e.chord] : []))
      .filter((c) => letters[c]),
  );
  const noteKinds = [
    "quarter-up",
    "quarter-down",
    "half-up",
    "half-down",
    "eighth-up",
    "eighth-down",
  ] as const;
  return JSON.stringify({
    tunes: scoredTunes,
    notes: Object.fromEntries(noteKinds.map((k) => [k, handwriting[k]])),
    parts,
    time: handwriting["time-4-4"],
    arcs,
    beams,
    letters: Object.fromEntries([...letterSet].map((c) => [c, letters[c]])),
  }).replace(/</g, "\\u003c");
}

function StaffWritingData() {
  return (
    /* Raw on purpose: it is JSON, not markup, and staffWritingData escapes "<". */
    <script
      type="application/json"
      id="staff-writing-data"
      dangerouslySetInnerHTML={{ __html: staffWritingData() }}
    />
  );
}

/* ---------- home --------------------------------------------------------- */

function Band({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: ComponentChildren;
}) {
  return (
    <section class="band shell" id={id}>
      <div class="band__grid">
        <h2 class="band__label">{label}</h2>
        <div>{children}</div>
      </div>
    </section>
  );
}

function WorkEntry({ job }: { job: (typeof work)[number] }) {
  return (
    <article class="entry">
      <div class="entry__head">
        <h3 class="entry__what">
          {job.role} <span class="at">at</span>{" "}
          {job.orgHref ? (
            <Link href={job.orgHref} where="work">
              {job.org}
            </Link>
          ) : (
            job.org
          )}
        </h3>
        <span class="entry__when">{job.when}</span>
      </div>
      <div class="entry__where">{job.where}</div>
      <p class="entry__body">{prose(job.body, "work")}</p>
      <p class="stack">
        {job.stack.map((item, i) => (
          <>
            {i > 0 && " · "}
            <b>{item}</b>
          </>
        ))}
      </p>
    </article>
  );
}

function ProjectEntry({ project }: { project: (typeof projects)[number] }) {
  const name = (
    <>
      {project.name}
      <span class="ext">↗</span>
    </>
  );
  return (
    <article class="project">
      <h3 class="project__name">
        {project.href ? (
          <Link href={project.href} where="projects">
            {name}
          </Link>
        ) : (
          project.name
        )}
      </h3>
      <span class="project__meta">{project.meta}</span>
      <p class="project__body">{prose(project.body, "projects")}</p>
    </article>
  );
}

/**
 * A plain POST to Web3Forms, so it still works with JavaScript off (landing on their
 * confirmation page). assets/contact.js upgrades it to send inline; the status copy
 * rides along as data attributes so every word stays in content.ts.
 */
function ContactForm() {
  return (
    <form
      class="contact-form"
      action="https://api.web3forms.com/submit"
      method="post"
      data-contact-form=""
      data-sending={contact.sending}
      data-sent={contact.sent}
      data-error={contact.error}
    >
      <input type="hidden" name="access_key" value={contact.accessKey} />
      <input type="hidden" name="subject" value={contact.subject} />
      <input type="hidden" name="from_name" value={masthead.name} />
      {/* Honeypot: Web3Forms rejects any submission where this is checked. */}
      <input
        type="checkbox"
        name="botcheck"
        class="contact-form__trap"
        tabindex={-1}
        autocomplete="off"
        aria-hidden="true"
      />

      <p class="contact-form__intro">{prose(contact.intro, "contact")}</p>

      <div class="contact-form__row">
        <label class="field">
          <span class="field__label">{contact.fields.name}</span>
          <input
            class="field__input"
            type="text"
            name="name"
            autocomplete="name"
            maxLength={120}
            required
          />
        </label>
        <label class="field">
          <span class="field__label">{contact.fields.email}</span>
          <input
            class="field__input"
            type="email"
            name="email"
            autocomplete="email"
            maxLength={200}
            required
          />
        </label>
      </div>

      <label class="field">
        <span class="field__label">{contact.fields.message}</span>
        <textarea
          class="field__input field__input--area"
          name="message"
          rows={5}
          maxLength={5000}
          required
        />
      </label>

      <div class="contact-form__foot">
        <button class="contact-form__send" type="submit">
          <span data-contact-label="">{contact.send}</span>
          <span class="contact-form__arrow" aria-hidden="true">
            →
          </span>
        </button>
        <p class="contact-form__status" role="status" aria-live="polite" data-contact-status="" />
      </div>
    </form>
  );
}

function HomePage() {
  return (
    <html lang="en">
      <Head title={collapse(site.title)}>
        <meta name="description" content={collapse(site.description)} />
        <meta name="author" content={site.author} />
        <link rel="canonical" href={site.url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={collapse(site.title)} />
        <meta property="og:description" content={collapse(site.shortDescription)} />
        <meta property="og:url" content={site.url} />
        <meta name="twitter:card" content="summary" />
      </Head>

      <body>
        <a class="skip-link" href="#main">
          {labels.skipToContent}
        </a>

        <Marginalia />

        <TopBar>
          <ContactNav />
          <ResumePeek />
        </TopBar>

        <main id="main">
          <section class="masthead">
            <div class="shell">
              <h1 class="masthead__name">{masthead.name}</h1>
              <p class="masthead__role">{prose(masthead.role)}</p>
              <p class="masthead__lead">{prose(masthead.lead, "intro")}</p>
              <p class="contacts">
                {masthead.contacts.map((contact, i) => (
                  <>
                    {i > 0 && (
                      <>
                        {" "}
                        <span class="sep">/</span>{" "}
                      </>
                    )}
                    <Link href={contact.href} where="contacts">
                      {contact.label}
                    </Link>
                  </>
                ))}
              </p>
              <StaffWriting score="masthead" start="load" class="handwriting" delay={0.8} />
              <TuneSwitch />
            </div>
          </section>

          <Band id="work" label={labels.work}>
            {work.map((job) => (
              <WorkEntry job={job} />
            ))}
          </Band>

          <Band id="projects" label={labels.projects}>
            {projects.map((project) => (
              <ProjectEntry project={project} />
            ))}
          </Band>

          <Band label={labels.education}>
            <div class="entry__head">
              <h3 class="entry__what">
                {education.school} <span class="at">{education.detail}</span>
              </h3>
              <span class="entry__when">{education.when}</span>
            </div>
            <div class="entry__where">{education.qualification}</div>
          </Band>

          <Band id="contact" label={labels.contact}>
            <ContactForm />
          </Band>
        </main>

        <Footer score>
          <Link href={site.sourceRepo} where="footer">
            {labels.source}
          </Link>
        </Footer>

        <StaffWritingData />
        <Scripts home />
      </body>
    </html>
  );
}

/* ---------- 404 ---------------------------------------------------------- */

const ECHO_PADS = 5;

/**
 * One wedge of the ring, in a 200×200 viewBox. The gap is constant-width rather than
 * a fixed angle, so the spacing between wedges doesn't fan out towards the rim; the
 * round stroke in the stylesheet then softens the corners and eats half of it.
 */
function echoPad(i: number) {
  const centre = 100;
  const outer = 92;
  const inner = 50;
  const gap = 12;
  const span = (2 * Math.PI) / ECHO_PADS;
  const from = -Math.PI / 2 - span / 2 + i * span;
  const to = from + span;
  const trimOuter = Math.asin(gap / 2 / outer);
  const trimInner = Math.asin(gap / 2 / inner);
  const at = (r: number, angle: number) =>
    `${(centre + r * Math.cos(angle)).toFixed(2)} ${(centre + r * Math.sin(angle)).toFixed(2)}`;

  const mid = from + span / 2;
  return {
    d: [
      `M ${at(outer, from + trimOuter)}`,
      `A ${outer} ${outer} 0 0 1 ${at(outer, to - trimOuter)}`,
      `L ${at(inner, to - trimInner)}`,
      `A ${inner} ${inner} 0 0 0 ${at(inner, from + trimInner)}`,
      "Z",
    ].join(" "),
    // Direction a lit wedge nudges in: straight out from the centre.
    dx: Math.cos(mid).toFixed(3),
    dy: Math.sin(mid).toFixed(3),
  };
}

/** Hidden until the 404 is pressed; assets/echo.js runs it. Copy rides along as data attributes. */
function Echo() {
  const game = notFound.game;
  return (
    <section
      class="echo"
      id="echo"
      hidden
      aria-label={game.title}
      data-echo=""
      data-listen={game.listen}
      data-your-turn={game.yourTurn}
      data-over={game.over}
      data-new-best={game.newBest}
      data-again={game.again}
    >
      <p class="echo__best">
        {game.best} <b data-echo-best="">0</b>
      </p>

      <div class="echo__stage">
        <svg class="echo__ring" viewBox="0 0 200 200">
          {Array.from({ length: ECHO_PADS }, (_, i) => {
            const pad = echoPad(i);
            return (
              <path
                class="echo__pad"
                d={pad.d}
                role="button"
                tabindex={-1}
                aria-disabled="true"
                aria-label={`Note ${i + 1}`}
                data-echo-pad={String(i)}
                style={`--i:${i};--hue:var(--echo-${i + 1});--dx:${pad.dx};--dy:${pad.dy}`}
              />
            );
          })}
        </svg>
        <div class="echo__hub">
          <button class="echo__start" type="button" data-echo-start="">
            {game.start}
          </button>
          <span class="echo__round" data-echo-round="" hidden>
            0
          </span>
        </div>
      </div>

      <p class="echo__status" role="status" aria-live="polite" data-echo-status="" />
    </section>
  );
}

function NotFoundPage() {
  return (
    <html lang="en">
      <Head title={collapse(notFound.title)}>
        <meta name="robots" content="noindex" />
      </Head>

      <body>
        <Marginalia />

        <TopBar>
          <ContactNav />
          <Link class="is-cta" href={site.resume} where="404-header">
            {labels.resume}
          </Link>
        </TopBar>

        <main class="notfound">
          <div class="shell">
            <button
              class="notfound__code"
              type="button"
              data-echo-open=""
              aria-controls="echo"
              aria-expanded="false"
            >
              {notFound.code}
            </button>
            <h1 class="notfound__rest">{notFound.heading}</h1>
            <p class="notfound__blurb">{prose(notFound.blurb)}</p>
            <p class="notfound__links">
              {notFound.links.map((link, i) => (
                <>
                  {i > 0 && (
                    <>
                      {" "}
                      <span class="sep">/</span>{" "}
                    </>
                  )}
                  <Link href={link.href} where="404">
                    {link.label}
                  </Link>
                </>
              ))}
            </p>
            <Echo />
          </div>
        </main>

        <Footer>
          <a href="/">Home</a>
        </Footer>

        <Scripts notFound />
      </body>
    </html>
  );
}

/* ---------- Othello and Turmite Sim --------------------------------------- */

const JQUERY = (
  <script
    src="https://code.jquery.com/jquery-3.2.1.min.js"
    integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4="
    crossOrigin="anonymous"
  />
);

/**
 * The games' own scripts ship as they are, hooking into the ids below. Their buttons
 * are wired up at the bottom of each script rather than with inline handlers.
 */
function GamePage({
  title,
  blurb,
  back,
  head,
  scripts,
  children,
}: {
  title: string;
  blurb: string;
  back: { label: string; href: string };
  head?: ComponentChildren;
  scripts: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <html lang="en">
      <Head title={`${title} — ${masthead.name}`}>
        <meta name="description" content={collapse(blurb)} />
        {head}
      </Head>

      <body>
        <Marginalia />

        <TopBar>
          <ContactNav />
          <Link class="is-cta" href={site.resume} where="project-header">
            {labels.resume}
          </Link>
        </TopBar>

        <main class="game">
          <div class="shell">
            <a class="game__back" href={back.href}>
              ← {back.label}
            </a>
            <h1 class="game__title">{title}</h1>
            <p class="game__blurb">{prose(blurb, "project-page")}</p>
            <div class="game__stage">{children}</div>
          </div>
        </main>

        <Footer>
          <a href="/">Home</a>
        </Footer>

        <Scripts />
        {scripts}
      </body>
    </html>
  );
}

const TO_PROJECTS = { label: games.backToProjects, href: "/#projects" };
const TO_OTHELLO = { label: games.othello.title, href: "/Othello/menu.html" };

/** game.js looks cells up by id: column then row, each 1–8. */
function OthelloBoard() {
  const range = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <table id="board" class="othello__board">
      <tbody>
        {range.map((row) => (
          <tr>
            {range.map((col) => (
              <td id={`${col}${row}`} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** game.js paints this cell black or white to show whose move it is. */
function OthelloTurn() {
  return (
    <table id="turntable" class="othello__turn">
      <tbody>
        <tr>
          <td id="turncolor">
            <p id="turn">Turn</p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function OthelloMenuPage() {
  const othello = games.othello;
  return (
    <GamePage title={othello.title} blurb={othello.blurb} back={TO_PROJECTS} scripts={null}>
      <nav class="modes" aria-label={othello.title}>
        {othello.modes.map((mode) => (
          <a class="mode" href={mode.href}>
            <span class="mode__label">
              {mode.label}
              <span class="mode__arrow" aria-hidden="true">
                →
              </span>
            </span>
            <span class="mode__note">{mode.note}</span>
          </a>
        ))}
      </nav>
    </GamePage>
  );
}

function OthelloOfflinePage() {
  const othello = games.othello;
  return (
    <GamePage
      title={othello.title}
      blurb={othello.offlineBlurb}
      back={TO_OTHELLO}
      head={JQUERY}
      scripts={<script src="/Othello/offline/game.js" />}
    >
      <div class="othello">
        <div class="othello__bar">
          <button class="button" id="newgame" type="button">
            {othello.newGame}
          </button>
          <OthelloTurn />
        </div>
        <OthelloBoard />
        <p class="othello__status" id="over" role="status" aria-live="polite" />
      </div>
    </GamePage>
  );
}

/**
 * `fooBar: "…"` → `data-text-foo-bar="…"`. The prefix keeps copy apart from the
 * data-* hooks game.js uses to find its controls.
 */
function textAttributes(copy: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [
      `data-text-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      value,
    ]),
  );
}

/** Othello/online/game.js loads PeerJS itself, so it can fall back to a second CDN. */
function OthelloOnlinePage() {
  const othello = games.othello;
  const copy = othello.online;
  return (
    <GamePage
      title={othello.title}
      blurb={othello.onlineBlurb}
      back={TO_OTHELLO}
      scripts={<script src="/Othello/online/game.js" />}
    >
      <div class="othello-online" data-othello-online="" {...textAttributes(copy)}>
        <section class="othello__lobby" data-lobby="">
          <p class="othello__note" data-unavailable="" hidden>
            {prose(othello.unavailable, "othello")}
          </p>

          <div class="othello__actions" data-choose="">
            <button class="button" type="button" data-host="" disabled>
              {copy.host}
            </button>
            <button class="button button--quiet" type="button" data-join-open="" disabled>
              {copy.join}
            </button>
          </div>

          <div class="othello__invite" data-invite="" hidden>
            <p class="othello__note">{copy.invite}</p>
            <div class="othello__actions">
              <code class="othello__code" data-code="" />
              <button class="button button--quiet" type="button" data-copy="">
                {copy.copyLink}
              </button>
            </div>
          </div>

          <form class="othello__join" data-join-form="" hidden>
            <label class="control">
              <span>{copy.codeLabel}</span>
              <input
                class="control__input othello__code-input"
                name="code"
                required
                autocomplete="off"
                autocapitalize="characters"
                spellcheck={false}
                maxLength={12}
              />
            </label>
            <button class="button" type="submit">
              {copy.connect}
            </button>
          </form>

          <p class="othello__note" data-lobby-status="" role="status" aria-live="polite" />
        </section>

        <section class="othello" data-game="" hidden>
          <div class="othello__bar">
            <OthelloTurn />
            <p class="othello__message" data-you="" />
          </div>
          <OthelloBoard />
          <p class="othello__status" data-status="" role="status" aria-live="polite" />
          <div class="othello__actions">
            <button class="button" type="button" data-rematch="" hidden>
              {copy.rematch}
            </button>
            <a
              class="button button--quiet"
              href="/Othello/online/othello.html"
              data-start-over=""
              hidden
            >
              {copy.startOver}
            </a>
          </div>
        </section>
      </div>
    </GamePage>
  );
}

/** sim.js matches presets by their text, so these names can't be translated or reworded. */
const TURMITE_PRESETS = [
  "Custom",
  "Spiral",
  "Fibonacci",
  "Snowflake",
  "Texture",
  "Frame",
  "Semichaotic",
];

function TurmitePage() {
  const turmite = games.turmite;
  const dir = "/Turmite%20Sim/Styles";
  return (
    <GamePage
      title={turmite.title}
      blurb={turmite.blurb}
      back={TO_PROJECTS}
      head={
        <script
          src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
          integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
          crossOrigin="anonymous"
        />
      }
      scripts={
        <>
          <script src={`${dir}/watch.js`} />
          <script src={`${dir}/canvas-grid.js`} />
          <script src={`${dir}/sim.js`} />
        </>
      }
    >
      <div class="turmite">
        <canvas class="turmite__canvas" id="canvas" width={500} height={500} />

        <div class="turmite__bar">
          <button class="button" id="start" type="button" aria-pressed="false">
            Start
          </button>
          <button class="button button--quiet" id="clear" type="button">
            {turmite.clear}
          </button>
          <label class="control">
            <span>{turmite.preset}</span>
            <select class="control__input" id="inputGroupSelect">
              {TURMITE_PRESETS.map((name, i) => (
                <option value={String(i + 1)} selected={name === "Spiral"}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label class="control">
            <span>{turmite.speed}</span>
            <input
              class="control__input control__input--short"
              id="timeSteps"
              type="text"
              inputMode="numeric"
            />
          </label>
        </div>

        <div class="turmite__rules">
          <div class="turmite__head" aria-hidden="true">
            <span />
            <span>{turmite.onWhite}</span>
            <span>{turmite.onBlack}</span>
          </div>
          {/* sim.js fills this with one row per state. */}
          <div class="turmite__states" id="stateContainer" />
          <div class="turmite__adjust">
            <button
              class="button button--quiet"
              id="add"
              type="button"
              aria-label={turmite.addState}
            >
              +
            </button>
            <button
              class="button button--quiet"
              id="sub"
              type="button"
              aria-label={turmite.removeState}
            >
              −
            </button>
          </div>
        </div>

        <div class="turmite__notes">
          {turmite.notes.map((note) => (
            <section>
              <h2>{note.heading}</h2>
              {note.paragraphs.map((paragraph) => (
                <p>{prose(paragraph, "turmite")}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </GamePage>
  );
}

/* ---------- write -------------------------------------------------------- */

function document(page: VNode): string {
  return `<!DOCTYPE html>\n${render(page)}\n`;
}

/** Deterministic: same content.ts, same bytes — which is what --check relies on. */
function pages(): Array<[string, string]> {
  return [
    ["index.html", document(<HomePage />)],
    ["404.html", document(<NotFoundPage />)],
    ["Othello/menu.html", document(<OthelloMenuPage />)],
    ["Othello/offline/othello.html", document(<OthelloOfflinePage />)],
    ["Othello/online/othello.html", document(<OthelloOnlinePage />)],
    ["Turmite Sim/sim.html", document(<TurmitePage />)],
  ];
}

export async function build(): Promise<string[]> {
  const rendered = pages();
  for (const [name, markup] of rendered) {
    await Bun.write(join(import.meta.dir, name), markup);
  }
  return rendered.map(([name]) => name);
}

export async function check(): Promise<string[]> {
  const stale: string[] = [];
  for (const [name, markup] of pages()) {
    const file = Bun.file(join(import.meta.dir, name));
    const onDisk = (await file.exists()) ? await file.text() : "";
    if (onDisk !== markup) stale.push(name);
  }
  return stale;
}

if (import.meta.main) {
  if (Bun.argv.includes("--check")) {
    const stale = await check();
    if (stale.length) {
      console.error(
        `  ${stale.join(", ")} out of date with content.ts — run \`bun run build\` and commit the result`,
      );
      process.exit(1);
    }
    console.log("  every page matches content.ts");
  } else {
    const written = await build();
    console.log(`  built ${written.join(", ")} from content.ts`);
  }
}
