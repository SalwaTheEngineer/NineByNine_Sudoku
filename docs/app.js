/**
 * This is the frontend code of the project. What brought the project to life :)
 * Includes the game logic and AI solving strategies.
 */

function isValid(g, r, c, n) {
    for (let i = 0; i < 9; i++) {
        if (i !== c && g[r][i] === n) return false;
        if (i !== r && g[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
            if ((rr !== r || cc !== c) && g[rr][cc] === n) return false;
        }
    }
    return true;
}

function getLegal(g, r, c) {
    if (g[r][c] !== 0) return [];
    const out = [];
    for (let n = 1; n <= 9; n++) {
        if (isValid(g, r, c, n)) out.push(n);
    }
    return out;
}

// brute-force generator: shuffle candidate order, backtrack until we get a full grid
function genSolved() {
    const g = Array.from({ length: 9 }, () => Array(9).fill(0));
    function fill() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (g[r][c] !== 0) continue;
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                for (const n of nums) {
                    if (!isValid(g, r, c, n)) continue;
                    g[r][c] = n;
                    if (fill()) return true;
                    g[r][c] = 0;
                }
                return false;
            }
        }
        return true;
    }
    fill();
    return g;
}

/**
 * Creates puzzle based on the difficulty level.
 */
function makePuzzle(d) {
    const clues = { easy: 45, medium: 35, hard: 28 }[d] || 35;
    const sol = genSolved();
    const puz = sol.map((row) => [...row]);
    const cells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) cells.push([r, c]);
    }
    cells.sort(() => Math.random() - 0.5);
    let rem = 81 - clues;
    for (const [r, c] of cells) {
        if (rem <= 0) break;
        puz[r][c] = 0;
        rem--;
    }
    return { puzzle: puz, solution: sol };
}

function gridClone(g) {
    return g.map((row) => [...row]);
}

function gridsEqual(a, b) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (a[r][c] !== b[r][c]) return false;
        }
    }
    return true;
}

function dedupeTrace(frames) {
    if (!frames || frames.length < 2) return frames || [];
    const out = [frames[0]];
    for (let i = 1; i < frames.length; i++) {
        if (!gridsEqual(frames[i], frames[i - 1])) out.push(frames[i]);
    }
    return out;
}

function limitTraceLength(frames, maxLen) {
    if (!frames || frames.length <= maxLen) return frames ? frames.slice() : [];
    const out = [];
    const n = frames.length;
    for (let i = 0; i < maxLen; i++) {
        const idx = Math.round((i * (n - 1)) / Math.max(1, maxLen - 1));
        out.push(gridClone(frames[idx]));
    }
    return out;
}

/**
 * Combines the dedupe and limit trace into a final trace.
 */
function finalizeTrace(trace) {
    if (!trace || !trace.length) return [];
    return limitTraceLength(dedupeTrace(trace), 2200);
}

function formatSolveMs(ms) {
    if (ms < 0) return "—";
    if (ms < 1e-6) return "0 ms";
    if (ms < 0.001) return "<0.001 ms";
    if (ms < 1) return `${ms.toFixed(3)} ms`;
    if (ms < 100) return `${ms.toFixed(2)} ms`;
    return `${ms.toFixed(1)} ms`;
}

function formatSeconds(ms) {
    if (ms < 0) return "—";
    return `${(ms / 1000).toFixed(2)} s`;
}

function solveBT(grid, opts) {
    const trace = opts && opts.recordTrace ? [] : null;
    const SNAP_CAP = 6500;
    const g = grid.map((row) => [...row]);
    const t0 = performance.now();
    let nodes = 0;
    let backtracks = 0;
    let checks = 0;

    function snap() {
        if (trace && trace.length < SNAP_CAP) trace.push(gridClone(g));
    }

    if (trace) snap();

    function search() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (g[r][c] !== 0) continue;
                nodes++;
                for (let n = 1; n <= 9; n++) {
                    checks++;
                    if (!isValid(g, r, c, n)) continue;
                    g[r][c] = n;
                    snap();
                    if (search()) return true;
                    g[r][c] = 0;
                    snap();
                    backtracks++;
                }
                return false;
            }
        }
        return true;
    }

    const ok = search();
    if (trace && trace.length && !gridsEqual(trace[trace.length - 1], g)) trace.push(gridClone(g));
    const tSolve = performance.now();
    let traceOut = null;
    let traceBuildMs = 0;
    if (trace) {
        const tb0 = performance.now();
        traceOut = finalizeTrace(trace);
        traceBuildMs = performance.now() - tb0;
    }
    return {
        solved: ok,
        grid: g,
        metrics: {
            nodes,
            backtracks,
            checks,
            solveMs: tSolve - t0,
            traceBuildMs,
            time: tSolve - t0,
        },
        trace: traceOut,
    };
}

