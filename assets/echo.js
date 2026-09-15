/* Echo: the 404 easter egg. Listen to a melody, play it back, and it grows a note. */
(function () {
  // A minor pentatonic, so whatever order the game picks still sounds like music.
  var NOTES = [220.0, 261.63, 293.66, 329.63, 392.0];
  var KEYMAP = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, a: 0, s: 1, d: 2, f: 3, g: 4 };

  // Entrance timing. Written onto the panel as custom properties, so the stylesheet's
  // animation delays and the chime schedule below can't drift apart.
  var ENTER_START = 120;
  var ENTER_STAGGER = 110;
  var ENTER_DURATION = 620;

  var context = null;

  function audio() {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!context) context = new Ctor();
    // Browsers start audio suspended until a user gesture resumes it.
    if (context.state === "suspended") context.resume();
    return context;
  }

  // Scheduled on the audio clock rather than with setTimeout, so chimes land exactly
  // on time and aren't throttled in a background tab.
  function voice(freq, at, length, peak, type) {
    var ac = audio();
    if (!ac) return;
    var t = ac.currentTime + at;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // Exponential ramps can't touch zero, hence the tiny floor.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  function tone(freq, ms) {
    voice(freq, 0, ms / 1000 + 0.08, 0.22, "triangle");
  }

  // A struck bell: inharmonic partials above the fundamental that die away first.
  function chime(freq, at, peak) {
    voice(freq, at, 1.8, peak, "sine");
    voice(freq * 2.76, at, 0.75, peak * 0.3, "sine");
    voice(freq * 5.4, at, 0.3, peak * 0.1, "sine");
  }

  function buzz() {
    voice(110, 0, 0.42, 0.09, "sawtooth");
    voice(116.5, 0, 0.42, 0.07, "sawtooth");
  }

  function track(name, data) {
    if (window.umami && typeof window.umami.track === "function") window.umami.track(name, data);
  }

  function start() {
    var trigger = document.querySelector("[data-echo-open]");
    var panel = document.querySelector("[data-echo]");
    if (!trigger || !panel) return;

    var pads = Array.prototype.slice.call(panel.querySelectorAll("[data-echo-pad]"));
    var startButton = panel.querySelector("[data-echo-start]");
    var roundOut = panel.querySelector("[data-echo-round]");
    var bestOut = panel.querySelector("[data-echo-best]");
    var status = panel.querySelector("[data-echo-status]");
    var copy = function (name) {
      return panel.getAttribute("data-" + name);
    };
    var startLabel = startButton.textContent;

    panel.style.setProperty("--echo-start", ENTER_START + "ms");
    panel.style.setProperty("--echo-stagger", ENTER_STAGGER + "ms");
    panel.style.setProperty("--echo-duration", ENTER_DURATION + "ms");

    var sequence = [];
    var position = 0;
    var startedAt = 0;
    var state = "idle";
    // Bumped on every new game so a melody still playing from the last one stops.
    var generation = 0;

    var best = 0;
    try {
      best = parseInt(localStorage.getItem("echo-best"), 10) || 0;
    } catch (e) {}
    bestOut.textContent = best;

    function setState(next, message) {
      state = next;
      panel.setAttribute("data-state", next);
      if (message !== undefined) status.textContent = message;

      var playable = next === "input";
      pads.forEach(function (pad) {
        pad.setAttribute("aria-disabled", String(!playable));
        pad.setAttribute("tabindex", playable ? "0" : "-1");
      });

      // The hub holds the Play button between games and the round number during one.
      var between = next === "idle" || next === "over";
      startButton.hidden = !between;
      roundOut.hidden = between;
    }

    function flash(index, ms) {
      var pad = pads[index];
      pad.classList.add("is-lit");
      setTimeout(function () {
        pad.classList.remove("is-lit");
      }, ms);
      tone(NOTES[index], ms);
    }

    function enter() {
      panel.classList.remove("is-entering");
      void panel.offsetWidth; // restart the animation if it has run before
      panel.classList.add("is-entering");

      // Each wedge chimes its own note, an octave up, as it settles into place.
      pads.forEach(function (_, i) {
        chime(NOTES[i] * 2, (ENTER_START + i * ENTER_STAGGER + ENTER_DURATION * 0.55) / 1000, 0.12);
      });
      // Then a soft sparkle as the hub arrives.
      var hub = (ENTER_START + pads.length * ENTER_STAGGER + 80 + 250) / 1000;
      chime(NOTES[0] * 4, hub, 0.05);
      chime(NOTES[2] * 4, hub + 0.07, 0.045);
      chime(NOTES[4] * 4, hub + 0.14, 0.04);
    }

    function playSequence() {
      var run = generation;
      setState("listen", copy("listen"));
      // The melody quickens a little as it lengthens, but never becomes a blur.
      var noteMs = Math.max(230, 420 - sequence.length * 18);
      var gapMs = Math.max(90, 150 - sequence.length * 4);

      sequence.forEach(function (index, i) {
        setTimeout(
          function () {
            if (run === generation) flash(index, noteMs);
          },
          650 + i * (noteMs + gapMs),
        );
      });

      setTimeout(
        function () {
          if (run !== generation) return;
          position = 0;
          setState("input", copy("your-turn"));
        },
        650 + sequence.length * (noteMs + gapMs),
      );
    }

    function nextRound() {
      sequence.push(Math.floor(Math.random() * NOTES.length));
      roundOut.textContent = sequence.length;
      playSequence();
    }

    function newGame() {
      generation++;
      audio();
      sequence = [];
      startedAt = Date.now();
      track("echo-start");
      panel.classList.remove("is-wrong");
      nextRound();
    }

    function gameOver() {
      generation++;
      var cleared = sequence.length - 1;
      buzz();

      panel.classList.remove("is-wrong");
      void panel.offsetWidth; // restart the wobble if it just ran
      panel.classList.add("is-wrong");

      var message = copy("over").replace("{score}", cleared);
      var newBest = cleared > best;
      if (newBest) {
        best = cleared;
        bestOut.textContent = best;
        try {
          localStorage.setItem("echo-best", String(best));
        } catch (e) {}
        message = copy("new-best").replace("{score}", cleared);
      }

      startButton.textContent = copy("again");
      setState("over", message);
      startButton.focus({ preventScroll: true });
      track("echo-game-over", {
        score: cleared,
        best: best,
        newBest: newBest,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      });
      if (newBest) track("echo-new-best", { best: best });
    }

    function press(index) {
      if (state !== "input") return;
      if (index !== sequence[position]) return gameOver();

      flash(index, 220);
      position++;
      if (position === sequence.length) {
        setState("listen", "");
        setTimeout(function () {
          if (state === "listen") nextRound();
        }, 520);
      }
    }

    trigger.addEventListener("click", function () {
      audio(); // unlock sound while we still have the click's user gesture
      var opening = panel.hidden;
      panel.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));

      if (opening) {
        enter();
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        startButton.focus({ preventScroll: true });
        track("echo-open");
      } else {
        // Closing mid-game abandons it; reopening starts clean rather than stuck.
        if (state === "listen" || state === "input") {
          track("echo-quit", { round: sequence.length });
        }
        generation++;
        sequence = [];
        roundOut.textContent = 0;
        panel.classList.remove("is-wrong", "is-entering");
        startButton.textContent = startLabel;
        setState("idle", "");
      }
    });

    startButton.addEventListener("click", newGame);

    pads.forEach(function (pad, index) {
      pad.addEventListener("click", function () {
        press(index);
      });
      // SVG paths aren't native buttons, so Enter and Space are wired up by hand.
      pad.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          press(index);
        }
      });
    });

    document.addEventListener("keydown", function (event) {
      if (panel.hidden || event.metaKey || event.ctrlKey || event.altKey) return;
      var index = KEYMAP[event.key.toLowerCase()];
      if (index === undefined || state !== "input") return;
      event.preventDefault();
      press(index);
    });

    setState("idle", "");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
