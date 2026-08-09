/**
 * N Queens page glue: manual play board + Watch Algorithm mode.
 * Algorithm logic lives in nqueens-solver.js (NQ.*); this file only
 * renders state and wires up interactions.
 */
(function () {
    "use strict";

    var MIN_N = 4;
    var MAX_N = 10;
    var DEFAULT_N = 8;
    var STORAGE_KEY = "nqueens:state";

    // ---- manual play state ----
    var n = DEFAULT_N;
    var queens = []; // [{r,c}, ...]
    var history = []; // snapshots of `queens` before each mutation
    var lastHintMsg = "";

    // ---- watch-algorithm state ----
    var watchN = null;
    var watchTrace = null;
    var watchSolved = false;
    var playback = null;

    var els = {};

    function qid(r, c) {
        return r + "," + c;
    }

    function saveState() {
        NXNStorage.set(STORAGE_KEY, { n: n, queens: queens });
    }

    function loadState() {
        var saved = NXNStorage.get(STORAGE_KEY, null);
        if (saved && typeof saved.n === "number" && saved.n >= MIN_N && saved.n <= MAX_N && Array.isArray(saved.queens)) {
            n = saved.n;
            queens = saved.queens.filter(function (q) {
                return q && q.r >= 0 && q.r < n && q.c >= 0 && q.c < n;
            });
        }
    }

    function pushHistory() {
        history.push(queens.map(function (q) {
            return { r: q.r, c: q.c };
        }));
        if (history.length > 100) history.shift();
    }

    function hasQueen(r, c) {
        return queens.some(function (q) {
            return q.r === r && q.c === c;
        });
    }

    function toggleQueen(r, c) {
        pushHistory();
        if (hasQueen(r, c)) {
            queens = queens.filter(function (q) {
                return !(q.r === r && q.c === c);
            });
        } else {
            queens.push({ r: r, c: c });
        }
        lastHintMsg = "";
        saveState();
        renderManual();
    }

    function resetManual() {
        history = [];
        queens = [];
        lastHintMsg = "";
        saveState();
        renderManual();
    }

    function undoManual() {
        if (!history.length) return;
        queens = history.pop();
        lastHintMsg = "";
        saveState();
        renderManual();
    }

    function hintManual() {
        var conflictInfo = NQ.computeConflicts(queens);
        if (conflictInfo.queenKeys.size) {
            var firstConflict = queens.find(function (q) {
                return conflictInfo.queenKeys.has(qid(q.r, q.c));
            });
            lastHintMsg =
                "Queen at row " + firstConflict.r + ", column " + firstConflict.c +
                " is under attack — remove it or move it before adding more queens.";
            renderManual();
            return;
        }
        var solution = NQ.solveFromPartial(n, queens);
        if (!solution) {
            lastHintMsg = "Your current queens can't be extended to a full solution — try Undo on your last move.";
            renderManual();
            return;
        }
        var targetRow = -1;
        for (var r = 0; r < n; r++) {
            if (!hasQueen(r, solution[r])) {
                targetRow = r;
                break;
            }
        }
        if (targetRow === -1) return; // already complete
        pushHistory();
        queens.push({ r: targetRow, c: solution[targetRow] });
        lastHintMsg = "Placed a queen at row " + targetRow + ", column " + solution[targetRow] + " — safe with your other queens.";
        saveState();
        renderManual();
    }

    function buildBoardCells(boardEl, size, interactive) {
        boardEl.innerHTML = "";
        boardEl.style.setProperty("--n", size);
        var cells = [];
        for (var r = 0; r < size; r++) {
            var row = [];
            for (var c = 0; c < size; c++) {
                var cell = document.createElement(interactive ? "button" : "div");
                if (interactive) cell.type = "button";
                else cell.setAttribute("aria-hidden", "true");
                cell.className = "nq-cell" + ((r + c) % 2 === 1 ? " dark" : "");
                boardEl.appendChild(cell);
                row.push(cell);
            }
            cells.push(row);
        }
        return cells;
    }

    var manualCells = null;

    function renderManual() {
        if (manualCells === null || manualCells.length !== n) {
            manualCells = buildBoardCells(els.board, n, true);
            manualCells.forEach(function (row, r) {
                row.forEach(function (cell, c) {
                    cell.addEventListener("click", function () {
                        toggleQueen(r, c);
                    });
                });
            });
        }

        var conflictInfo = NQ.computeConflicts(queens);
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                var cell = manualCells[r][c];
                var key = qid(r, c);
                var occupied = hasQueen(r, c);
                var conflicted = conflictInfo.queenKeys.has(key);
                var onLine = conflictInfo.lineKeys.has(key) && !occupied;
                cell.classList.toggle("has-queen", occupied);
                cell.classList.toggle("attacked", occupied && conflicted);
                cell.classList.toggle("line-conflict", onLine);
                cell.innerHTML = occupied
                    ? '<span class="nq-piece" aria-hidden="true">♛</span>' + (conflicted ? '<span class="nq-warn" aria-hidden="true">!</span>' : "")
                    : "";
                cell.setAttribute(
                    "aria-label",
                    "Row " + r + ", column " + c + (occupied ? (conflicted ? ", queen placed, conflicting" : ", queen placed") : ", empty")
                );
            }
        }

        var count = queens.length;
        els.placedCount.textContent = String(count);
        els.neededCount.textContent = String(n);
        els.conflictCount.textContent = String(conflictInfo.queenKeys.size);

        var solved = count === n && conflictInfo.queenKeys.size === 0;
        els.message.classList.toggle("hidden", !solved);
        els.hintMsg.textContent = lastHintMsg;
        els.hintMsg.classList.toggle("hidden", !lastHintMsg);
        els.undoBtn.disabled = history.length === 0;
    }

    // ---------------- Watch Algorithm mode ----------------

    var watchCells = null;
    var expBullets = null;

    function ensureWatchTrace() {
        if (watchTrace && watchN === n) return;
        watchN = n;
        var result = NQ.generateTrace(n);
        watchTrace = result.trace;
        watchSolved = result.solved;
        if (playback) playback.destroy();
        watchCells = buildBoardCells(els.algoBoard, n, false);
        playback = createPlaybackControls(els.playbackContainer, {
            stepCount: function () {
                return watchTrace.length;
            },
            onRender: renderAlgoStep,
        });
    }

    function explanationKeyFor(type) {
        if (type === "test") return "exp-values";
        if (type === "accept") return "exp-variable";
        if (type === "reject") return "exp-constraint";
        if (type === "backtrack") return "exp-backtrack";
        return null;
    }

    function renderAlgoStep(idx) {
        var step = watchTrace[idx];
        for (var r = 0; r < watchN; r++) {
            for (var c = 0; c < watchN; c++) {
                var cell = watchCells[r][c];
                var occupied = step.rows[r] === c;
                var isActive = step.row === r && step.col === c;
                var isGhost = step.type === "backtrack" && isActive;
                cell.classList.toggle("has-queen", occupied || isGhost);
                cell.classList.toggle("testing", isActive && step.type === "test");
                cell.classList.toggle("accepted", isActive && step.type === "accept");
                cell.classList.toggle("rejected", isActive && step.type === "reject");
                cell.classList.toggle("ghost-removed", isGhost);
                cell.innerHTML = occupied || isGhost ? '<span class="nq-piece" aria-hidden="true">♛</span>' : "";
                var label = "Row " + r + ", column " + c;
                if (isGhost) label += ", queen just removed";
                else if (occupied) label += ", queen placed";
                cell.setAttribute("aria-label", label);
            }
        }

        els.statusMsg.textContent = step.message;
        els.wRow.textContent = step.type === "solved" ? "done" : String(step.row);
        els.wTested.textContent = String(step.tested);
        els.wBacktracks.textContent = String(step.backtracks);

        var activeKey = explanationKeyFor(step.type);
        expBullets.forEach(function (li) {
            li.classList.toggle("active", li.dataset.exp === activeKey);
        });

        if (idx === watchTrace.length - 1) {
            els.watchDone.classList.toggle("hidden", !watchSolved);
        } else {
            els.watchDone.classList.add("hidden");
        }
    }

    // ---------------- tabs ----------------

    function selectTab(name) {
        var manual = name === "manual";
        els.tabManual.setAttribute("aria-selected", String(manual));
        els.tabWatch.setAttribute("aria-selected", String(!manual));
        els.panelManual.classList.toggle("hidden", !manual);
        els.panelWatch.classList.toggle("hidden", manual);
        if (!manual) {
            ensureWatchTrace();
            playback.refresh();
        }
    }

    // ---------------- board size ----------------

    function onSizeChange(newN) {
        n = newN;
        manualCells = null;
        history = [];
        queens = [];
        lastHintMsg = "";
        saveState();
        renderManual();
        watchTrace = null; // force regeneration on next watch-tab view
        if (!els.panelWatch.classList.contains("hidden")) {
            ensureWatchTrace();
            playback.refresh();
        }
    }

    function buildSizeOptions() {
        for (var size = MIN_N; size <= MAX_N; size++) {
            var opt = document.createElement("option");
            opt.value = String(size);
            opt.textContent = size + " × " + size;
            if (size === n) opt.selected = true;
            els.sizeSelect.appendChild(opt);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        els = {
            sizeSelect: document.getElementById("nq-size"),
            board: document.getElementById("nq-board"),
            placedCount: document.getElementById("nq-placed"),
            neededCount: document.getElementById("nq-needed"),
            conflictCount: document.getElementById("nq-conflicts"),
            message: document.getElementById("nq-message"),
            hintMsg: document.getElementById("nq-hint-msg"),
            resetBtn: document.getElementById("nq-reset"),
            undoBtn: document.getElementById("nq-undo"),
            hintBtn: document.getElementById("nq-hint"),
            tabManual: document.getElementById("tab-manual"),
            tabWatch: document.getElementById("tab-watch"),
            panelManual: document.getElementById("panel-manual"),
            panelWatch: document.getElementById("panel-watch"),
            algoBoard: document.getElementById("nq-algo-board"),
            statusMsg: document.getElementById("nq-status-msg"),
            wRow: document.getElementById("nqw-row"),
            wTested: document.getElementById("nqw-tested"),
            wBacktracks: document.getElementById("nqw-backtracks"),
            playbackContainer: document.getElementById("nq-playback"),
            watchDone: document.getElementById("nq-watch-done"),
        };

        expBullets = Array.prototype.slice.call(document.querySelectorAll("[data-exp]"));

        loadState();
        buildSizeOptions();
        renderManual();

        els.sizeSelect.addEventListener("change", function () {
            onSizeChange(Number(els.sizeSelect.value));
        });
        els.resetBtn.addEventListener("click", resetManual);
        els.undoBtn.addEventListener("click", undoManual);
        els.hintBtn.addEventListener("click", hintManual);

        els.tabManual.addEventListener("click", function () {
            selectTab("manual");
        });
        els.tabWatch.addEventListener("click", function () {
            selectTab("watch");
        });
        els.tabManual.addEventListener("keydown", function (e) {
            if (e.key === "ArrowRight") els.tabWatch.focus();
        });
        els.tabWatch.addEventListener("keydown", function (e) {
            if (e.key === "ArrowLeft") els.tabManual.focus();
        });
    });
})();
