/**
 * Local dev server with live reload.  bun dev  (or: bun run dev.ts 3000)
 *
 * Saving a .css file swaps the stylesheet in place, keeping scroll position,
 * theme and the rendered résumé preview; anything else reloads the page. The
 * reload snippet is injected on the way out, so files on disk stay as they ship.
 */

import { watch } from "node:fs";
import { join, normalize, extname, sep } from "node:path";

const ROOT = import.meta.dir;
const PORT = Number(Bun.argv[2] ?? 8000);

const IGNORED = /(^|[\\/])(\.git|\.claude|node_modules|\.mise)([\\/]|$)/;
/* Editors save atomically: they write `site.css.tmp.1234.abcd`, rename it over
   the original, and the parent directory fires an event of its own. Watching
   for those names as if they were site files made every stylesheet save look
   like a mixed change and forced a full reload, so only real site files count. */
const SITE_FILE = /\.(html|css|js|tsx?|json|pdf|svg|png|jpe?g|webp|gif|ico|woff2?)$/i;
const SCRATCH = /(\.tmp\.|\.crswap$|\.swp$|~$|^\.#|^\.~)/i;

const SNIPPET = `
<!-- injected by dev.ts; not part of the site -->
<script>
(function () {
    var socket, lost = false;

    function connect() {
        socket = new WebSocket('ws://' + location.host + '/__livereload');

        socket.onmessage = function (event) {
            if (event.data !== 'css') return location.reload();
            document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
                var url = new URL(link.getAttribute('href'), location.href);
                if (url.origin !== location.origin) return;   // leave CDN fonts alone
                url.searchParams.set('__reload', Date.now());
                link.setAttribute('href', url.pathname + url.search);
            });
            console.info('[dev] stylesheets reloaded');
        };

        socket.onopen = function () {
            if (lost) location.reload();   // server came back: pick up what we missed
            lost = false;
        };

        socket.onclose = function () {
            lost = true;
            setTimeout(connect, 500);
        };
    }

    connect();
})();
</script>`.trim();

const sockets = new Set<import("bun").ServerWebSocket<unknown>>();

let pending: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** The rebuilt HTML trips the watcher again, which is what reloads the browser. */
async function rebuild() {
  // A subprocess rather than importing build.ts: a fresh process is the only
  // way to be sure content.ts is re-read rather than served from the module cache.
  const proc = Bun.spawn(["bun", "run", "build.tsx"], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
  ]);
  await proc.exited;
  if (out.trim()) console.log(out.trimEnd());
  if (proc.exitCode !== 0) {
    console.error(`  build failed:\n${err.trimEnd()}`);
  }
}

function onChange(file: string) {
  if (IGNORED.test(file) || SCRATCH.test(file)) return;

  if (/(^|[\\/])(content\.ts|build\.tsx)$/.test(file)) {
    console.log(`  changed: ${file}`);
    void rebuild();
    return;
  }

  if (!SITE_FILE.test(file)) return;
  pending.push(file);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const changed = [...new Set(pending)];
    pending = [];
    if (!changed.length) return;
    for (const f of changed) console.log(`  changed: ${f}`);
    const message = changed.every((f) => f.toLowerCase().endsWith(".css")) ? "css" : "reload";
    for (const socket of sockets) socket.send(message);
  }, 80);
}

await rebuild(); // serve current content even if the last build is stale

watch(ROOT, { recursive: true }, (_event, file) => {
  if (file) onChange(String(file));
});

async function resolve(pathname: string) {
  const decoded = decodeURIComponent(pathname);
  let target = normalize(join(ROOT, decoded));
  // Stay inside the site root; the separator check stops a sibling directory
  // whose name merely starts with the root from matching.
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;

  if (decoded.endsWith("/")) target = join(target, "index.html");
  let file = Bun.file(target);

  if (!(await file.exists())) {
    const asIndex = Bun.file(join(target, "index.html"));
    if (await asIndex.exists()) return { file: asIndex, path: join(target, "index.html") };
    return null;
  }
  return { file, path: target };
}

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  development: true,

  async fetch(request, server) {
    const url = new URL(request.url);

    if (url.pathname === "/__livereload") {
      if (server.upgrade(request)) return undefined;
      return new Response("expected a websocket upgrade", { status: 426 });
    }

    const found = await resolve(url.pathname);

    if (!found) {
      const notFound = Bun.file(join(ROOT, "404.html"));
      if (await notFound.exists()) {
        return html(await notFound.text(), 404);
      }
      return new Response("not found", { status: 404 });
    }

    if (extname(found.path) === ".html") {
      return html(await found.file.text(), 200);
    }

    return new Response(found.file, {
      headers: { "Cache-Control": "no-store" },
    });
  },

  websocket: {
    open(socket) {
      sockets.add(socket);
    },
    close(socket) {
      sockets.delete(socket);
    },
    message() {},
  },
});

function html(markup: string, status: number) {
  const body = markup.includes("</body>")
    ? markup.replace("</body>", `${SNIPPET}\n</body>`)
    : markup + SNIPPET;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

console.log(`
  nadavhames.com - dev server with live reload
  http://localhost:${server.port}

  bun ${Bun.version} - watching ${ROOT} (ctrl-c to stop)
`);