function solveMRV(grid, opts) {
    const trace = opts && opts.recordTrace ? [] : null;
    const SNAP_CAP = 6500;
    const g = grid.map((row) => [...row]);
    const t0 = performance.now();
    let nodes = 0;
    let backtracks = 0;
    let checks = 0;

    function snap() {
        if (trace && trace.length < SNAP_CAP) trace.push(gridClone(g));
    }

    if (trace) snap();

    function degree(r, c) {
        let d = 0;
        for (let i = 0; i < 9; i++) {
            if (i !== c && g[r][i] === 0) d++;
            if (i !== r && g[i][c] === 0) d++;
        }
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let rr = br; rr < br + 3; rr++) {
            for (let cc = bc; cc < bc + 3; cc++) {
                if ((rr !== r || cc !== c) && g[rr][cc] === 0) d++;
            }
        }
        return d;
    }

    function neighbors(r, c) {
        const s = [];
        for (let i = 0; i < 9; i++) {
            if (i !== c) s.push([r, i]);
            if (i !== r) s.push([i, c]);
        }
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let rr = br; rr < br + 3; rr++) {
            for (let cc = bc; cc < bc + 3; cc++) {
                if (rr !== r || cc !== c) s.push([rr, cc]);
            }
        }
        return s;
    }

    function lcv(r, c, vals) {
        return vals.sort((a, b) => {
            let ca = 0;
            let cb = 0;
            for (const [nr, nc] of neighbors(r, c)) {
                if (g[nr][nc] !== 0) continue;
                const lv = getLegal(g, nr, nc);
                if (lv.includes(a)) ca++;
                if (lv.includes(b)) cb++;
            }
            return ca - cb;
        });
    }

    function mrvPick() {
        let best = null;
        let minLen = 10;
        let maxDeg = -1;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (g[r][c] !== 0) continue;
                const lv = getLegal(g, r, c);
                checks++;
                const deg = degree(r, c);
                if (lv.length < minLen || (lv.length === minLen && deg > maxDeg)) {
                    minLen = lv.length;
                    maxDeg = deg;
                    best = { r, c, vals: lv };
                    if (minLen === 0) return best;
                }
            }
        }
        return best;
    }

    function search() {
        const cell = mrvPick();
        if (!cell) return true;
        if (!cell.vals.length) return false;
        nodes++;
        const ordered = lcv(cell.r, cell.c, [...cell.vals]);
        for (const n of ordered) {
            checks++;
            g[cell.r][cell.c] = n;
            snap();
            if (search()) return true;
            g[cell.r][cell.c] = 0;
            snap();
            backtracks++;
        }
        return false;
    }

    const ok = search();
    if (trace && trace.length && !gridsEqual(trace[trace.length - 1], g)) trace.push(gridClone(g));
    const tSolve = performance.now();
    let traceOut = null;
    let traceBuildMs = 0;
    if (trace) {
        const tb0 = performance.now();
        traceOut = finalizeTrace(trace);
        traceBuildMs = performance.now() - tb0;
    }
    return {
        solved: ok,
        grid: g,
        metrics: {
            nodes,
            backtracks,
            checks,
            solveMs: tSolve - t0,
            traceBuildMs,
            time: tSolve - t0,
        },
        trace: traceOut,
    };
}

