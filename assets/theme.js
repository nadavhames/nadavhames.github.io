/* Theme toggle and the sticky-header hairline. */
(function () {
  var root = document.documentElement;

  function apply(mode) {
    if (mode === "light" || mode === "dark") {
      root.setAttribute("data-theme", mode);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function current() {
    var stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (e) {}
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = current() === "light" ? "dark" : "light";
        apply(next);
        try {
          localStorage.setItem("theme", next);
        } catch (e) {}
      });
    }

    var bar = document.querySelector(".topbar");
    if (bar) {
      var onScroll = function () {
        bar.classList.toggle("is-stuck", window.scrollY > 4);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  });

  // Links marked data-scroll-to glide to their section. When the section isn't on
  // this page (the 404) nothing is intercepted and the link navigates normally.
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("[data-scroll-to]");
    if (!link) return;
    var target = document.getElementById(link.getAttribute("data-scroll-to"));
    if (!target) return;

    event.preventDefault();
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });

    // A keyboard activation reports detail 0, so move focus into the form for
    // those users — but not on a tap, where it would pop up the on-screen keyboard.
    if (event.detail === 0) {
      var field = target.querySelector(
        'input:not([type="hidden"]):not([type="checkbox"]), textarea',
      );
      if (field) field.focus({ preventScroll: true });
    }
  });
})();
