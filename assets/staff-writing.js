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
  var TIME_ROOM = 22; // px for a time signature
  var SHARP_ROOM = 8; // px per sharp or flat in a key signature
  // Each key's signature: its accidental, and where each one sits, in order, as staff steps up
  // from the bottom line.
  var KEY_SIGNATURE = {
    C: { sign: "sharp", steps: [] },
    G: { sign: "sharp", steps: [8] },
    D: { sign: "sharp", steps: [8, 5] },
    A: { sign: "sharp", steps: [8, 5, 9] },
    F: { sign: "flat", steps: [4] },
  };
  var ADVANCE = {
    whole: 3,
    half: 2.3,
    quarter: 1.7,
    eighth: 1.25,
    bar: 0.9,
    accidental: 0.7,
    dot: 0.5,
  };
  // Fixed px for marks that stick out sideways (a dot or flag to the right, an accidental to the
  // left), so they keep clear however squeezed the staff.
  var ROOM = { dot: 4, flag: 4, accidental: 5 };
  // The least px an eighth note gets. Wide staffs space purely by duration; on a squeezed one (a
  // phone) every note also gets an equal share of the room, trending toward even spacing, so all
  // four bars still fit without heads touching. Barlines and accidentals take smaller shares.
  var MIN_EIGHTH = 11;
  var SHARE = { note: 1, bar: 0.5, accidental: 0.6 };
  var PEN = { base: 0.075, perRootPx: 0.034, lift: 0.045, between: 0.14, letter: 0.03 };

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

  /**
   * The staff's layout width, in the 5px-space units every stroke is drawn in. Phones engrave the
   * staff smaller (`--space` in site.css); the svg is scaled to match through its viewBox, so a
   * narrow staff lays out as a wider one and still fits all four bars. Read from computed style,
   * ignoring any CSS transform (getBoundingClientRect would include one).
   */
  function widthOf(svg) {
    var style = getComputedStyle(svg);
    var width = parseFloat(style.width) || 0;
    var height = parseFloat(style.height) || 0;
    // Five 1px lines: height is four spaces plus a line, so the scale is space / 5.
    var k = height > 1 ? Math.min(1, (height - 1) / 20) : 1;
    if (!width) return 0;
    // Map user y 0.5 and 20.5 (top and bottom line centres) onto the CSS lines exactly.
    var top = -(0.5 * (1 - k)) / k;
    var box = "0 " + top.toFixed(3) + " " + (width / k).toFixed(2) + " " + (height / k).toFixed(3);
    if (svg.getAttribute("viewBox") !== box) {
      svg.setAttribute("viewBox", box);
      svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    }
    return width / k;
  }

  function strokeLength(stroke) {
    var total = 0;
    for (var i = 2; i < stroke.length; i += 2) {
      total += Math.hypot(stroke[i] - stroke[i - 2], stroke[i + 1] - stroke[i - 1]);
    }
    return total;
  }

  var keyboardLast = false;
  document.addEventListener("keydown", function (e) {
    if (e.key === "Tab") keyboardLast = true;
  });
  document.addEventListener("pointerdown", function () {
    keyboardLast = false;
  });

  function Staff(svg, events, data) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var startAt = parseFloat(svg.getAttribute("data-delay")) || 0.3;
    var rendered = false;
    // What the player needs: the score, and the drawn groups of each note by event index.
    var staff = { events: events, svg: svg, notes: {}, chords: {}, onPlay: null };
    var generation = 0;
    var observer = null;

    // Deterministic variety: each kind of mark cycles through its writer's drawings.
    var turns = {};
    function pick(list, kind) {
      turns[kind] = ((turns[kind] === undefined ? -1 : turns[kind]) + 1) % list.length;
      return list[turns[kind]];
    }

    function text(string, x, place) {
      // Chord symbols sit just above the staff; tempo text such as "rit." goes above the staff
      // too, and when it shares a note with a chord it stacks over the chord, as in print.
      var baseline = {
        below: BOTTOM_LINE + 13,
        chord: -10,
        above: -6,
        "above-chord": -27,
      }[place];
      var marks = [];
      for (var i = 0; i < string.length; i++) {
        if (string[i] === "/") {
          // A slash chord's "/": the pen's own line, from a barline turned on a slant.
          var tall = (place === "chord" ? 1.3 : 1) * 7;
          marks.push({
            strokes: lineBetween(
              [x, baseline + 1],
              [x + tall * 0.45, baseline - tall],
              pick(data.beams, "slash"),
            ),
            gap: PEN.letter,
            text: true,
          });
          x += tall * 0.45 + 1.5;
          continue;
        }
        var variants = data.letters[string[i]];
        if (!variants || !variants.length) {
          x += 3;
          continue;
        }
        var letter = pick(variants, "letter-" + string[i]);
        // Chord symbols are read at a glance by a player, so they're written a size up.
        var size = place === "chord" ? 1.3 : 1;
        var strokes = letter.strokes.map(function (s) {
          return s.map(function (v) {
            return v * size;
          });
        });
        marks.push({ strokes: move(strokes, x, baseline), gap: PEN.letter, text: true });
        x += (letter.width + 0.8) * size;
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
        } else if (e.key) {
          fixed[i] = left + 3;
          left += KEY_SIGNATURE[e.key].steps.length * SHARP_ROOM + 8;
        } else if (e.time) {
          fixed[i] = left + TIME_ROOM / 2 - 2;
          left += TIME_ROOM;
        }
      });
      // A closing barline can sit near the end; a final note needs room before the staff's own.
      var last = events[events.length - 1];
      var right = last && last.bar ? 4 : 26;
      // Where each event sits, as [duration units, shares of room, px] counted before it.
      var units = 0;
      var shares = 0;
      var px = 0;
      var at = events.map(function (e) {
        if (e.text || e.chord || e.clef || e.key || e.time) return [units, shares, px];
        if (e.accidental) {
          units += ADVANCE.accidental;
          shares += SHARE.accidental;
          px += ROOM.accidental;
        }
        if (e.bar) {
          // A barline sits a third of the way back into the room before it.
          var barAt = [units - ADVANCE.bar / 3, shares - SHARE.bar / 3, px];
          units += ADVANCE.bar;
          shares += SHARE.bar;
          return barAt;
        }
        var noteAt = [units, shares, px];
        units += ADVANCE[e.note || e.rest] + (e.dot ? ADVANCE.dot : 0);
        shares += SHARE.note;
        if (e.dot) px += ROOM.dot;
        if (e.note === "eighth" && !e.beam && [].concat(e.pitch).length === 1) px += ROOM.flag;
        return noteAt;
      });
      // The last event lands at the right edge: its units × scale + shares × share = room.
      var end = at[at.length - 1];
      var room = width - left - right - 4 - end[2];
      var scale = room / (end[0] || 1);
      var share = 0;
      if (ADVANCE.eighth * scale < MIN_EIGHTH) {
        // Squeezed: find the scale at which an eighth (its units plus one share) is MIN_EIGHTH.
        scale = Math.max(0, (room - MIN_EIGHTH * end[1]) / (end[0] - ADVANCE.eighth * end[1]));
        share = scale > 0 ? MIN_EIGHTH - ADVANCE.eighth * scale : room / (end[1] || 1);
      }
      return {
        xs: at.map(function (a, i) {
          return i in fixed ? fixed[i] : left + 4 + a[0] * scale + a[1] * share + a[2];
        }),
      };
    }

    function compose(width) {
      turns = {};
      var laid = layout(width);
      var xs = laid.xs;
      var marks = [];
      var pending = [];
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

      function place(e, i) {
        var x = xs[i];
        if (e.clef) {
          // The clef rises about two spaces above the staff and hangs one below it.
          marks.push({ strokes: move(pick(data.parts["g-clef"], "clef"), 2, -4.5) });
          return;
        }
        if (e.key) {
          var signature = KEY_SIGNATURE[e.key];
          signature.steps.forEach(function (pitch, n) {
            marks.push({
              strokes: move(
                pick(data.parts[signature.sign], signature.sign),
                x + n * SHARP_ROOM,
                headY(pitch),
              ),
            });
          });
          return;
        }
        if (e.time) {
          marks.push({ strokes: move(pick(data.time, "time"), x, 0) });
          return;
        }
        // Text and chord symbols wait for the next note, and several can wait for the same one.
        if (e.text || e.chord) {
          pending.push({ e: e, i: i });
          return;
        }
        var withChord = pending.some(function (p) {
          return p.e.chord;
        });
        pending.forEach(function (p) {
          if (p.e.chord) {
            // Tagged with the chord's event, so playback can light the symbol while it sounds.
            text(p.e.chord, x - 3, "chord").forEach(function (m) {
              m.chord = p.i;
              marks.push(m);
            });
          } else {
            var where = p.e.place === "above" && withChord ? "above-chord" : p.e.place;
            text(p.e.text, x - 3, where).forEach(function (m) {
              if (where === "below") m.below = p.i;
              // Stacked over a chord symbol, it moves with that symbol if it has to lift.
              if (where === "above-chord")
                m.over = pending.filter(function (q) {
                  return q.e.chord;
                })[0].i;
              marks.push(m);
            });
          }
        });
        pending = [];
        if (e.bar) {
          marks.push({ strokes: move(pick(data.parts.barline, "barline"), x, 0) });
          return;
        }
        if (e.rest === "half") {
          // A half rest is a thick bar sitting on the middle line: two close passes, like a beam.
          var block = pick(data.parts["rest-half"], "rest-half");
          marks.push({ strokes: move(block, x, headY(4) - 0.6) });
          marks.push({ strokes: move(block, x, headY(4) - 1.6), gap: 0.02 });
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

        // A dot sits to the right of each head, in a space: a head on a line moves it up to the next.
        if (e.dot) {
          pitches.forEach(function (p) {
            var dotY = headY(p % 2 === 0 ? p + 1 : p);
            marks.push({
              strokes: move(pick(data.parts.dot, "dot"), x + (e.note === "whole" ? 9 : 6.5), dotY),
            });
          });
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
      }

      /**
       * Chords a beat apart on a squeezed staff can run into each other: nudge the later symbol
       * (and anything stacked over it) right until there's a clear gap.
       */
      function spaceChords() {
        var GAP = 4;
        var spans = {};
        marks.forEach(function (m) {
          if (m.chord === undefined) return;
          var span = (spans[m.chord] = spans[m.chord] || {
            index: m.chord,
            x0: Infinity,
            x1: -Infinity,
          });
          m.strokes.forEach(function (st) {
            for (var k = 0; k < st.length; k += 2) {
              span.x0 = Math.min(span.x0, st[k]);
              span.x1 = Math.max(span.x1, st[k]);
            }
          });
        });
        var ordered = Object.keys(spans)
          .map(function (k) {
            return spans[k];
          })
          .sort(function (a, b) {
            return a.x0 - b.x0;
          });
        for (var n = 1; n < ordered.length; n++) {
          var push = ordered[n - 1].x1 + GAP - ordered[n].x0;
          if (!(push > 0)) continue;
          marks.forEach(function (m) {
            if (m.chord === ordered[n].index || m.over === ordered[n].index) {
              m.strokes = move(m.strokes, push, 0);
            }
          });
          ordered[n].x0 += push;
          ordered[n].x1 += push;
        }
      }

      /**
       * Chord symbols prefer to sit close above the staff, but a high stem, beam or slur under one
       * lifts it just clear (and anything stacked over it) rather than letting them touch.
       */
      function clearChords() {
        var CLEARANCE = 3;
        var spans = {};
        marks.forEach(function (m) {
          if (m.chord === undefined) return;
          var span = (spans[m.chord] = spans[m.chord] || {
            x0: Infinity,
            x1: -Infinity,
            y1: -Infinity,
          });
          m.strokes.forEach(function (st) {
            for (var k = 0; k < st.length; k += 2) {
              span.x0 = Math.min(span.x0, st[k]);
              span.x1 = Math.max(span.x1, st[k]);
              span.y1 = Math.max(span.y1, st[k + 1]);
            }
          });
        });
        Object.keys(spans).forEach(function (index) {
          var span = spans[index];
          // The staff's top line counts too, so a letter's tail (the "j" of "maj7") stays above it.
          var top = 0.5;
          marks.forEach(function (m) {
            if (m.text) return;
            m.strokes.forEach(function (st) {
              for (var k = 0; k < st.length; k += 2) {
                if (st[k] >= span.x0 - 2 && st[k] <= span.x1 + 2) top = Math.min(top, st[k + 1]);
              }
            });
          });
          var lift = span.y1 - (top - CLEARANCE);
          if (!(lift > 0)) return;
          marks.forEach(function (m) {
            if (String(m.chord) !== index && String(m.over) !== index) return;
            m.strokes = move(m.strokes, 0, -lift);
          });
        });
      }

      /** Text below the staff, such as "mf", drops just clear of a low note head or stem over it. */
      function clearBelow() {
        var CLEARANCE = 3;
        var spans = {};
        marks.forEach(function (m) {
          if (m.below === undefined) return;
          var span = (spans[m.below] = spans[m.below] || {
            x0: Infinity,
            x1: -Infinity,
            y0: Infinity,
          });
          m.strokes.forEach(function (st) {
            for (var k = 0; k < st.length; k += 2) {
              span.x0 = Math.min(span.x0, st[k]);
              span.x1 = Math.max(span.x1, st[k]);
              span.y0 = Math.min(span.y0, st[k + 1]);
            }
          });
        });
        Object.keys(spans).forEach(function (index) {
          var span = spans[index];
          var bottom = -Infinity;
          marks.forEach(function (m) {
            if (m.text) return;
            m.strokes.forEach(function (st) {
              for (var k = 0; k < st.length; k += 2) {
                if (st[k] >= span.x0 - 2 && st[k] <= span.x1 + 2)
                  bottom = Math.max(bottom, st[k + 1]);
              }
            });
          });
          var drop = bottom + CLEARANCE - span.y0;
          if (!(drop > 0)) return;
          marks.forEach(function (m) {
            if (String(m.below) === index) m.strokes = move(m.strokes, 0, drop);
          });
        });
      }

      events.forEach(function (e, i) {
        var from = marks.length;
        place(e, i);
        for (var k = from; k < marks.length; k++) {
          // Beams, slurs and ties join notes, and text sits beside them: none of them light up.
          if (e.note && !marks[k].text && !/beam|slur|tie/.test(marks[k].cls || "")) {
            marks[k].note = i;
          }
        }
      });
      spaceChords();
      clearChords();
      clearBelow();
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
          if (stroke.length >= 2) out.push({ stroke: stroke });
        });
      });
      return out;
    }

    function render(animate) {
      var width = widthOf(svg);
      if (!width) return;
      var marks = compose(width);
      while (svg.lastChild && svg.lastChild.nodeName !== "desc") svg.removeChild(svg.lastChild);
      svg.classList.toggle("is-done", !animate);
      drawn = [];
      staff.notes = {};
      staff.chords = {};
      generation++;

      // The staff is only 21px tall; a taller invisible band above and below it takes the click.
      var hit = document.createElementNS(SVG, "rect");
      hit.setAttribute("class", "staff-hit");
      hit.setAttribute("x", "-6");
      hit.setAttribute("y", "-16");
      hit.setAttribute("width", "100%");
      hit.setAttribute("height", "54");
      svg.appendChild(hit);

      var clock = startAt;
      marks.forEach(function (mark) {
        var group = document.createElementNS(SVG, "g");
        if (mark.cls) group.setAttribute("class", mark.cls);
        if (mark.note !== undefined) {
          (staff.notes[mark.note] = staff.notes[mark.note] || []).push(group);
        }
        if (mark.chord !== undefined) {
          (staff.chords[mark.chord] = staff.chords[mark.chord] || []).push(group);
          group.setAttribute("data-chord", mark.chord);
        } else if (mark.text) {
          group.setAttribute("data-text", "");
        }
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

      svg.removeAttribute("aria-hidden");
      svg.setAttribute("role", "button");
      svg.setAttribute("tabindex", "0");
      if (!svg.hasAttribute("aria-pressed")) svg.setAttribute("aria-pressed", "false");
      staff.label(false);
    }

    /** Button label, with the current tune's name filled in. */
    staff.tune = "";
    staff.label = function (playing) {
      var text = svg.getAttribute(playing ? "data-stop-label" : "data-play-label") || "";
      svg.setAttribute("aria-label", text.replace("{tune}", staff.tune));
    };

    /**
     * Finish writing now: a click before the pen is done shouldn't wait, so the rest of the
     * writing plays out at many times its speed (about half a second), then resolves. A staff
     * that hasn't scrolled into view yet is written on the spot.
     */
    var HURRY = 45;
    staff.hurry = function () {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (!rendered) render(!reduce);
      var running = (svg.getAnimations ? svg.getAnimations({ subtree: true }) : []).filter(
        function (a) {
          return a.playState !== "finished";
        },
      );
      if (!running.length) return Promise.resolve();
      running.forEach(function (a) {
        if (a.updatePlaybackRate) a.updatePlaybackRate(HURRY);
        else a.playbackRate = HURRY;
      });
      var done = Promise.all(
        running.map(function (a) {
          return a.finished.catch(function () {});
        }),
      );
      var cap = new Promise(function (resolve) {
        setTimeout(resolve, 1500);
      });
      return Promise.race([done, cap]);
    };

    /** Swap in another tune's score and write it again, at a quicker pen than the first time. */
    staff.rewrite = function (next, name) {
      events = next;
      staff.events = next;
      staff.tune = name;
      staff.label(false);
      if (!rendered) return;
      render(!reduce);
      if (svg.getAnimations) {
        svg.getAnimations({ subtree: true }).forEach(function (a) {
          if (a.updatePlaybackRate) a.updatePlaybackRate(REWRITE);
          else a.playbackRate = REWRITE;
        });
      }
    };
    var REWRITE = 2.5;

    /*
     * Clicking shows the focus ring as a brief flash that fades, rather than leaving a border round
     * the music. Keyboard focus keeps a steady ring, so tabbing still shows where you are.
     */
    var ringTimer = null;
    function ring() {
      svg.classList.remove("is-ringing");
      void svg.getBoundingClientRect();
      svg.classList.add("is-ringing");
      clearTimeout(ringTimer);
      ringTimer = setTimeout(function () {
        svg.classList.remove("is-ringing");
      }, 1500);
    }

    function press(event) {
      if (!staff.onPlay || !rendered) return;
      event.preventDefault();
      ring();
      staff.onPlay();
    }
    svg.addEventListener("click", press);
    svg.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") press(event);
    });
    svg.addEventListener("focus", function () {
      svg.classList.toggle("is-keyboard-focus", keyboardLast);
    });
    svg.addEventListener("blur", function () {
      svg.classList.remove("is-keyboard-focus");
    });

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
      var width = widthOf(svg);
      if (!width) return;
      var targets = strokesFor(width);
      // Layout never adds or drops a stroke, only moves them; if that ever breaks, start over.
      if (targets.length !== drawn.length) return render(false);
      targets.forEach(function (target, i) {
        var stroke = target.stroke;
        if (stroke.length !== drawn[i].now.length) drawn[i].now = stroke.slice();
        drawn[i].to = stroke;
      });
      if (!frame) frame = requestAnimationFrame(glide);
    }

    if (svg.getAttribute("data-start") === "load" || !("IntersectionObserver" in window)) {
      render(!reduce);
    } else {
      observer = new IntersectionObserver(
        function (entries) {
          if (!entries[0].isIntersecting || !observer) return;
          observer.disconnect();
          observer = null;
          render(!reduce);
        },
        { threshold: 0.6 },
      );
      observer.observe(svg);
    }

    // Follow the staff's own width, which also changes when a scrollbar appears or the layout
    // reflows, not just when the window is resized.
    var lastWidth = widthOf(svg);
    function resized() {
      var w = widthOf(svg);
      if (Math.abs(w - lastWidth) < 0.5) return;
      lastWidth = w;
      reflow();
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(resized).observe(svg);
    } else {
      window.addEventListener("resize", resized);
    }
    return staff;
  }

  /* ---------- playback ---------------------------------------------------- */

  // Seconds per written quarter for each tune's feel: a lively polka (written doubled), or a
  // slow ballad.
  var FEELS = { polka: { beat: 0.3 }, ballad: { beat: 0.8 } };
  var RIT = 0.7; // the last note under "rit." is this much longer than normal, easing up to it
  var LETTERS = "EFGABCD"; // staff steps from the bottom line
  var SEMITONES = { E: 0, F: 1, G: 3, A: 5, B: 7, C: 8, D: 10 };
  var KEY_ALTER = { C: {}, G: { F: 1 }, D: { F: 1, C: 1 }, A: { F: 1, C: 1, G: 1 }, F: { B: -1 } };
  var LENGTH = { whole: 4, half: 2, quarter: 1, eighth: 0.5 };
  var ALTER = { sharp: 1, flat: -1, natural: 0 };

  /** Frequency of a staff step, with the key signature or an accidental earlier in the bar. */
  function frequency(step, key, alterations) {
    var octave = Math.floor(step / 7);
    var letter = LETTERS[((step % 7) + 7) % 7];
    var midi = 64 + octave * 12 + SEMITONES[letter];
    var fromKey = KEY_ALTER[key][letter] || 0;
    var alter = step in alterations ? alterations[step] : fromKey;
    return 440 * Math.pow(2, (midi + alter - 69) / 12);
  }

  /**
   * A piano-like note, synthesised, so there is nothing to download. A hammer strike (a short
   * burst of filtered noise) over a stack of slightly stretched overtones; the higher ones fade
   * faster, as on a real string, so the tone mellows as it rings. Released gently at the end.
   */
  function piano(ac, out, freq, at, length, level) {
    var loud = level === undefined ? 1 : level;
    var partials = [1, 0.52, 0.28, 0.16, 0.1, 0.06, 0.035];
    var end = at + length;
    partials.forEach(function (amp, k) {
      var n = k + 1;
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.frequency.value = freq * n * Math.sqrt(1 + 0.00035 * n * n);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(amp * 0.16 * loud, at + 0.004);
      gain.gain.setTargetAtTime(amp * 0.03 * loud, at + 0.004, 0.9 / (n * 0.8 + 0.6));
      gain.gain.setTargetAtTime(0, end, 0.09);
      osc.connect(gain);
      gain.connect(out);
      osc.start(at);
      osc.stop(end + 0.6);
    });
    var noise = ac.createBufferSource();
    var buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.03), ac.sampleRate);
    var samples = buffer.getChannelData(0);
    for (var i = 0; i < samples.length; i++) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    }
    noise.buffer = buffer;
    var band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = Math.min(freq * 4, 6000);
    band.Q.value = 1.2;
    var knock = ac.createGain();
    knock.gain.value = 0.05 * loud;
    noise.connect(band);
    band.connect(knock);
    knock.connect(out);
    noise.start(at);
  }

  /* ---------- backing chords ---------------------------------------------- */

  var PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function midiFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  var QUALITIES = {
    "": [0, 4, 7],
    m: [0, 3, 7],
    7: [0, 4, 7, 10],
    m7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11],
    6: [0, 4, 7, 9],
  };

  function pitchClass(letter, flat) {
    return (PITCH_CLASS[letter] + (flat ? 11 : 0)) % 12;
  }

  /**
   * A chord's bass (E2–D♯3, or the note after "/") and its chord tones close together above it
   * (E3–D♯4), for the left hand. Four-note chords leave the root to the bass, so seventh chords
   * don't cluster a semitone apart.
   */
  function voicing(name) {
    var parts = name.match(/^([A-G])(b?)(maj7|m7|m|7|6)?(?:\/([A-G])(b?))?$/) || [];
    var root = pitchClass(parts[1] || "C", parts[2]);
    var intervals = QUALITIES[parts[3] || ""];
    if (intervals.length === 4) intervals = intervals.slice(1);
    var bassClass = parts[4] ? pitchClass(parts[4], parts[5]) : root;
    var bass = 40 + ((bassClass - 4 + 12) % 12);
    var fifth = parts[4] ? bass : bass + 7 > 52 ? bass - 5 : bass + 7;
    var upper = intervals
      .map(function (i) {
        return 52 + ((root + i - 4 + 12) % 12); // E3 up to D♯4
      })
      .sort(function (a, b) {
        return a - b;
      });
    return { bass: bass, fifth: fifth, upper: upper };
  }

  /** Plays every staff's score in order, lighting each note as it sounds. */
  function Player(staffs, feelOf) {
    var context = null;
    var master = null;
    var backingBus = null;
    var backingOn = true;
    var timers = [];
    var playing = false;

    function timeline() {
      var out = [];
      var tieOpen = false;
      staffs.forEach(function (staff) {
        var key = "C";
        var alterations = {};
        var rit = false;
        var chord = null;
        var chordIndex = null;
        staff.events.forEach(function (e, i) {
          if (e.chord) {
            chord = e.chord;
            chordIndex = i;
          }
          if (e.key) key = e.key;
          if (e.bar) alterations = {};
          if (e.text && /^rit/.test(e.text)) rit = true;
          if (!e.note && !e.rest) return;
          var tiedFrom = tieOpen && !!e.note;
          tieOpen = !!e.tie;
          var noteChord = chord;
          var noteChordIndex = chordIndex;
          chord = null;
          chordIndex = null;
          var pitches = e.note ? [].concat(e.pitch) : [];
          if (e.accidental) alterations[pitches[0]] = ALTER[e.accidental];
          out.push({
            staff: staff,
            index: i,
            beats: LENGTH[e.note || e.rest] * (e.dot ? 1.5 : 1),
            written: LENGTH[e.note || e.rest] * (e.dot ? 1.5 : 1),
            chord: noteChord,
            chordIndex: noteChordIndex,
            tiedFrom: tiedFrom,
            rit: rit,
            freqs: pitches.map(function (p) {
              return frequency(p, key, alterations);
            }),
          });
        });
      });
      // Slow gradually across the notes marked rit., rather than all at once.
      var ritNotes = out.filter(function (n) {
        return n.rit;
      });
      ritNotes.forEach(function (n, k) {
        n.beats *= 1 + (RIT * (k + 1)) / ritNotes.length;
      });
      return out;
    }

    function light(note, on) {
      (note.staff.notes[note.index] || []).forEach(function (group) {
        group.classList.toggle("is-sounding", on);
      });
    }

    // The chord symbol currently sounding, lit only while the backing is on.
    var soundingChord = null;
    function chordGroups(chord) {
      return chord ? chord.staff.chords[chord.index] || [] : [];
    }
    function lightChord(chord) {
      chordGroups(soundingChord).forEach(function (g) {
        g.classList.remove("is-sounding");
      });
      soundingChord = chord;
      if (!backingOn) return;
      chordGroups(chord).forEach(function (g) {
        g.classList.add("is-sounding");
      });
    }

    /**
     * When playback moves on to a staff that is off screen (the footer, from the masthead), scroll
     * to the bottom of the page so the listener can follow along.
     */
    function follow(staff) {
      var box = staff.svg.getBoundingClientRect();
      if (box.top >= 0 && box.bottom <= window.innerHeight) return;
      var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: still ? "auto" : "smooth",
      });
    }

    function finish() {
      timers.forEach(clearTimeout);
      timers = [];
      staffs.forEach(function (staff) {
        staff.svg.classList.remove("is-performing");
        staff.svg.setAttribute("aria-pressed", "false");
        staff.label(false);
        Array.prototype.forEach.call(staff.svg.querySelectorAll(".is-sounding"), function (g) {
          g.classList.remove("is-sounding");
        });
      });
      playing = false;
      soundingChord = null;
    }

    function stop() {
      // A quick fade rather than a click.
      if (master && context) master.gain.setTargetAtTime(0, context.currentTime, 0.04);
      master = null;
      finish();
    }

    /** Make the audio context inside the click itself; some browsers refuse it any later. */
    function unlock() {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      if (!context) context = new Ctor();
      if (context.state === "suspended") context.resume();
      return true;
    }

    function play() {
      if (!unlock()) return;
      var BEAT = (FEELS[feelOf()] || FEELS.polka).beat;

      master = context.createGain();
      master.gain.value = 0.9;
      backingBus = context.createGain();
      backingBus.gain.value = backingOn ? 1 : 0;
      backingBus.connect(master);
      var tone = context.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 4200;
      var limiter = context.createDynamicsCompressor();
      master.connect(tone);
      tone.connect(limiter);
      limiter.connect(context.destination);

      playing = true;
      staffs.forEach(function (staff) {
        staff.svg.classList.add("is-performing");
        staff.svg.setAttribute("aria-pressed", "true");
        staff.label(true);
      });

      // Sound is scheduled on the audio clock; the highlights follow on timers from the same start.
      var lead = 80;
      var start = context.currentTime + lead / 1000;
      var at = start;
      var notes = timeline();
      // Each written beat's start time, following the melody (so the backing slows under rit.).
      var beatTimes = [];
      var written = 0;
      var chordAt = [];
      var current = null;
      var clock = start;
      notes.forEach(function (note) {
        if (note.chord) current = note.chord;
        var perBeat = (note.beats * BEAT) / note.written;
        for (var b = 0; b < note.written; b += 0.5) {
          if (Math.abs(b + written - Math.round(b + written)) < 1e-9) {
            beatTimes[Math.round(b + written)] = clock + b * perBeat;
            chordAt[Math.round(b + written)] = current;
          }
        }
        clock += note.beats * BEAT;
        written += note.written;
      });
      scheduleBacking(beatTimes, chordAt, clock, feelOf());

      // A tied note isn't struck again: the note it continues rings on through it.
      for (var n = notes.length - 1; n >= 0; n--) {
        var following = notes[n + 1];
        notes[n].sustain =
          notes[n].beats * BEAT + (following && following.tiedFrom ? following.sustain : 0);
      }

      var previousStaff = null;
      notes.forEach(function (note) {
        var length = note.beats * BEAT;
        if (!note.tiedFrom) {
          note.freqs.forEach(function (f) {
            piano(context, master, f, at, note.sustain * 0.92);
          });
        }
        var on = lead + (at - start) * 1000;
        if (previousStaff && note.staff !== previousStaff) {
          // Only once the last note of the staff before has played out in full, never ahead of it.
          timers.push(setTimeout(follow.bind(null, note.staff), on));
        }
        previousStaff = note.staff;
        if (note.chordIndex !== null && note.chordIndex !== undefined) {
          timers.push(
            setTimeout(lightChord.bind(null, { staff: note.staff, index: note.chordIndex }), on),
          );
        }
        timers.push(setTimeout(light.bind(null, note, true), on));
        timers.push(setTimeout(light.bind(null, note, false), on + length * 920));
        at += length;
      });
      timers.push(setTimeout(finish, lead + (at - start) * 1000 + 250));
    }

    /**
     * A polka "oom-pah" under the tune, on piano: on each beat the left hand plays either the bass
     * (root, or the fifth on the second half of a bar, root again wherever the chord changes) or a
     * short chord. Timed off the melody, so it slows under rit.; the last chord is left to ring.
     */
    function scheduleBacking(beatTimes, chordAt, end, feel) {
      var last = beatTimes.length - 4;
      if (feel === "ballad") return scheduleHeld(beatTimes, chordAt, end, last);
      for (var beat = 0; beat < beatTimes.length; beat++) {
        var name = chordAt[beat];
        var at = beatTimes[beat];
        if (!name || at === undefined) continue;
        var next = beatTimes[beat + 1] !== undefined ? beatTimes[beat + 1] : end;
        var shape = voicing(name);
        if (beat >= last) {
          if (beat > last) continue;
          piano(context, backingBus, midiFrequency(shape.bass), at, 2, 0.6);
          shape.upper.forEach(function (m) {
            piano(context, backingBus, midiFrequency(m), at, 2, 0.3);
          });
          continue;
        }
        if (beat % 2 === 0) {
          var changed = beat < 2 || chordAt[beat - 2] !== name;
          var bass = beat % 4 === 0 || changed ? shape.bass : shape.fifth;
          piano(context, backingBus, midiFrequency(bass), at, (next - at) * 0.9, 0.6);
        } else {
          shape.upper.forEach(function (m) {
            piano(context, backingBus, midiFrequency(m), at, (next - at) * 0.6, 0.28);
          });
        }
      }
    }

    /**
     * Ballad backing: the whole chord, bass and hand together, struck on beats 1 and 3 and wherever
     * the chord changes, and held to the next strike. The last one rings on past the melody.
     */
    function scheduleHeld(beatTimes, chordAt, end, last) {
      function strikes(b) {
        if (!chordAt[b] || beatTimes[b] === undefined || b > last) return false;
        return b % 2 === 0 || b === 0 || chordAt[b - 1] !== chordAt[b];
      }
      for (var beat = 0; beat < beatTimes.length; beat++) {
        if (!strikes(beat)) continue;
        var at = beatTimes[beat];
        var until = end + 1.5;
        for (var b = beat + 1; b < beatTimes.length; b++) {
          if (strikes(b)) {
            until = beatTimes[b];
            break;
          }
        }
        var shape = voicing(chordAt[beat]);
        piano(context, backingBus, midiFrequency(shape.bass), at, until - at, 0.45);
        shape.upper.forEach(function (m) {
          piano(context, backingBus, midiFrequency(m), at, until - at, 0.2);
        });
      }
    }

    function setBacking(on) {
      backingOn = on;
      if (playing) lightChord(soundingChord);
      if (backingBus && context)
        backingBus.gain.setTargetAtTime(on ? 1 : 0, context.currentTime, 0.05);
    }

    return {
      unlock: unlock,
      play: play,
      stop: stop,
      setBacking: setBacking,
      isPlaying: function () {
        return playing;
      },
    };
  }

  var TUNE_KEY = "staff-tune";

  function start() {
    var source = document.getElementById("staff-writing-data");
    if (!source) return;
    var data = JSON.parse(source.textContent);
    var tunes = data.tunes;

    // The visitor's last choice, by name so reordering the list doesn't change what they see.
    var current = 0;
    try {
      var saved = localStorage.getItem(TUNE_KEY);
      tunes.forEach(function (t, i) {
        if (t.name === saved) current = i;
      });
    } catch (e) {}

    var staffs = [];
    Array.prototype.forEach.call(document.querySelectorAll("[data-staff-writing]"), function (svg) {
      var part = svg.getAttribute("data-staff-writing");
      var score = tunes[current][part];
      if (!score) return;
      var staff = Staff(svg, score, data);
      staff.part = part;
      staff.tune = tunes[current].name;
      staff.label(false);
      staffs.push(staff);
    });
    if (!staffs.length) return;

    // Either staff plays the whole excerpt, top to bottom. Pressed before the pen is done, both
    // staffs finish writing quickly first.
    var player = Player(staffs, function () {
      return tunes[current].feel;
    });
    staffs.forEach(function (staff) {
      staff.onPlay = function () {
        if (player.isPlaying()) return player.stop();
        player.unlock();
        Promise.all(
          staffs.map(function (s) {
            return s.hurry();
          }),
        ).then(function () {
          if (!player.isPlaying()) player.play();
        });
        if (window.umami && typeof window.umami.track === "function") {
          window.umami.track("staff-play", { tune: tunes[current].name });
        }
      };
    });

    // Backing chords: on unless the visitor turned them off.
    var CHORDS_KEY = "staff-chords";
    var chordsButton = document.querySelector("[data-chords-switch]");
    var backing = true;
    try {
      backing = localStorage.getItem(CHORDS_KEY) !== "off";
    } catch (e) {}
    player.setBacking(backing);
    if (chordsButton) {
      chordsButton.setAttribute("aria-pressed", String(backing));
      chordsButton.addEventListener("click", function () {
        backing = !backing;
        chordsButton.setAttribute("aria-pressed", String(backing));
        player.setBacking(backing);
        try {
          localStorage.setItem(CHORDS_KEY, backing ? "on" : "off");
        } catch (e) {}
        if (window.umami && typeof window.umami.track === "function") {
          window.umami.track("chords-toggle", { on: backing });
        }
      });
    }

    var button = document.querySelector("[data-tune-switch]");
    if (!button) return;
    var dots = button.querySelectorAll("span");
    function show() {
      var name = tunes[current].name;
      Array.prototype.forEach.call(dots, function (dot, i) {
        dot.classList.toggle("is-current", i === current);
      });
      button.title = name;
      button.setAttribute(
        "aria-label",
        (button.getAttribute("data-label") || "").replace("{tune}", name),
      );
    }
    show();
    button.addEventListener("click", function () {
      player.stop();
      current = (current + 1) % tunes.length;
      try {
        localStorage.setItem(TUNE_KEY, tunes[current].name);
      } catch (e) {}
      show();
      staffs.forEach(function (staff) {
        staff.rewrite(tunes[current][staff.part], tunes[current].name);
      });
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track("tune-switch", { tune: tunes[current].name });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
