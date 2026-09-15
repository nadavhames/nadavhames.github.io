/* Sends the contact form inline instead of navigating away to Web3Forms. */
(function () {
  function start() {
    var form = document.querySelector("[data-contact-form]");
    if (!form || !window.fetch || !window.FormData) return;

    var status = form.querySelector("[data-contact-status]");
    var button = form.querySelector('button[type="submit"]');
    var label = form.querySelector("[data-contact-label]");
    var idle = label.textContent;

    function track(name) {
      if (window.umami && typeof window.umami.track === "function") window.umami.track(name);
    }

    function settle(state, message) {
      form.setAttribute("data-state", state);
      status.textContent = message;
      button.disabled = false;
      label.textContent = idle;
    }

    // Only fires once the browser's own validation has passed.
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (button.disabled) return;

      form.setAttribute("data-state", "sending");
      status.textContent = "";
      button.disabled = true;
      label.textContent = form.getAttribute("data-sending");

      // An unchecked checkbox is left out of FormData, so the honeypot is
      // only sent when a bot has ticked it.
      var body = JSON.stringify(Object.fromEntries(new FormData(form)));

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: body,
      })
        .then(function (response) {
          return response.json().then(function (json) {
            if (!response.ok || !json.success) throw new Error(json.message || response.status);
          });
        })
        .then(function () {
          form.reset();
          settle("sent", form.getAttribute("data-sent"));
          track("contact-submit");
        })
        .catch(function () {
          settle("error", form.getAttribute("data-error"));
          track("contact-error");
        });
    });

    // Editing again after a result clears it, so a stale "sent" doesn't linger.
    form.addEventListener("input", function () {
      var state = form.getAttribute("data-state");
      if (state === "sent" || state === "error") {
        form.removeAttribute("data-state");
        status.textContent = "";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
