/* Two-screen Othello over a PeerJS data channel. The host plays black and moves first. */
(function () {
  // Pinned, with the same file on two CDNs: if the first is down, the second is tried,
  // and if neither loads the page says online play is unavailable.
  var PEERJS_VERSION = "1.5.5";
  var PEERJS_SOURCES = [
    "https://cdn.jsdelivr.net/npm/peerjs@" + PEERJS_VERSION + "/dist/peerjs.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/peerjs/" + PEERJS_VERSION + "/peerjs.min.js",
  ];
  var PEERJS_INTEGRITY = "sha384-x0YgkOr/3UOZP2CRDxGW9e0Q+2Qjyr3uJrm4xU32Y7ZCNAo7Cc7bjhrZMi/dwczu";

  // PeerJS's free cloud server is shared by everyone, so a short code is namespaced
  // before it becomes a peer ID. No 0/O or 1/I, which are easy to misread.
  var ID_PREFIX = "nadavhames-othello-";
  var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var CODE_LENGTH = 6;

  var PING_EVERY = 3000;
  var SILENCE_LIMIT = 15000;

  var SIZE = 8;
  var DIRECTIONS = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  var INTRO_STEP = 500;

  var root = document.querySelector("[data-othello-online]");
  if (!root) return;

  // The page's wording rides along as data-text-* attributes: data-text-your-turn → copy.yourTurn.
  var copy = {};
  Object.keys(root.dataset).forEach(function (key) {
    if (/^text[A-Z]/.test(key))
      copy[key.charAt(4).toLowerCase() + key.slice(5)] = root.dataset[key];
  });
  var $ = function (name) {
    return root.querySelector("[data-" + name + "]");
  };
  var lobby = $("lobby");
  var choose = $("choose");
  var hostButton = $("host");
  var joinButton = $("join-open");
  var invite = $("invite");
  var codeOut = $("code");
  var copyButton = $("copy");
  var joinForm = $("join-form");
  var lobbyStatus = $("lobby-status");
  var game = $("game");
  var youOut = $("you");
  var status = $("status");
  var rematchButton = $("rematch");
  var startOver = $("start-over");
  var turnCell = document.getElementById("turncolor");
  var turnText = document.getElementById("turn");
  var cells = Array.prototype.slice.call(document.querySelectorAll("#board td"));

  var peer = null;
  var conn = null;
  var isHost = false;
  var me = null;
  var board = [];
  var turn = "black";
  var boardColour = "";
  var playing = false;
  var over = false;
  var wantRematch = false;
  var theyWantRematch = false;
  var generation = 0;
  var gone = false;
  var away = false;
  var statusBeforeAway = "";
  var lastHeard = 0;
  var heartbeat = null;

  function canMove() {
    return playing && !over && !away && !gone && turn === me;
  }

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return values[key];
    });
  }

  function other(colour) {
    return colour === "black" ? "white" : "black";
  }

  /* ---------- rules ---------- */

  function discsFlippedBy(index, colour) {
    if (board[index]) return [];
    var row = Math.floor(index / SIZE);
    var col = index % SIZE;
    var flipped = [];
    DIRECTIONS.forEach(function (d) {
      var run = [];
      var r = row + d[0];
      var c = col + d[1];
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === other(colour)) {
        run.push(r * SIZE + c);
        r += d[0];
        c += d[1];
      }
      if (
        run.length &&
        r >= 0 &&
        r < SIZE &&
        c >= 0 &&
        c < SIZE &&
        board[r * SIZE + c] === colour
      ) {
        flipped = flipped.concat(run);
      }
    });
    return flipped;
  }

  function legalMoves(colour) {
    var moves = [];
    for (var i = 0; i < board.length; i++) {
      if (discsFlippedBy(i, colour).length) moves.push(i);
    }
    return moves;
  }

  /* ---------- drawing ---------- */

  // Discs must be literal black and white, so the board colour stays clear of both.
  function randomBoardColour() {
    var hue = Math.floor(Math.random() * 360);
    return "hsl(" + hue + ", 55%, 38%)";
  }

  function render() {
    var moves = canMove() ? legalMoves(me) : [];
    cells.forEach(function (cell, i) {
      cell.style.backgroundColor = board[i] || boardColour;
      cell.classList.toggle("is-legal", moves.indexOf(i) !== -1);
    });

    turnCell.style.backgroundColor = turn;
    turnCell.style.borderColor = turn;
    turnText.style.color = other(turn);
    turnText.textContent = turn === me ? copy.yourTurn : copy.theirTurn;
  }

  // Colours the board in rings from the centre outwards, then sets out the first four discs.
  function intro(done) {
    var run = generation;
    cells.forEach(function (cell) {
      cell.style.backgroundColor = "";
      cell.classList.remove("is-legal");
    });
    [0, 1, 2, 3].forEach(function (ring) {
      setTimeout(function () {
        if (run !== generation) return;
        cells.forEach(function (cell, i) {
          var row = Math.floor(i / SIZE);
          var col = i % SIZE;
          var distance = Math.max(Math.abs(row - 3.5), Math.abs(col - 3.5)) - 0.5;
          if (distance === ring) cell.style.backgroundColor = boardColour;
        });
      }, ring * INTRO_STEP);
    });
    setTimeout(function () {
      if (run === generation) done();
    }, 4 * INTRO_STEP);
  }

  /* ---------- play ---------- */

  function newBoard() {
    board = [];
    for (var i = 0; i < SIZE * SIZE; i++) board.push(null);
    board[27] = "black";
    board[28] = "white";
    board[35] = "white";
    board[36] = "black";
  }

  function begin(colour) {
    generation++;
    boardColour = colour;
    newBoard();
    turn = "black";
    playing = false;
    over = false;
    wantRematch = false;
    theyWantRematch = false;

    lobby.hidden = true;
    game.hidden = false;
    rematchButton.hidden = true;
    startOver.hidden = true;
    rematchButton.disabled = false;
    youOut.textContent = fill(copy.youPlay, { colour: copy[me] });
    status.textContent = "";
    turnText.textContent = "";
    turnCell.style.backgroundColor = "";
    turnCell.style.borderColor = "";

    intro(function () {
      playing = true;
      render();
    });
  }

  function play(index, colour) {
    var flipped = discsFlippedBy(index, colour);
    if (!flipped.length) return false;

    board[index] = colour;
    flipped.forEach(function (i) {
      board[i] = colour;
    });
    status.textContent = "";

    var next = other(colour);
    if (legalMoves(next).length) {
      turn = next;
    } else if (legalMoves(colour).length) {
      // The other player can't move, so the same player goes again.
      turn = colour;
      status.textContent = next === me ? copy.youPass : copy.theyPass;
    } else {
      finish();
    }
    render();
    return true;
  }

  function finish() {
    over = true;
    var mine = 0;
    var theirs = 0;
    board.forEach(function (disc) {
      if (disc === me) mine++;
      else if (disc) theirs++;
    });
    var template = mine > theirs ? copy.win : mine < theirs ? copy.lose : copy.tie;
    status.textContent = fill(template, { you: mine, them: theirs });
    rematchButton.hidden = false;
  }

  function startRematch() {
    var colour = randomBoardColour();
    send({ type: "start", colour: colour });
    begin(colour);
  }

  /* ---------- connection ---------- */

  function send(message) {
    if (conn && conn.open) conn.send(message);
  }

  function setLobbyStatus(message) {
    lobbyStatus.textContent = message || "";
  }

  function randomCode() {
    var code = "";
    var bytes = new Uint32Array(CODE_LENGTH);
    crypto.getRandomValues(bytes);
    for (var i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return code;
  }

  function cleanCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function inviteLink(code) {
    return location.origin + location.pathname + "?join=" + code;
  }

  function opponentGone() {
    if (gone || lobby.hidden === false) return;
    gone = true;
    clearInterval(heartbeat);
    render();
    status.textContent = copy.left;
    rematchButton.hidden = true;
    startOver.hidden = false;
  }

  // A closed tab doesn't always close the data channel, and a phone that switches apps
  // pauses without closing anything, so both sides ping. Silence shows the opponent as
  // away, and the game picks up again if they come back.
  function watchOpponent() {
    lastHeard = Date.now();
    clearInterval(heartbeat);
    heartbeat = setInterval(function () {
      send({ type: "ping" });
      var silent = Date.now() - lastHeard > SILENCE_LIMIT;
      if (silent && !away && lobby.hidden) {
        away = true;
        statusBeforeAway = status.textContent;
        status.textContent = copy.away;
        startOver.hidden = false;
        render();
      }
    }, PING_EVERY);
  }

  function heardFromOpponent() {
    lastHeard = Date.now();
    if (!away || gone) return;
    away = false;
    status.textContent = statusBeforeAway;
    startOver.hidden = true;
    render();
  }

  function useConnection(connection) {
    conn = connection;

    conn.on("open", watchOpponent);

    conn.on("data", function (message) {
      if (!message || typeof message !== "object") return;
      heardFromOpponent();

      if (message.type === "start" && !isHost) {
        begin(String(message.colour));
      } else if (message.type === "move") {
        // Only accept a move that is the opponent's to make and legal on this board.
        if (!playing || over || turn === me) return;
        play(Number(message.index), turn);
      } else if (message.type === "rematch" && over) {
        theyWantRematch = true;
        if (wantRematch) {
          if (isHost) startRematch();
        } else {
          status.textContent = copy.rematchOffered;
        }
      }
    });

    conn.on("close", opponentGone);
    conn.on("error", opponentGone);
    conn.on("iceStateChanged", function (state) {
      if (state === "failed" || state === "closed") opponentGone();
    });
  }

  function explain(error) {
    var type = error && error.type;
    if (type === "peer-unavailable") return copy.notFound;
    if (
      type === "network" ||
      type === "server-error" ||
      type === "socket-error" ||
      type === "socket-closed"
    ) {
      return copy.serverDown;
    }
    return copy.failed;
  }

  function resetLobby() {
    if (peer) peer.destroy();
    peer = null;
    conn = null;
    choose.hidden = false;
    hostButton.disabled = false;
    joinButton.disabled = false;
    invite.hidden = true;
  }

  function host(attempt) {
    attempt = attempt || 0;
    isHost = true;
    me = "black";
    var code = randomCode();

    choose.hidden = true;
    joinForm.hidden = true;
    setLobbyStatus(copy.connecting);

    peer = new window.peerjs.Peer(ID_PREFIX + code);

    peer.on("open", function () {
      codeOut.textContent = code;
      invite.hidden = false;
      setLobbyStatus("");
    });

    peer.on("connection", function (connection) {
      // A game has two players; anyone else who finds the code is turned away.
      if (conn) {
        connection.on("open", function () {
          connection.close();
        });
        return;
      }
      useConnection(connection);
      connection.on("open", startRematch);
    });

    peer.on("error", function (error) {
      if (error.type === "unavailable-id" && attempt < 3) {
        peer.destroy();
        host(attempt + 1);
        return;
      }
      if (conn && conn.open) return; // the game itself carries on without the server
      resetLobby();
      setLobbyStatus(explain(error));
    });
  }

  function join(code) {
    isHost = false;
    me = "white";

    choose.hidden = true;
    joinForm.hidden = true;
    setLobbyStatus(fill(copy.joining, { code: code }));

    peer = new window.peerjs.Peer();

    peer.on("open", function () {
      useConnection(peer.connect(ID_PREFIX + code, { reliable: true, serialization: "json" }));
    });

    peer.on("error", function (error) {
      if (conn && conn.open) return;
      resetLobby();
      joinForm.hidden = false;
      joinForm.elements.code.value = code;
      setLobbyStatus(explain(error));
    });
  }

  /* ---------- controls ---------- */

  hostButton.addEventListener("click", function () {
    host(0);
  });

  joinButton.addEventListener("click", function () {
    choose.hidden = true;
    joinForm.hidden = false;
    setLobbyStatus("");
    joinForm.elements.code.focus();
  });

  joinForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var code = cleanCode(joinForm.elements.code.value);
    if (code) join(code);
  });

  copyButton.addEventListener("click", function () {
    var link = inviteLink(codeOut.textContent);
    var label = copy.copyLink;
    var done = function () {
      copyButton.textContent = copy.copied;
      setTimeout(function () {
        copyButton.textContent = label;
      }, 1600);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(done, function () {
        window.prompt("", link);
      });
    } else {
      window.prompt("", link);
    }
  });

  cells.forEach(function (cell, index) {
    cell.addEventListener("mouseenter", function () {
      if (cell.classList.contains("is-legal")) cell.style.backgroundColor = me;
    });
    cell.addEventListener("mouseleave", function () {
      if (cell.classList.contains("is-legal")) cell.style.backgroundColor = boardColour;
    });
    cell.addEventListener("click", function () {
      if (!canMove() || !cell.classList.contains("is-legal")) return;
      if (play(index, me)) send({ type: "move", index: index });
    });
  });

  rematchButton.addEventListener("click", function () {
    wantRematch = true;
    rematchButton.disabled = true;
    send({ type: "rematch" });
    if (theyWantRematch) {
      if (isHost) startRematch();
    } else {
      status.textContent = copy.rematchSent;
    }
  });

  // Closing the tab tells the other player straight away rather than after a timeout.
  window.addEventListener("pagehide", function () {
    if (peer) peer.destroy();
  });

  /* ---------- start ---------- */

  function loadPeerJs(index, done) {
    if (window.peerjs) return done();
    if (index >= PEERJS_SOURCES.length) return done();
    var script = document.createElement("script");
    script.src = PEERJS_SOURCES[index];
    script.integrity = PEERJS_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.onload = done;
    script.onerror = function () {
      script.remove();
      loadPeerJs(index + 1, done);
    };
    document.head.appendChild(script);
  }

  loadPeerJs(0, function () {
    if (!window.peerjs || !window.peerjs.util.supports.data) {
      choose.hidden = true;
      $("unavailable").hidden = false;
      return;
    }

    hostButton.disabled = false;
    joinButton.disabled = false;

    // Opened from an invite link: join straight away, and drop the code from the
    // address so a refresh doesn't try to rejoin a game that has moved on.
    var invited = cleanCode(new URLSearchParams(location.search).get("join"));
    if (invited) {
      history.replaceState(null, "", location.pathname);
      join(invited);
    }
  });
})();
