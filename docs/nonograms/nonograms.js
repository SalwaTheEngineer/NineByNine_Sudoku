/**
 * Nonograms page glue: puzzle selector, manual play (Fill/X tools, Reset,
 * Undo, Hint, Check Puzzle, progress, completion) and Watch Algorithm mode.
 * Algorithm logic lives in nonograms-solver.js (NONO.*) and puzzle data in
 * nonograms-data.js (NONOGRAM_PUZZLES); this file only renders + wires up.
 */
(function () {
    "use strict";

    var STORAGE_KEY = "nonograms:state";

    var puzzle = null;
    var marks = null; // n x n of 'unknown' | 'fill' | 'x'
    var history = []; // [{r,c,prev}]
    var tool = "fill"; // 'fill' | 'x'
    var checkErrors = new Set(); // "r,c" keys flagged by the last Check Puzzle
    var checkMsg = "";
    var hintMsg = "";

    var watchPuzzleId = null;
    var watchTrace = null;
    var watchSolved = false;
    var playback = null;

    var els = {};
    var boardCells = null;
    var watchCells = null;
    var expBullets = null;

    function findPuzzle(id) {
        return NONOGRAM_PUZZLES.find(function (p) {
            return p.id === id;
        });
    }

    function key(r, c) {
        return r + "," + c;
    }

    function emptyMarks(n) {
        var g = [];
        for (var r = 0; r < n; r++) g.push(new Array(n).fill("unknown"));
        return g;
    }

    function saveState() {
        NXNStorage.set(STORAGE_KEY, { puzzleId: puzzle.id, marks: marks });
    }

    function loadInitialPuzzle() {
        var saved = NXNStorage.get(STORAGE_KEY, null);
        if (saved && findPuzzle(saved.puzzleId) && Array.isArray(saved.marks) && saved.marks.length === findPuzzle(saved.puzzleId).size) {
            puzzle = findPuzzle(saved.puzzleId);
            marks = saved.marks;
        } else {
            puzzle = NONOGRAM_PUZZLES[0];
            marks = emptyMarks(puzzle.size);
        }
    }

    function loadPuzzle(id, resetProgress) {
        puzzle = findPuzzle(id);
        marks = resetProgress ? emptyMarks(puzzle.size) : marks;
        history = [];
        checkErrors = new Set();
        checkMsg = "";
        hintMsg = "";
        boardCells = null;
        saveState();
        renderManualBoard();
    }

    // ---------------- manual play ----------------

    function lineRuns(booleans) {
        var runs = [];
        var count = 0;
        booleans.forEach(function (b) {
            if (b) count++;
            else {
                if (count) runs.push(count);
                count = 0;
            }
        });
        if (count) runs.push(count);
        return runs.length ? runs : [0];
    }

    function cluesEqual(a, b) {
        return a.length === b.length && a.every(function (v, i) {
            return v === b[i];
        });
    }

    function rowSatisfied(r) {
        var filled = marks[r].map(function (m) {
            return m === "fill";
        });
        return cluesEqual(lineRuns(filled), puzzle.rowClues[r]);
    }

    function colSatisfied(c) {
        var filled = [];
        for (var r = 0; r < puzzle.size; r++) filled.push(marks[r][c] === "fill");
        return cluesEqual(lineRuns(filled), puzzle.colClues[c]);
    }

    function setMark(r, c, value) {
        var prev = marks[r][c];
        var next = prev === value ? "unknown" : value;
        if (prev === next) return;
        history.push({ r: r, c: c, prev: prev });
        if (history.length > 300) history.shift();
        marks[r][c] = next;
        checkErrors = new Set();
        checkMsg = "";
        hintMsg = "";
        saveState();
        renderManualBoard();
    }

    function resetPuzzle() {
        marks = emptyMarks(puzzle.size);
        history = [];
        checkErrors = new Set();
        checkMsg = "";
        hintMsg = "";
        saveState();
        renderManualBoard();
    }

    function undoMark() {
        if (!history.length) return;
        var last = history.pop();
        marks[last.r][last.c] = last.prev;
        checkErrors = new Set();
        checkMsg = "";
        hintMsg = "";
        saveState();
        renderManualBoard();
    }

    function hintMark() {
        var h = NONO.hint(marks, puzzle.solution, puzzle);
        if (!h) {
            hintMsg = "Nothing left to hint — the puzzle is already solved.";
            renderManualBoard();
            return;
        }
        history.push({ r: h.r, c: h.c, prev: marks[h.r][h.c] });
        marks[h.r][h.c] = h.value;
        hintMsg = h.reason;
        checkErrors = new Set();
        checkMsg = "";
        saveState();
        renderManualBoard();
    }

    function checkPuzzle() {
        var result = NONO.checkAgainstSolution(marks, puzzle.solution);
        checkErrors = new Set(result.wrongCells.map(function (cell) {
            return key(cell.r, cell.c);
        }));
        hintMsg = "";
        if (result.complete) {
            checkMsg = "Everything checks out — solved!";
        } else if (result.wrongCells.length) {
            checkMsg = result.wrongCells.length + " marked cell(s) don't match the picture yet — they're outlined below.";
        } else {
            checkMsg = "No mistakes yet — " + result.progressPercent + "% of the picture is filled in correctly.";
        }
        renderManualBoard();
    }

    function buildClueBadges(container, clue) {
        container.innerHTML = "";
        clue.forEach(function (num) {
            var b = document.createElement("span");
            b.className = "nono-clue-num";
            b.textContent = String(num === 0 ? "-" : num);
            container.appendChild(b);
        });
    }

    function buildManualLayout() {
        var n = puzzle.size;
        els.board.style.setProperty("--n", n);
        els.board.style.setProperty("--big", n > 5 ? 1 : 0);
        els.rowClues.innerHTML = "";
        els.colClues.innerHTML = "";
        els.cells.innerHTML = "";

        for (var r = 0; r < n; r++) {
            var rc = document.createElement("div");
            rc.className = "nono-row-clue";
            buildClueBadges(rc, puzzle.rowClues[r]);
            els.rowClues.appendChild(rc);
        }
        for (var c = 0; c < n; c++) {
            var cc = document.createElement("div");
            cc.className = "nono-col-clue";
            buildClueBadges(cc, puzzle.colClues[c]);
            els.colClues.appendChild(cc);
        }

        boardCells = [];
        for (var r2 = 0; r2 < n; r2++) {
            var row = [];
            for (var c2 = 0; c2 < n; c2++) {
                var cell = document.createElement("button");
                cell.type = "button";
                cell.className = "nono-cell";
                if (n === 10 && (c2 + 1) % 5 === 0 && c2 < n - 1) cell.classList.add("br5");
                if (n === 10 && (r2 + 1) % 5 === 0 && r2 < n - 1) cell.classList.add("bb5");
                (function (r3, c3) {
                    cell.addEventListener("click", function () {
                        setMark(r3, c3, tool);
                    });
                    cell.addEventListener("contextmenu", function (e) {
                        e.preventDefault();
                        setMark(r3, c3, tool === "fill" ? "x" : "fill");
                    });
                })(r2, c2);
                els.cells.appendChild(cell);
                row.push(cell);
            }
            boardCells.push(row);
        }
    }

    function renderManualBoard() {
        if (!boardCells || boardCells.length !== puzzle.size) buildManualLayout();

        var n = puzzle.size;
        var decidedCount = 0;
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                var cell = boardCells[r][c];
                var mark = marks[r][c];
                if (mark !== "unknown") decidedCount++;
                cell.classList.toggle("fill", mark === "fill");
                cell.classList.toggle("x", mark === "x");
                cell.classList.toggle("wrong", checkErrors.has(key(r, c)));
                cell.innerHTML = mark === "fill" ? "" : mark === "x" ? '<span aria-hidden="true">✕</span>' : "";
                cell.setAttribute(
                    "aria-label",
                    "Row " + r + ", column " + c + ", " + (mark === "fill" ? "filled" : mark === "x" ? "marked empty" : "unknown") + (checkErrors.has(key(r, c)) ? ", flagged incorrect" : "")
                );
            }
        }

        Array.prototype.forEach.call(els.rowClues.children, function (el, r) {
            el.classList.toggle("satisfied", rowSatisfied(r));
        });
        Array.prototype.forEach.call(els.colClues.children, function (el, c) {
            el.classList.toggle("satisfied", colSatisfied(c));
        });

        var totalCells = n * n;
        els.progressText.textContent = Math.round((decidedCount / totalCells) * 100) + "% of cells marked";
        els.undoBtn.disabled = history.length === 0;

        els.checkMsg.textContent = checkMsg;
        els.checkMsg.classList.toggle("hidden", !checkMsg);
        els.hintMsg.textContent = hintMsg;
        els.hintMsg.classList.toggle("hidden", !hintMsg);

        var complete = NONO.checkAgainstSolution(marks, puzzle.solution).complete;
        els.completeMsg.classList.toggle("hidden", !complete);

        els.fillToolBtn.setAttribute("aria-pressed", String(tool === "fill"));
        els.xToolBtn.setAttribute("aria-pressed", String(tool === "x"));
    }

    // ---------------- watch algorithm ----------------

    function ensureWatchTrace() {
        if (watchTrace && watchPuzzleId === puzzle.id) return;
        watchPuzzleId = puzzle.id;
        var result = NONO.generateTrace(puzzle);
        watchTrace = result.trace;
        watchSolved = result.solved;
        buildWatchLayout();
        if (playback) playback.destroy();
        playback = createPlaybackControls(els.playbackContainer, {
            stepCount: function () {
                return watchTrace.length;
            },
            onRender: renderWatchStep,
        });
    }

    function buildWatchLayout() {
        var n = puzzle.size;
        els.algoBoard.style.setProperty("--n", n);
        els.algoBoard.style.setProperty("--big", n > 5 ? 1 : 0);
        els.algoRowClues.innerHTML = "";
        els.algoColClues.innerHTML = "";
        els.algoCells.innerHTML = "";
        for (var r = 0; r < n; r++) {
            var rc = document.createElement("div");
            rc.className = "nono-row-clue";
            buildClueBadges(rc, puzzle.rowClues[r]);
            els.algoRowClues.appendChild(rc);
        }
        for (var c = 0; c < n; c++) {
            var cc = document.createElement("div");
            cc.className = "nono-col-clue";
            buildClueBadges(cc, puzzle.colClues[c]);
            els.algoColClues.appendChild(cc);
        }
        watchCells = [];
        for (var r2 = 0; r2 < n; r2++) {
            var row = [];
            for (var c2 = 0; c2 < n; c2++) {
                var cell = document.createElement("div");
                cell.className = "nono-cell algo";
                if (n === 10 && (c2 + 1) % 5 === 0 && c2 < n - 1) cell.classList.add("br5");
                if (n === 10 && (r2 + 1) % 5 === 0 && r2 < n - 1) cell.classList.add("bb5");
                els.algoCells.appendChild(cell);
                row.push(cell);
            }
            watchCells.push(row);
        }
    }

    function explanationKeyFor(type) {
        if (type === "scan-line" || type === "fill" || type === "blank") return "exp-propagate";
        if (type === "guess" || type === "backtrack" || type === "contradiction") return "exp-backtrack";
        return null;
    }

    function renderWatchStep(idx) {
        var step = watchTrace[idx];
        var n = puzzle.size;
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                var cell = watchCells[r][c];
                var v = step.grid[r][c];
                cell.classList.remove("line-active", "guess-cell", "backtrack-cell", "fill", "x");
                if (v === 1) cell.classList.add("fill");
                else if (v === 0) cell.classList.add("x");
                cell.innerHTML = v === 0 ? '<span aria-hidden="true">✕</span>' : "";
            }
        }
        if (step.axis === "row") {
            for (var c2 = 0; c2 < n; c2++) watchCells[step.index][c2].classList.add("line-active");
        } else if (step.axis === "col") {
            for (var r2 = 0; r2 < n; r2++) watchCells[r2][step.index].classList.add("line-active");
        }
        if (step.type === "guess" && step.r != null) watchCells[step.r][step.c].classList.add("guess-cell");
        if (step.type === "backtrack" && step.r != null) watchCells[step.r][step.c].classList.add("backtrack-cell");

        Array.prototype.forEach.call(els.algoRowClues.children, function (el, r3) {
            el.classList.toggle("line-active", step.axis === "row" && step.index === r3);
        });
        Array.prototype.forEach.call(els.algoColClues.children, function (el, c3) {
            el.classList.toggle("line-active", step.axis === "col" && step.index === c3);
        });

        els.statusMsg.textContent = step.message;
        els.wDeductions.textContent = String(step.deductions);
        els.wGuesses.textContent = String(step.guesses);
        els.wBacktracks.textContent = String(step.backtracks);

        var activeKey = explanationKeyFor(step.type);
        expBullets.forEach(function (li) {
            li.classList.toggle("active", li.dataset.exp === activeKey);
        });

        els.watchDone.classList.toggle("hidden", !(idx === watchTrace.length - 1 && watchSolved));
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

    // ---------------- setup ----------------

    function buildPuzzleSelect() {
        var groups = { beginner: "Beginner (5 × 5)", intermediate: "Intermediate (10 × 10)" };
        Object.keys(groups).forEach(function (diff) {
            var group = document.createElement("optgroup");
            group.label = groups[diff];
            NONOGRAM_PUZZLES.filter(function (p) {
                return p.difficulty === diff;
            }).forEach(function (p) {
                var opt = document.createElement("option");
                opt.value = p.id;
                opt.textContent = p.title;
                if (p.id === puzzle.id) opt.selected = true;
                group.appendChild(opt);
            });
            els.puzzleSelect.appendChild(group);
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        els = {
            puzzleSelect: document.getElementById("nono-puzzle"),
            board: document.getElementById("nono-board"),
            rowClues: document.getElementById("nono-row-clues"),
            colClues: document.getElementById("nono-col-clues"),
            cells: document.getElementById("nono-cells"),
            fillToolBtn: document.getElementById("nono-tool-fill"),
            xToolBtn: document.getElementById("nono-tool-x"),
            resetBtn: document.getElementById("nono-reset"),
            undoBtn: document.getElementById("nono-undo"),
            hintBtn: document.getElementById("nono-hint"),
            checkBtn: document.getElementById("nono-check"),
            progressText: document.getElementById("nono-progress"),
            checkMsg: document.getElementById("nono-check-msg"),
            hintMsg: document.getElementById("nono-hint-msg"),
            completeMsg: document.getElementById("nono-complete-msg"),
            tabManual: document.getElementById("tab-manual"),
            tabWatch: document.getElementById("tab-watch"),
            panelManual: document.getElementById("panel-manual"),
            panelWatch: document.getElementById("panel-watch"),
            algoBoard: document.getElementById("nono-algo-board"),
            algoRowClues: document.getElementById("nono-algo-row-clues"),
            algoColClues: document.getElementById("nono-algo-col-clues"),
            algoCells: document.getElementById("nono-algo-cells"),
            statusMsg: document.getElementById("nono-status-msg"),
            wDeductions: document.getElementById("nonow-deductions"),
            wGuesses: document.getElementById("nonow-guesses"),
            wBacktracks: document.getElementById("nonow-backtracks"),
            playbackContainer: document.getElementById("nono-playback"),
            watchDone: document.getElementById("nono-watch-done"),
        };

        expBullets = Array.prototype.slice.call(document.querySelectorAll("[data-exp]"));

        loadInitialPuzzle();
        buildPuzzleSelect();
        renderManualBoard();

        els.puzzleSelect.addEventListener("change", function () {
            loadPuzzle(els.puzzleSelect.value, true);
            watchTrace = null;
            if (!els.panelWatch.classList.contains("hidden")) {
                ensureWatchTrace();
                playback.refresh();
            }
        });
        els.fillToolBtn.addEventListener("click", function () {
            tool = "fill";
            renderManualBoard();
        });
        els.xToolBtn.addEventListener("click", function () {
            tool = "x";
            renderManualBoard();
        });
        els.resetBtn.addEventListener("click", resetPuzzle);
        els.undoBtn.addEventListener("click", undoMark);
        els.hintBtn.addEventListener("click", hintMark);
        els.checkBtn.addEventListener("click", checkPuzzle);

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