function solveFC(grid, opts) {
    const trace = opts && opts.recordTrace ? [] : null;
    const SNAP_CAP = 6500;
    const g = grid.map((row) => [...row]);
    const t0 = performance.now();
    let nodes = 0;
    let backtracks = 0;
    let checks = 0;
    let arcs = 0;

    function snap() {
        if (trace && trace.length < SNAP_CAP) trace.push(gridClone(g));
    }

    if (trace) snap();

    function initD() {
        const d = {};
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const key = `${r},${c}`;
                d[key] =
                    g[r][c] === 0 ? new Set(getLegal(g, r, c)) : new Set([g[r][c]]);
            }
        }
        return d;
    }

    function cloneD(d) {
        const n = {};
        for (const k in d) n[k] = new Set(d[k]);
        return n;
    }

    function getMRV(d) {
        let best = null;
        let minSz = 10;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (g[r][c] !== 0) continue;
                const sz = d[`${r},${c}`].size;
                if (sz < minSz) {
                    minSz = sz;
                    best = { r, c };
                    if (minSz <= 1) return best;
                }
            }
        }
        return best;
    }

    function nbrs(r, c) {
        const s = new Set();
        for (let i = 0; i < 9; i++) {
            if (i !== c) s.add(`${r},${i}`);
            if (i !== r) s.add(`${i},${c}`);
        }
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let rr = br; rr < br + 3; rr++) {
            for (let cc = bc; cc < bc + 3; cc++) {
                if (rr !== r || cc !== c) s.add(`${rr},${cc}`);
            }
        }
        return s;
    }

    function fcPrune(d, r, c, v) {
        for (const k of nbrs(r, c)) {
            const [nr, nc] = k.split(",").map(Number);
            if (g[nr][nc] !== 0) continue;
            checks++;
            d[k].delete(v);
            if (d[k].size === 0) return false;
        }
        return true;
    }

    function ac3(d, r, c) {
        const q = [];
        for (const k of nbrs(r, c)) {
            const [nr, nc] = k.split(",").map(Number);
            if (g[nr][nc] !== 0) continue;
            for (const k2 of nbrs(nr, nc)) {
                const [nnr, nnc] = k2.split(",").map(Number);
                if (g[nnr][nnc] === 0 && !(nnr === r && nnc === c)) {
                    q.push([`${nr},${nc}`, `${nnr},${nnc}`]);
                }
            }
        }
        while (q.length) {
            const [k1, k2] = q.shift();
            arcs++;
            const d1 = d[k1];
            const d2 = d[k2];
            let revised = false;
            for (const v of [...d1]) {
                checks++;
                if (d2.size === 1 && d2.has(v)) {
                    d1.delete(v);
                    revised = true;
                }
            }
            if (!revised) continue;
            if (d1.size === 0) return false;
            const [r1, c1] = k1.split(",").map(Number);
            for (const nk of nbrs(r1, c1)) {
                const [nr, nc] = nk.split(",").map(Number);
                if (g[nr][nc] === 0 && nk !== k2) q.push([nk, k1]);
            }
        }
        return true;
    }

    function search(d) {
        const cell = getMRV(d);
        if (!cell) return true;
        const vals = [...d[`${cell.r},${cell.c}`]];
        if (!vals.length) return false;
        nodes++;
        for (const n of vals) {
            checks++;
            const saved = cloneD(d);
            g[cell.r][cell.c] = n;
            d[`${cell.r},${cell.c}`] = new Set([n]);
            snap();
            if (fcPrune(d, cell.r, cell.c, n) && ac3(d, cell.r, cell.c) && search(d)) {
                return true;
            }
            g[cell.r][cell.c] = 0;
            Object.assign(d, saved);
            snap();
            backtracks++;
        }
        return false;
    }

    const ok = search(initD());
    if (trace && trace.length && !gridsEqual(trace[trace.length - 1], g)) trace.push(gridClone(g));
    const tSolve = performance.now();
    let traceOut = null;
    let traceBuildMs = 0;
    if (trace) {
        const tb0 = performance.now();
        traceOut = finalizeTrace(trace);
        traceBuildMs = performance.now() - tb0;
    }
    return {
        solved: ok,
        grid: g,
        metrics: {
            nodes,
            backtracks,
            checks,
            solveMs: tSolve - t0,
            traceBuildMs,
            time: tSolve - t0,
            arcs,
        },
        trace: traceOut,
    };
}

