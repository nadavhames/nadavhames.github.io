/* ---------------------------------------------------------------------------
   Résumé hover preview.

   Renders page 1 of the live PDF, so swapping in a new résumé file is the only
   step needed — nothing here is baked from the old one. pdf.js is fetched on
   the first hint of hover, so visitors who never hover pay nothing for it.
--------------------------------------------------------------------------- */
(function () {
  var PDFJS_VERSION = "3.11.174";
  var PDFJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION + "/pdf.min.js";
  var PDFJS_WORKER =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION + "/pdf.worker.min.js";

  var libPromise = null;

  function loadPdfJs() {
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = PDFJS_SRC;
      s.crossOrigin = "anonymous";
      s.onload = function () {
        if (!window.pdfjsLib) return reject(new Error("pdf.js did not initialise"));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      s.onerror = function () {
        reject(new Error("could not load pdf.js"));
      };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function setUp(peek) {
    var link = peek.querySelector("[data-peek-link]");
    var canvas = peek.querySelector("[data-peek-canvas]");
    var count = peek.querySelector("[data-peek-count]");
    if (!link || !canvas) return;

    var url = link.getAttribute("href");
    var started = false;

    // The trigger link is the single source of truth for the file path, so
    // the card can never drift out of sync with it.
    var cardLink = peek.querySelector("a.peek__card");
    if (cardLink) cardLink.setAttribute("href", url);

    function fail() {
      peek.classList.remove("is-loading");
      peek.classList.add("is-error");
    }

    function render() {
      if (started) return;
      started = true;
      peek.classList.add("is-loading");
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track("resume-preview");
      }

      loadPdfJs()
        .then(function (pdfjsLib) {
          return pdfjsLib.getDocument(url).promise;
        })
        .then(function (doc) {
          if (count && doc.numPages > 1) {
            count.textContent = "Page 1 of " + doc.numPages;
          }
          return doc.getPage(1);
        })
        .then(function (page) {
          // Card width × DPR, so the text stays crisp on retina.
          var cssWidth = canvas.parentElement.clientWidth || 300;
          var base = page.getViewport({ scale: 1 });
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          var viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.aspectRatio = base.width + " / " + base.height;

          return page.render({
            canvasContext: canvas.getContext("2d"),
            viewport: viewport,
          }).promise;
        })
        .then(function () {
          peek.classList.remove("is-loading");
          peek.classList.add("is-ready");
        })
        .catch(fail);
    }

    ["pointerenter", "focusin"].forEach(function (evt) {
      peek.addEventListener(evt, render, { once: true, passive: true });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var peeks = document.querySelectorAll("[data-resume-peek]");
    if (!peeks.length) return;
    if (!("Promise" in window)) return; // link still works on its own

    // The card only ever shows where hovering is a real gesture (same
    // condition as the CSS), so don't pull down pdf.js anywhere else.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    Array.prototype.forEach.call(peeks, setUp);
  });
})();
