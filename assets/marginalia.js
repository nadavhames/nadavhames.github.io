/* ---------------------------------------------------------------------------
   Parallax for the margin symbols.

   Each symbol carries a --speed (0.1 far … 0.44 near) and a starting --y; on
   scroll they move by scrollY × speed, wrapped around a band a little taller
   than the viewport so the field never runs out. The layer is position: fixed,
   so this is transform-only work batched into one rAF per scroll burst.
--------------------------------------------------------------------------- */
(function () {
  function start() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var layer = document.querySelector(".marginalia");
    if (!layer) return;

    var nodes = layer.querySelectorAll("span");
    if (!nodes.length) return;

    var items = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var cs = getComputedStyle(el);
      items.push({
        el: el,
        speed: parseFloat(cs.getPropertyValue("--speed")) || 0.2,
        y: parseFloat(cs.getPropertyValue("--y")) || 0,
        rot: cs.getPropertyValue("--rot").trim() || "0deg",
      });
    }

    var band = 0; // wrap height: viewport plus margin for the largest symbol
    var pending = false;

    function measure() {
      band = window.innerHeight + 240;
      place();
    }

    function place() {
      var scrolled = window.scrollY || window.pageYOffset || 0;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var y = (it.y / 100) * band - scrolled * it.speed;
        y %= band;
        if (y < 0) y += band;
        // -50% centres the glyph on its --x; see the stylesheet.
        it.el.style.transform = "translate3d(-50%," + (y - 120) + "px,0) rotate(" + it.rot + ")";
      }
      pending = false;
    }

    function onScroll() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(place);
    }

    measure();
    layer.classList.add("is-live");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