function solveMinCon(grid, opts) {
    const trace = opts && opts.recordTrace ? [] : null;
    const SNAP_CAP = 4000;
    const g = grid.map((row) => [...row]);
    let nodes = 0;
    let backtracks = 0;
    let checks = 0;
    let iters = 0;
    let restarts = 0;

    const fixed = new Set();
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (g[r][c] !== 0) fixed.add(`${r},${c}`);
        }
    }

    function snap() {
        if (trace && trace.length < SNAP_CAP) trace.push(gridClone(g));
    }

    function initBoxes() {
        for (let br = 0; br < 9; br += 3) {
            for (let bc = 0; bc < 9; bc += 3) {
                const used = new Set();
                const empty = [];
                for (let r = br; r < br + 3; r++) {
                    for (let c = bc; c < bc + 3; c++) {
                        if (fixed.has(`${r},${c}`)) used.add(g[r][c]);
                        else empty.push([r, c]);
                    }
                }
                const avail = [...Array.from({ length: 9 }, (_, i) => i + 1).filter((n) => !used.has(n))].sort(
                    () => Math.random() - 0.5
                );
                empty.forEach(([r, c], i) => {
                    g[r][c] = avail[i];
                });
            }
        }
    }

    function conflicts(r, c) {
        const v = g[r][c];
        if (!v) return 0;
        checks++;
        let ct = 0;
        for (let i = 0; i < 9; i++) {
            if (i !== c && g[r][i] === v) ct++;
            if (i !== r && g[i][c] === v) ct++;
        }
        return ct;
    }

    function totalConflicts() {
        let t = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) t += conflicts(r, c);
        }
        return t / 2;
    }

    function repair() {
        let stale = 0;
        let best = totalConflicts();
        for (let it = 0; it < 200000; it++) {
            iters++;
            if (trace && iters % 500 === 0) snap();
            if (best === 0) return true;
            const br = 3 * [0, 1, 2][(Math.random() * 3) | 0];
            const bc = 3 * [0, 1, 2][(Math.random() * 3) | 0];
            const sw = [];
            for (let r = br; r < br + 3; r++) {
                for (let c = bc; c < bc + 3; c++) {
                    if (!fixed.has(`${r},${c}`)) sw.push([r, c]);
                }
            }
            if (sw.length < 2) continue;
            const i = (Math.random() * sw.length) | 0;
            let j;
            do {
                j = (Math.random() * sw.length) | 0;
            } while (j === i);
            const [r1, c1] = sw[i];
            const [r2, c2] = sw[j];
            if (g[r1][c1] === g[r2][c2]) continue;
            nodes++;
            const v1 = g[r1][c1];
            const v2 = g[r2][c2];
            const before = conflicts(r1, c1) + conflicts(r2, c2);
            g[r1][c1] = v2;
            g[r2][c2] = v1;
            const after = conflicts(r1, c1) + conflicts(r2, c2);
            const delta = after - before;
            if (delta < 0) {
                best += delta;
                stale = 0;
                if (trace) snap();
            } else if (delta === 0 && Math.random() < 0.3) {
                stale++;
                if (trace) snap();
            } else {
                g[r1][c1] = v1;
                g[r2][c2] = v2;
                stale++;
            }
            if (stale > 5000) break;
        }
        return totalConflicts() === 0;
    }

    const t0 = performance.now();
    for (let rs = 0; rs < 20; rs++) {
        restarts = rs + 1;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!fixed.has(`${r},${c}`)) g[r][c] = 0;
            }
        }
        initBoxes();
        if (trace) snap();
        if (repair()) {
            if (trace) snap();
            const tSolve = performance.now();
            let traceOut = null;
            let traceBuildMs = 0;
            if (trace) {
                const tb0 = performance.now();
                traceOut = finalizeTrace(trace);
                traceBuildMs = performance.now() - tb0;
            }
            return {
                solved: true,
                grid: g,
                metrics: {
                    nodes,
                    backtracks,
                    checks,
                    solveMs: tSolve - t0,
                    traceBuildMs,
                    time: tSolve - t0,
                    iters,
                    restarts,
                },
                trace: traceOut,
            };
        }
        backtracks++;
    }
    if (trace) snap();
    const tSolve = performance.now();
    let traceOut = null;
    let traceBuildMs = 0;
    if (trace) {
        const tb0 = performance.now();
        traceOut = finalizeTrace(trace);
        traceBuildMs = performance.now() - tb0;
    }
    return {
        solved: false,
        grid: g,
        metrics: {
            nodes,
            backtracks,
            checks,
            solveMs: tSolve - t0,
            traceBuildMs,
            time: tSolve - t0,
            iters,
            restarts,
        },
        trace: traceOut,
    };
}

