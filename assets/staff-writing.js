/* Writes scores onto the staffs with real pen strokes: the masthead's as the page loads, the
   footer's once it scrolls into view. Laid out here rather than at build time because slurs, ties
   and beams join notes whose positions depend on each staff's width. Stroke data and the scores
   come from build.tsx. */
(function () {
  var SVG = "http://www.w3.org/2000/svg";
  var HALF_SPACE = 2.5;
  var BOTTOM_LINE = 20.5;
  var STEM = 17.5; // three and a half spaces, from the head's centre
  var MIN_STEM = 13;
  var WOBBLE_LENGTH = 12; // px: lines longer than this keep a barline's wobble, not a stretched one
  var CLEF_ROOM = 30; // px kept clear for a handwritten clef
  var TIME_ROOM = 18; // px for a time signature
  var ADVANCE = {
    whole: 3,
    half: 2.3,
    quarter: 1.7,
    eighth: 1.25,
    bar: 0.9,
    accidental: 0.7,
  };
  var PEN = { base: 0.1, perRootPx: 0.045, lift: 0.06, between: 0.18, letter: 0.04 };

  function headY(pitch) {
    return BOTTOM_LINE - pitch * HALF_SPACE;
  }

  function move(strokes, dx, dy) {
    return strokes.map(function (s) {
      var out = [];
      for (var i = 0; i < s.length; i += 2) out.push(s[i] + dx, s[i + 1] + dy);
      return out;
    });
  }

  /** Rotate 180° about the anchor: a stem-up stem becomes a stem-down one. */
  function turn(strokes) {
    return strokes.map(function (s) {
      return s.map(function (v) {
        return -v;
      });
    });
  }

  /** Stretch a stem about its head end so its far end lands `length` px from the head. */
  function stretch(stem, length, up) {
    var ys = [];
    stem.forEach(function (s) {
      for (var i = 1; i < s.length; i += 2) ys.push(s[i]);
    });
    var near = up ? Math.max.apply(null, ys) : Math.min.apply(null, ys);
    var far = up ? Math.min.apply(null, ys) : Math.max.apply(null, ys);
    var target = up ? -length : length;
    var k = (target - near) / (far - near || 1);
    return stem.map(function (s) {
      var out = [];
      for (var i = 0; i < s.length; i += 2) out.push(s[i], near + (s[i + 1] - near) * k);
      return out;
    });
  }

  function tipOf(stem, up) {
    var best = null;
    stem.forEach(function (s) {
      for (var i = 0; i < s.length; i += 2) {
        if (!best || (up ? s[i + 1] < best[1] : s[i + 1] > best[1])) best = [s[i], s[i + 1]];
      }
    });
    return best;
  }

  /** A unit arc stretched between two points, bowing away by `height` (negative bows up). */
  function arcBetween(a, b, height, unit) {
    var out = [];
    for (var i = 0; i < unit.length; i += 2) {
      var u = unit[i];
      out.push(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - unit[i + 1] * height);
    }
    return [out];
  }

  /** A unit line (a sideways barline) stretched between two points. */
  function lineBetween(a, b, unit) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.hypot(dx, dy) || 1;
    var out = [];
    for (var i = 0; i < unit.length; i += 2) {
      // Keep to the endpoints: the source barlines overshoot a little at the pen's exit.
      var t = Math.max(0, Math.min(1, unit[i]));
      // Wobble as it was on a short barline, not magnified along a long beam.
      var w = unit[i + 1] * Math.min(len, WOBBLE_LENGTH);
      out.push(a[0] + dx * t - (dy / len) * w, a[1] + dy * t + (dx / len) * w);
    }
    return [out];
  }

  function strokeLength(stroke) {
    var total = 0;
    for (var i = 2; i < stroke.length; i += 2) {
      total += Math.hypot(stroke[i] - stroke[i - 2], stroke[i + 1] - stroke[i - 1]);
    }
    return total;
  }

  function Staff(svg, events, data) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var startAt = parseFloat(svg.getAttribute("data-delay")) || 0.3;
    var rendered = false;

    // Deterministic variety: each kind of mark cycles through its writer's drawings.
    var turns = {};
    function pick(list, kind) {
      turns[kind] = ((turns[kind] === undefined ? -1 : turns[kind]) + 1) % list.length;
      return list[turns[kind]];
    }

    function text(string, x, place) {
      var baseline = place === "below" ? BOTTOM_LINE + 13 : -6;
      var marks = [];
      for (var i = 0; i < string.length; i++) {
        var variants = data.letters[string[i]];
        if (!variants || !variants.length) {
          x += 3;
          continue;
        }
        var letter = pick(variants, "letter-" + string[i]);
        marks.push({ strokes: move(letter.strokes, x, baseline), gap: PEN.letter });
        x += letter.width + 0.8;
      }
      return marks;
    }

    /**
     * x for each event: spaced by duration, spread to fill the staff. A clef and time signature
     * take fixed room at the start instead, so narrow staffs squeeze the notes, not them.
     */
    function layout(width) {
      var left = 4;
      var fixed = {};
      events.forEach(function (e, i) {
        if (e.clef) {
          fixed[i] = 2;
          left = CLEF_ROOM;
        } else if (e.time) {
          fixed[i] = left + TIME_ROOM / 2 - 2;
          left += TIME_ROOM;
        }
      });
      // A closing barline can sit near the end; a final note needs room before the staff's own.
      var last = events[events.length - 1];
      var right = last && last.bar ? 4 : 26;
      var units = 0;
      var positions = events.map(function (e) {
        if (e.text || e.clef || e.time) return units;
        if (e.accidental) units += ADVANCE.accidental;
        var at = units;
        if (e.bar) {
          at = units - ADVANCE.bar / 3;
          units += ADVANCE.bar;
        } else {
          units += ADVANCE[e.note || e.rest];
        }
        return at;
      });
      var span = Math.max.apply(null, positions) || 1;
      var scale = (width - left - right - 4) / span;
      return positions.map(function (u, i) {
        return i in fixed ? fixed[i] : left + 4 + u * scale;
      });
    }

    function compose(width) {
      turns = {};
      var xs = layout(width);
      var marks = [];
      var pendingText = null;
      var tieFrom = null;
      var slurFrom = null;
      var beam = null;

      /** Short lines for notes below or above the staff, from the staff out to the note. */
      function ledgers(x, low, high) {
        for (var p = -2; p >= low; p -= 2) {
          marks.push({
            strokes: lineBetween([x - 5, headY(p)], [x + 5, headY(p)], pick(data.beams, "ledger")),
            cls: "ledger",
          });
        }
        for (var q = 10; q <= high; q += 2) {
          marks.push({
            strokes: lineBetween([x - 5, headY(q)], [x + 5, headY(q)], pick(data.beams, "ledger")),
            cls: "ledger",
          });
        }
      }

      events.forEach(function (e, i) {
        var x = xs[i];
        if (e.clef) {
          // The clef rises about two spaces above the staff and hangs one below it.
          marks.push({ strokes: move(pick(data.parts["g-clef"], "clef"), 2, -4.5) });
          return;
        }
        if (e.time) {
          marks.push({ strokes: move(pick(data.time, "time"), x, 0) });
          return;
        }
        if (e.text) {
          pendingText = e;
          return;
        }
        if (pendingText) {
          marks = marks.concat(text(pendingText.text, x - 3, pendingText.place));
          pendingText = null;
        }
        if (e.bar) {
          marks.push({ strokes: move(pick(data.parts.barline, "barline"), x, 0) });
          return;
        }
        if (e.rest) {
          marks.push({ strokes: move(pick(data.parts["rest-" + e.rest], "rest"), x, headY(4)) });
          return;
        }

        var pitches = [].concat(e.pitch).sort(function (a, b) {
          return a - b;
        });
        var low = pitches[0];
        var high = pitches[pitches.length - 1];
        var y = headY(low);

        if (e.accidental) {
          marks.push({ strokes: move(pick(data.parts[e.accidental], e.accidental), x - 8, y) });
        }
        ledgers(x, low, high);

        // Beamed notes: stems stretch to meet one beam, drawn once the group is complete.
        if (e.beam === "start") {
          var group = [];
          for (var j = i; j < events.length; j++) {
            if (events[j].note) group.push(j);
            if (events[j].beam === "end") break;
          }
          var sum = group.reduce(function (s, k) {
            return s + [].concat(events[k].pitch)[0];
          }, 0);
          var beamUp = sum / group.length < 4;
          var first = group[0];
          var last = group[group.length - 1];
          var y1 = headY([].concat(events[first].pitch)[0]) + (beamUp ? -STEM : STEM);
          var y2 = headY([].concat(events[last].pitch)[0]) + (beamUp ? -STEM : STEM);
          var slope = Math.max(-0.12, Math.min(0.12, (y2 - y1) / (xs[last] - xs[first] || 1)));
          var shift = 0;
          group.forEach(function (k) {
            var at = y1 + slope * (xs[k] - xs[first]);
            var length = Math.abs(headY([].concat(events[k].pitch)[0]) - at);
            if (length < MIN_STEM) shift = Math.max(shift, MIN_STEM - length);
          });
          beam = {
            up: beamUp,
            x0: xs[first],
            y0: y1 + (beamUp ? -shift : shift),
            slope: slope,
            tips: [],
          };
        }

        var up = beam ? beam.up : (low + high) / 2 < 4;
        var anchorY = up ? headY(low) : headY(high);

        if (e.note === "whole") {
          pitches.forEach(function (p) {
            marks.push({ strokes: move(pick(data.parts.whole, "whole"), x, headY(p)) });
          });
        } else if (pitches.length === 1 && !beam) {
          var kind = e.note + "-" + (up ? "up" : "down");
          marks.push({ strokes: move(pick(data.notes[kind], kind), x, y) });
        } else {
          var headKind = e.note === "half" ? "head-open" : "head-filled";
          (up ? pitches : pitches.slice().reverse()).forEach(function (p) {
            marks.push({ strokes: move(pick(data.parts[headKind], headKind), x, headY(p)) });
          });
          var stem = pick(data.parts.stem, "stem");
          if (!up) stem = turn(stem);
          var farY = beam
            ? beam.y0 + beam.slope * (x - beam.x0)
            : up
              ? headY(high) - STEM
              : headY(low) + STEM;
          var stretched = stretch(stem, Math.abs(farY - anchorY), up);
          marks.push({ strokes: move(stretched, x, anchorY) });
          if (beam) {
            var tip = tipOf(stretched, up);
            beam.tips.push([x + tip[0], anchorY + tip[1]]);
          }
        }

        // Ties and slurs bow away from the stems, and are written after the note they end on.
        var side = up ? 1 : -1;
        var edgeY = (up ? headY(low) : headY(high)) + side * 3.5;
        if (tieFrom) {
          var a = [tieFrom.x + 3.5, tieFrom.y];
          var b = [x - 3.5, tieFrom.y];
          marks.push({
            strokes: arcBetween(
              a,
              b,
              tieFrom.side * Math.min(6, 2.5 + (b[0] - a[0]) * 0.05),
              pick(data.arcs, "arc"),
            ),
            cls: "tie",
          });
          tieFrom = null;
        }
        if (e.tie) tieFrom = { x: x, y: edgeY, side: side };
        if (e.slur === "start") slurFrom = { x: x, y: edgeY, side: side };
        if (e.slur === "end" && slurFrom) {
          var s0 = [slurFrom.x, slurFrom.y + slurFrom.side * 1.5];
          var s1 = [x, edgeY + side * 1.5];
          marks.push({
            strokes: arcBetween(
              s0,
              s1,
              slurFrom.side * Math.min(8, 3.5 + (s1[0] - s0[0]) * 0.06),
              pick(data.arcs, "arc"),
            ),
            cls: "slur",
          });
          slurFrom = null;
        }

        if (beam && e.beam === "end") {
          var t0 = beam.tips[0];
          var t1 = beam.tips[beam.tips.length - 1];
          // Beams are thick: two close passes of the same line, the way a pen fills one in.
          // Using one shape for both keeps the passes parallel, so they read as a single beam.
          var shape = pick(data.beams, "beam");
          var inward = beam.up ? 0.8 : -0.8;
          marks.push({ strokes: lineBetween(t0, t1, shape), cls: "beam" });
          marks.push({
            strokes: lineBetween([t0[0], t0[1] + inward], [t1[0], t1[1] + inward], shape),
            cls: "beam",
            gap: 0.02,
          });
          beam = null;
        }
      });
      return marks;
    }

    // Every drawn stroke, in writing order, with the points it shows now and the points it is
    // heading for after a resize.
    var drawn = [];

    function pathData(points) {
      var parts = [];
      for (var i = 0; i < points.length; i += 2) {
        parts.push(points[i].toFixed(1) + " " + points[i + 1].toFixed(1));
      }
      // A single point still needs a segment to draw a dot.
      if (parts.length === 1) parts.push(parts[0]);
      return "M" + parts.join("L");
    }

    /** The strokes a width produces, flattened in the same order as `drawn`. */
    function strokesFor(width) {
      var out = [];
      compose(width).forEach(function (mark) {
        mark.strokes.forEach(function (stroke) {
          if (stroke.length >= 2) out.push(stroke);
        });
      });
      return out;
    }

    function render(animate) {
      var width = svg.getBoundingClientRect().width;
      if (!width) return;
      var marks = compose(width);
      while (svg.lastChild && svg.lastChild.nodeName !== "desc") svg.removeChild(svg.lastChild);
      svg.classList.toggle("is-done", !animate);
      drawn = [];

      var clock = startAt;
      marks.forEach(function (mark) {
        var group = document.createElementNS(SVG, "g");
        if (mark.cls) group.setAttribute("class", mark.cls);
        mark.strokes.forEach(function (stroke) {
          if (stroke.length < 2) return;
          var duration = PEN.base + Math.sqrt(strokeLength(stroke)) * PEN.perRootPx;
          var path = document.createElementNS(SVG, "path");
          path.setAttribute("d", pathData(stroke));
          path.setAttribute("pathLength", "1");
          path.style.setProperty("--d", clock.toFixed(2) + "s");
          path.style.setProperty("--t", duration.toFixed(2) + "s");
          group.appendChild(path);
          drawn.push({ path: path, now: stroke.slice(), to: stroke });
          clock += duration + PEN.lift;
        });
        svg.appendChild(group);
        clock += mark.gap === undefined ? PEN.between : mark.gap;
      });
      rendered = true;
    }

    /*
     * On resize the same strokes are re-laid for the new width and each one eases towards its new
     * shape, a little every frame. The paths are reshaped in place rather than rebuilt, so writing
     * that is still in progress carries on: the pen reveal is a fraction of each stroke's length,
     * which stays true whatever shape the stroke is bent into.
     */
    var EASE = 0.28;
    var frame = 0;

    function glide() {
      frame = 0;
      var moving = false;
      drawn.forEach(function (d) {
        var changed = false;
        for (var i = 0; i < d.now.length; i++) {
          var gap = d.to[i] - d.now[i];
          if (Math.abs(gap) < 0.05) {
            if (gap !== 0) {
              d.now[i] = d.to[i];
              changed = true;
            }
          } else {
            d.now[i] += reduce ? gap : gap * EASE;
            changed = true;
            moving = true;
          }
        }
        if (changed) d.path.setAttribute("d", pathData(d.now));
      });
      if (moving) frame = requestAnimationFrame(glide);
    }

    function reflow() {
      if (!rendered) return;
      var width = svg.getBoundingClientRect().width;
      if (!width) return;
      var targets = strokesFor(width);
      // Layout never adds or drops a stroke, only moves them; if that ever breaks, start over.
      if (targets.length !== drawn.length) return render(false);
      targets.forEach(function (stroke, i) {
        if (stroke.length !== drawn[i].now.length) drawn[i].now = stroke.slice();
        drawn[i].to = stroke;
      });
      if (!frame) frame = requestAnimationFrame(glide);
    }

    if (svg.getAttribute("data-start") === "load" || !("IntersectionObserver" in window)) {
      render(!reduce);
    } else {
      var observer = new IntersectionObserver(
        function (entries) {
          if (!entries[0].isIntersecting) return;
          observer.disconnect();
          render(!reduce);
        },
        { threshold: 0.6 },
      );
      observer.observe(svg);
    }

    // Follow the staff's own width, which also changes when a scrollbar appears or the layout
    // reflows, not just when the window is resized.
    var lastWidth = svg.getBoundingClientRect().width;
    function resized() {
      var w = svg.getBoundingClientRect().width;
      if (Math.abs(w - lastWidth) < 0.5) return;
      lastWidth = w;
      reflow();
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(resized).observe(svg);
    } else {
      window.addEventListener("resize", resized);
    }
  }

  function start() {
    var source = document.getElementById("staff-writing-data");
    if (!source) return;
    var data = JSON.parse(source.textContent);
    Array.prototype.forEach.call(document.querySelectorAll("[data-staff-writing]"), function (svg) {
      var score = data.scores[svg.getAttribute("data-staff-writing")];
      if (score) Staff(svg, score, data);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