const ALGOS = {
    backtracking: {
        name: "Backtracking",
        icon: "01",
        desc: "Systematically assigns values to empty cells, checks constraints after each assignment, and backtracks when a conflict occurs.",
        solver: solveBT,
        insight: "Backtracking is the baseline depth-first CSP search strategy.",
    },
    mrv: {
        name: "Minimum Remaining Value (MRV)",
        icon: "02",
        desc: "Selects the empty cell with the fewest legal values remaining to reduce branching during search.",
        solver: solveMRV,
        insight: "MRV reduces the branching factor by choosing the most constrained variable first.",
    },
    fc: {
        name: "Forward Checking",
        icon: "03",
        desc: "Updates neighboring domains after each assignment and stops early when a future conflict is detected.",
        solver: solveFC,
        insight: "Forward checking performs early constraint propagation to prune infeasible branches.",
    },
    mincon: {
        name: "Min-Conflicts",
        icon: "04",
        desc: "Starts with a complete assignment and iteratively repairs conflicts using local search.",
        solver: solveMinCon,
        insight: "Min-Conflicts trades exhaustive search for iterative conflict minimization.",
    },
};

const RESULT_HOW_TITLE = {
    backtracking: "How Backtracking Works",
    mrv: "How MRV Works",
    fc: "How Forward Checking Works",
    mincon: "How Min Conflicts Works",
};

let puzzle = null;
let solution = null;
let grid = null;
let selected = null;
let hintCell = null;
let errors = new Set();
let difficulty = null;
let hintsUsed = 0;
let timerInt = null;
let gameClockStart = null;
let elapsed = 0;
let aiOn = false;
let done = false;
let solveAnimRunId = 0;
let lastReplayPayload = null;
let activeReplayState = null;

function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function goHome() {
    clearInterval(timerInt);
    if (document.getElementById("home-screen")) show("home-screen");
    else window.location.href = "index.html";
}

function goPlay() {
    solveAnimRunId++;
    show("play-screen");
}

function startGame(diff) {
    solveAnimRunId++;
    const built = makePuzzle(diff);
    puzzle = built.puzzle;
    solution = built.solution;
    grid = puzzle.map((row) => [...row]);
    difficulty = diff;
    selected = null;
    hintCell = null;
    errors = new Set();
    hintsUsed = 0;
    done = false;
    aiOn = false;
    elapsed = 0;

    document.getElementById("badge").textContent = diff.toUpperCase();
    document.getElementById("hints-used").textContent = "hints: 0";
    document.getElementById("win-banner").classList.add("hidden");
    document.getElementById("panel-ai").classList.add("hidden");
    document.getElementById("panel-info").classList.remove("hidden");
    document.getElementById("ai-toggle").classList.remove("on");

    render();
    startTimer();
    show("play-screen");

    if (!document.getElementById("home-screen")) {
        const label = diff.charAt(0).toUpperCase() + diff.slice(1);
        document.title = `${label} · NinebyNine Sudoku AI`;
    }
}

function startTimer() {
    clearInterval(timerInt);
    gameClockStart = Date.now();
    timerInt = setInterval(() => {
        elapsed = Math.floor((Date.now() - gameClockStart) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const s = String(elapsed % 60).padStart(2, "0");
        document.getElementById("timer").textContent = `${m}:${s}`;
    }, 1000);
}

function render() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const el = document.createElement("div");
            el.className = "cell";
            const v = grid[r][c];
            const orig = puzzle[r][c] !== 0;
            if (orig) el.classList.add("original");
            else if (v) el.classList.add("user-val");
            if ((c + 1) % 3 === 0 && c < 8) el.classList.add("br");
            if ((r + 1) % 3 === 0 && r < 8) el.classList.add("bb");

            if (selected) {
                if (selected.r === r && selected.c === c) el.classList.add("selected");
                else if (
                    selected.r === r ||
                    selected.c === c ||
                    (Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                        Math.floor(selected.c / 3) === Math.floor(c / 3))
                ) {
                    el.classList.add("highlight");
                }
                if (
                    v &&
                    grid[selected.r][selected.c] === v &&
                    !(selected.r === r && selected.c === c)
                ) {
                    el.classList.add("same-val");
                }
            }
            if (errors.has(`${r},${c}`)) el.classList.add("error");
            if (hintCell && hintCell.r === r && hintCell.c === c) el.classList.add("hint-glow");

            el.textContent = v ? String(v) : "";
            el.addEventListener("click", () => clickCell(r, c));
            boardEl.appendChild(el);
        }
    }

    let empty = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (!grid[r][c]) empty++;
        }
    }
    document.getElementById("st-empty").textContent = String(empty);
    document.getElementById("st-errors").textContent = String(errors.size);
}

function clickCell(r, c) {
    if (puzzle[r][c]) return;
    selected = { r, c };
    hintCell = null;
    render();
}

function inputNum(n) {
    if (!selected || puzzle[selected.r][selected.c]) return;
    grid[selected.r][selected.c] = n;
    chkErr();
    render();
    chkWin();
}

function eraseCell() {
    if (!selected || puzzle[selected.r][selected.c]) return;
    grid[selected.r][selected.c] = 0;
    chkErr();
    render();
}

function chkErr() {
    errors = new Set();
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] && !isValid(grid, r, c, grid[r][c])) errors.add(`${r},${c}`);
        }
    }
}

function chkWin() {
    if (done) return;
    let full = true;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (!grid[r][c]) full = false;
        }
    }
    if (full && errors.size === 0) {
        done = true;
        clearInterval(timerInt);
        document.getElementById("win-banner").classList.remove("hidden");
    }
}

function doHint() {
    if (!solution || done) return;
    let best = null;
    let minChoices = 10;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c]) continue;
            const lv = getLegal(grid, r, c);
            if (lv.length > 0 && lv.length < minChoices) {
                minChoices = lv.length;
                best = { r, c, v: solution[r][c] };
                if (minChoices === 1) break;
            }
        }
    }
    if (!best) return;
    hintCell = best;
    selected = { r: best.r, c: best.c };
    hintsUsed++;
    document.getElementById("hints-used").textContent = `hints: ${hintsUsed}`;
    render();
    setTimeout(() => {
        grid[best.r][best.c] = best.v;
        hintCell = null;
        chkErr();
        render();
        const cells = document.querySelectorAll("#board .cell");
        const idx = best.r * 9 + best.c;
        if (cells[idx]) cells[idx].classList.add("hint-pop");
        chkWin();
    }, 700);
}

function toggleAI() {
    aiOn = !aiOn;
    document.getElementById("panel-ai").classList.toggle("hidden", !aiOn);
    document.getElementById("panel-info").classList.toggle("hidden", aiOn);
    document.getElementById("ai-toggle").classList.toggle("on", aiOn);
}

function buildResultBoardCells(rb) {
    rb.innerHTML = "";
    const cells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const el = document.createElement("div");
            el.className = "cell";
            if ((c + 1) % 3 === 0 && c < 8) el.classList.add("br");
            if ((r + 1) % 3 === 0 && r < 8) el.classList.add("bb");
            cells.push(el);
            rb.appendChild(el);
        }
    }
    return cells;
}

function paintResultCells(cells, stateGrid, puzzleGrid) {
    for (let i = 0; i < 81; i++) {
        const r = (i / 9) | 0;
        const c = i % 9;
        const el = cells[i];
        const v = stateGrid[r][c];
        const orig = puzzleGrid[r][c] !== 0;
        el.textContent = v ? String(v) : "";
        el.classList.toggle("original", orig);
        el.classList.toggle("solved-cell", !orig && v !== 0);
    }
}

function runTraceAnimation(trace, puzzleGrid, finalGrid, cells, runId, onPlaybackDone, opts) {
    const wallStart = performance.now();
    const speed = opts && opts.speedMultiplier ? opts.speedMultiplier : 1;
    const replayState = { paused: false };
    activeReplayState = replayState;
    if (!trace || trace.length < 2) {
        paintResultCells(cells, finalGrid, puzzleGrid);
        if (typeof onPlaybackDone === "function") onPlaybackDone(performance.now() - wallStart);
        return;
    }
    const budgetMs = 12000;
    const baseDelay = Math.min(72, Math.max(4, Math.floor(budgetMs / trace.length)));
    const delay = Math.max(1, Math.floor(baseDelay / Math.max(0.1, speed)));
    let idx = 0;
    function tick() {
        if (runId !== solveAnimRunId || activeReplayState !== replayState) return;
        if (replayState.paused) {
            setTimeout(tick, 80);
            return;
        }
        if (idx >= trace.length) {
            paintResultCells(cells, finalGrid, puzzleGrid);
            if (typeof onPlaybackDone === "function") onPlaybackDone(performance.now() - wallStart);
            return;
        }
        paintResultCells(cells, trace[idx], puzzleGrid);
        idx++;
        setTimeout(tick, delay);
    }
    tick();
}

function setPauseButtonState(show, paused) {
    const pauseBtn = document.getElementById("res-pause-btn");
    if (!pauseBtn) return;
    pauseBtn.classList.toggle("hidden", !show);
    pauseBtn.textContent = paused ? "Resume Replay" : "Pause Replay";
}

function playResultAnimation(payload, speedMultiplier) {
    if (!payload) return;
    solveAnimRunId++;
    const runId = solveAnimRunId;
    const rb = document.getElementById("res-board");
    const cells = buildResultBoardCells(rb);
    setPauseButtonState(payload.canAnimate, false);
    const animVal = document.getElementById("met-anim-val");
    if (animVal) animVal.textContent = payload.canAnimate ? "…" : formatSeconds(0);
    runTraceAnimation(
        payload.trace,
        payload.puzzleGrid,
        payload.finalGrid,
        cells,
        runId,
        (playbackWallMs) => {
            const el = document.getElementById("met-anim-val");
            if (el) el.textContent = formatSeconds(playbackWallMs);
            setPauseButtonState(payload.canAnimate, false);
        },
        { speedMultiplier: speedMultiplier || 1 }
    );
}

function replayLastSolve() {
    if (!lastReplayPayload || !lastReplayPayload.canAnimate) return;
    playResultAnimation(lastReplayPayload, 1);
}

function replayLastSolveSlow() {
    if (!lastReplayPayload || !lastReplayPayload.canAnimate) return;
    playResultAnimation(lastReplayPayload, 0.5);
}

function toggleReplayPause() {
    if (!activeReplayState || !lastReplayPayload || !lastReplayPayload.canAnimate) return;
    activeReplayState.paused = !activeReplayState.paused;
    setPauseButtonState(true, activeReplayState.paused);
}

function aiSolve(key) {
    const info = ALGOS[key];
    if (!info) return;
    clearInterval(timerInt);
    const res = info.solver(puzzle, { recordTrace: true });

    document.getElementById("res-icon").textContent = info.icon;
    document.getElementById("res-name").textContent = info.name;
    const tagEl = document.getElementById("res-tag");
    if (info.insight) {
        tagEl.textContent = info.insight;
        tagEl.style.display = "";
    } else {
        tagEl.textContent = "";
        tagEl.style.display = "none";
    }

    const howTitle = document.getElementById("res-how-title");
    if (howTitle) howTitle.textContent = RESULT_HOW_TITLE[key] || "How It Works";
    const trace = res.trace;
    const canAnimate = trace && trace.length > 1;
    document.getElementById("res-desc").textContent = canAnimate
        ? `${info.desc} The board below replays recorded steps (long runs are sampled to keep playback responsive).`
        : info.desc;
    const metricNote = document.getElementById("res-metric-note");
    if (metricNote) {
        metricNote.textContent =
            "These metrics help compare how efficiently each solver explores the search space.";
    }

    const m = res.metrics;
    const solveMs = m.solveMs != null ? m.solveMs : m.time != null ? m.time : 0;
    const mg = document.getElementById("res-metrics");
    mg.innerHTML = "";

    const rows = [
        { l: "Status", v: res.solved ? "Solved" : "Failed", c: res.solved ? "#22c55e" : "#ef4444" },
        { l: "Runtime", v: formatSolveMs(solveMs), c: "#fbbf24" },
        { l: "Nodes Explored", v: m.nodes.toLocaleString(), c: "#60a5fa" },
        { l: "Backtracks", v: m.backtracks.toLocaleString(), c: "#fb923c" },
        { l: "Constraint Checks", v: m.checks.toLocaleString(), c: "#a78bfa" },
    ];

    for (const row of rows) {
        const div = document.createElement("div");
        div.className = "met-card";
        div.innerHTML = `<div class="met-label">${row.l}</div><div class="met-val" style="color:${row.c}">${row.v}</div>`;
        mg.appendChild(div);
    }

    if (canAnimate) {
        const anim = document.createElement("div");
        anim.className = "met-card";
        anim.innerHTML =
            '<div class="met-label">Animation Time</div><div class="met-val" id="met-anim-val" style="color:#94a3b8">…</div>';
        mg.appendChild(anim);
    }
    const runtimeNote = document.getElementById("res-runtime-note");
    if (runtimeNote) {
        runtimeNote.textContent =
            "Runtime measures solver computation only; animation time reflects visualization playback.";
        runtimeNote.classList.toggle("hidden", !canAnimate);
    }
    const replayBtn = document.getElementById("res-replay-btn");
    if (replayBtn) replayBtn.classList.toggle("hidden", !canAnimate);
    const replaySlowBtn = document.getElementById("res-replay-slow-btn");
    if (replaySlowBtn) replaySlowBtn.classList.toggle("hidden", !canAnimate);
    setPauseButtonState(canAnimate, false);
    lastReplayPayload = {
        canAnimate,
        trace: canAnimate ? trace : null,
        puzzleGrid: gridClone(puzzle),
        finalGrid: gridClone(res.grid),
    };
    show("result-screen");
    playResultAnimation(lastReplayPayload, 1);
}

document.addEventListener("keydown", (e) => {
    const play = document.getElementById("play-screen");
    if (!selected || !play.classList.contains("active")) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) inputNum(n);
    if (e.key === "Backspace" || e.key === "Delete") eraseCell();
    if (e.key === "ArrowUp" && selected.r > 0) {
        selected.r--;
        render();
    }
    if (e.key === "ArrowDown" && selected.r < 8) {
        selected.r++;
        render();
    }
    if (e.key === "ArrowLeft" && selected.c > 0) {
        selected.c--;
        render();
    }
    if (e.key === "ArrowRight" && selected.c < 8) {
        selected.c++;
        render();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // delegated clicks (avoids strict CSP / some embedded preview panes breaking inline handlers)
    document.body.addEventListener("click", (e) => {
        const el = e.target.closest("[data-act]");
        if (!el) return;
        const act = el.dataset.act;
        if (act === "go-home") goHome();
        else if (act === "go-play") goPlay();
        else if (act === "erase") eraseCell();
        else if (act === "hint") doHint();
        else if (act === "toggle-ai") toggleAI();
        else if (act === "replay") replayLastSolve();
        else if (act === "replay-slow") replayLastSolveSlow();
        else if (act === "pause-replay") toggleReplayPause();
        else if (act === "ai" && el.dataset.algo) aiSolve(el.dataset.algo);
    });

    const home = document.getElementById("home-screen");
    const play = document.getElementById("play-screen");
    if (!home && play) {
        const ok = ["easy", "medium", "hard"];
        const q = new URLSearchParams(location.search).get("diff");
        if (q && !ok.includes(q)) {
            location.replace("index.html");
            return;
        }
        startGame(ok.includes(q) ? q : "easy");
    }
});
