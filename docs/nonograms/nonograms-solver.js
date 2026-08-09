/**
 * Nonograms — pure algorithm logic, no DOM.
 *   - genPatterns / consistent: the combinatorial core (all line fills that
 *     match a clue, filtered against what's currently known).
 *   - generateTrace: constraint propagation with backtracking, instrumented
 *     into a step-by-step event trace for Watch Algorithm mode.
 *   - checkAgainstSolution / hint: used by manual play's Check Puzzle and
 *     Hint buttons — these compare against the curated solution directly
 *     rather than re-deriving it, since the puzzle already has one.
 */
var NONO = (function () {
    "use strict";

    var FILLED = 1;
    var EMPTY = 0;
    var UNKNOWN = -1;

    /** Every binary line of `length` whose run-lengths match `clue`. */
    function genPatterns(clue, length) {
        if (clue.length === 1 && clue[0] === 0) {
            return [new Array(length).fill(EMPTY)];
        }
        var runs = clue;
        var nRuns = runs.length;
        var totalFilled = runs.reduce(function (a, b) { return a + b; }, 0);
        var slack = length - totalFilled - (nRuns - 1);
        if (slack < 0) return [];

        var patterns = [];

        function place(extraDist) {
            var line = [];
            var i, k;
            for (i = 0; i < extraDist[0]; i++) line.push(EMPTY);
            for (i = 0; i < nRuns; i++) {
                for (k = 0; k < runs[i]; k++) line.push(FILLED);
                var gap = i < nRuns - 1 ? 1 + extraDist[i + 1] : extraDist[nRuns];
                for (k = 0; k < gap; k++) line.push(EMPTY);
            }
            while (line.length < length) line.push(EMPTY);
            patterns.push(line);
        }

        function distribute(remaining, slotIndex, acc) {
            if (slotIndex === nRuns) {
                acc.push(remaining);
                place(acc.slice());
                acc.pop();
                return;
            }
            for (var i = 0; i <= remaining; i++) {
                acc.push(i);
                distribute(remaining - i, slotIndex + 1, acc);
                acc.pop();
            }
        }
        distribute(slack, 0, []);
        return patterns;
    }

    function consistent(pattern, known) {
        for (var i = 0; i < known.length; i++) {
            if (known[i] !== UNKNOWN && known[i] !== pattern[i]) return false;
        }
        return true;
    }

    function cloneGrid(g) {
        return g.map(function (row) {
            return row.slice();
        });
    }

    function fullyFilled(grid) {
        return grid.every(function (row) {
            return row.every(function (v) {
                return v !== UNKNOWN;
            });
        });
    }

    /**
     * Full constraint-propagation + backtracking solve, instrumented with a
     * trace event per line scan, forced fill/blank, guess, and backtrack.
     * Every event carries a full grid snapshot so playback can jump to any
     * step directly.
     */
    function generateTrace(puzzle) {
        var n = puzzle.size;
        var rowClues = puzzle.rowClues;
        var colClues = puzzle.colClues;
        var rowPatternsAll = rowClues.map(function (c) { return genPatterns(c, n); });
        var colPatternsAll = colClues.map(function (c) { return genPatterns(c, n); });

        var trace = [];
        var deductions = 0;
        var guesses = 0;
        var backtracks = 0;
        var EVENT_CAP = 20000;
        var capped = false;

        function push(type, extra) {
            if (trace.length >= EVENT_CAP) {
                capped = true;
                return;
            }
            var evt = {
                type: type,
                deductions: deductions,
                guesses: guesses,
                backtracks: backtracks,
                grid: extra.grid,
                message: extra.message,
            };
            delete extra.grid;
            delete extra.message;
            for (var k in extra) evt[k] = extra[k];
            trace.push(evt);
        }

        function propagateOnce(grid) {
            var changed = false;
            for (var r = 0; r < n && !capped; r++) {
                var known = grid[r];
                var cands = rowPatternsAll[r].filter(function (p) { return consistent(p, known); });
                push("scan-line", {
                    axis: "row",
                    index: r,
                    possibleCount: cands.length,
                    grid: cloneGrid(grid),
                    message: "Checking row " + r + " — " + cands.length + " pattern(s) still fit its clue.",
                });
                if (!cands.length) {
                    push("contradiction", {
                        axis: "row",
                        index: r,
                        grid: cloneGrid(grid),
                        message: "Row " + r + " has no valid pattern left — this branch is wrong.",
                    });
                    return { contradiction: true };
                }
                for (var c = 0; c < n; c++) {
                    if (grid[r][c] !== UNKNOWN) continue;
                    var vals = new Set(cands.map(function (p) { return p[c]; }));
                    if (vals.size === 1) {
                        var v = vals.values().next().value;
                        grid[r][c] = v;
                        changed = true;
                        deductions++;
                        push(v === FILLED ? "fill" : "blank", {
                            r: r,
                            c: c,
                            axis: "row",
                            index: r,
                            grid: cloneGrid(grid),
                            message:
                                "Every remaining pattern for row " +
                                r +
                                (v === FILLED ? " fills" : " leaves empty") +
                                " column " +
                                c +
                                " — marking it.",
                        });
                    }
                }
            }
            for (var c2 = 0; c2 < n && !capped; c2++) {
                var known2 = [];
                for (var r2 = 0; r2 < n; r2++) known2.push(grid[r2][c2]);
                var cands2 = colPatternsAll[c2].filter(function (p) { return consistent(p, known2); });
                push("scan-line", {
                    axis: "col",
                    index: c2,
                    possibleCount: cands2.length,
                    grid: cloneGrid(grid),
                    message: "Checking column " + c2 + " — " + cands2.length + " pattern(s) still fit its clue.",
                });
                if (!cands2.length) {
                    push("contradiction", {
                        axis: "col",
                        index: c2,
                        grid: cloneGrid(grid),
                        message: "Column " + c2 + " has no valid pattern left — this branch is wrong.",
                    });
                    return { contradiction: true };
                }
                for (var r3 = 0; r3 < n; r3++) {
                    if (grid[r3][c2] !== UNKNOWN) continue;
                    var vals2 = new Set(cands2.map(function (p) { return p[r3]; }));
                    if (vals2.size === 1) {
                        var v2 = vals2.values().next().value;
                        grid[r3][c2] = v2;
                        changed = true;
                        deductions++;
                        push(v2 === FILLED ? "fill" : "blank", {
                            r: r3,
                            c: c2,
                            axis: "col",
                            index: c2,
                            grid: cloneGrid(grid),
                            message:
                                "Every remaining pattern for column " +
                                c2 +
                                (v2 === FILLED ? " fills" : " leaves empty") +
                                " row " +
                                r3 +
                                " — marking it.",
                        });
                    }
                }
            }
            return { contradiction: false, changed: changed };
        }

        function firstUnknown(grid) {
            for (var r = 0; r < n; r++) {
                for (var c = 0; c < n; c++) {
                    if (grid[r][c] === UNKNOWN) return { r: r, c: c };
                }
            }
            return null;
        }

        function solve(grid) {
            if (capped) return false;
            while (true) {
                var res = propagateOnce(grid);
                if (capped) return false;
                if (res.contradiction) return false;
                if (fullyFilled(grid)) {
                    push("solved", { grid: cloneGrid(grid), message: "Solved — every row and column matches its clue." });
                    return true;
                }
                if (!res.changed) break;
            }
            var target = firstUnknown(grid);
            if (!target) {
                push("solved", { grid: cloneGrid(grid), message: "Solved — every row and column matches its clue." });
                return true;
            }
            guesses++;
            push("guess", {
                r: target.r,
                c: target.c,
                grid: cloneGrid(grid),
                message:
                    "No cell is forced by logic alone right now — guessing row " +
                    target.r +
                    ", column " +
                    target.c +
                    " is filled.",
            });
            var trial = cloneGrid(grid);
            trial[target.r][target.c] = FILLED;
            if (solve(trial)) {
                for (var r = 0; r < n; r++) grid[r] = trial[r].slice();
                return true;
            }
            backtracks++;
            grid[target.r][target.c] = EMPTY;
            push("backtrack", {
                r: target.r,
                c: target.c,
                grid: cloneGrid(grid),
                message:
                    "That guess led to a contradiction — reversing it. Row " +
                    target.r +
                    ", column " +
                    target.c +
                    " must be empty instead.",
            });
            return solve(grid);
        }

        var startGrid = [];
        for (var r = 0; r < n; r++) startGrid.push(new Array(n).fill(UNKNOWN));
        push("start", { grid: cloneGrid(startGrid), message: "Starting solve — no cells known yet." });
        var solved = solve(startGrid);
        return { trace: trace, solved: solved, capped: capped };
    }

    /**
     * Compares the player's marks ('fill' | 'x' | 'unknown') against the
     * curated solution. Only called on demand (Check Puzzle), never live.
     */
    function checkAgainstSolution(marks, solution) {
        var n = solution.length;
        var wrongCells = [];
        var totalFilled = 0;
        var correctFilled = 0;
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                var truth = solution[r][c];
                var mark = marks[r][c];
                if (truth === 1) totalFilled++;
                if (truth === 1 && mark === "fill") correctFilled++;
                if (mark === "fill" && truth !== 1) wrongCells.push({ r: r, c: c });
                if (mark === "x" && truth === 1) wrongCells.push({ r: r, c: c });
            }
        }
        var complete = wrongCells.length === 0 && correctFilled === totalFilled;
        return {
            complete: complete,
            wrongCells: wrongCells,
            progressPercent: totalFilled ? Math.round((correctFilled / totalFilled) * 100) : 100,
        };
    }

    /**
     * Finds one cell worth revealing next: prefers a cell that's actually
     * forced by propagation given the player's *correct* marks so far, and
     * falls back to the next unsolved solution cell if a guess would be
     * needed to make further progress right now.
     */
    function hint(marks, solution, puzzle) {
        var n = puzzle.size;
        var known = [];
        for (var r = 0; r < n; r++) {
            var row = [];
            for (var c = 0; c < n; c++) {
                var mark = marks[r][c];
                var truth = solution[r][c];
                if (mark === "fill" && truth === 1) row.push(FILLED);
                else if (mark === "x" && truth === 0) row.push(EMPTY);
                else row.push(UNKNOWN);
            }
            known.push(row);
        }

        var rowPatternsAll = puzzle.rowClues.map(function (clue) { return genPatterns(clue, n); });
        var colPatternsAll = puzzle.colClues.map(function (clue) { return genPatterns(clue, n); });

        var grid = cloneGrid(known);
        var changed = true;
        while (changed) {
            changed = false;
            for (var r2 = 0; r2 < n; r2++) {
                var cands = rowPatternsAll[r2].filter(function (p) { return consistent(p, grid[r2]); });
                for (var c2 = 0; c2 < n; c2++) {
                    if (grid[r2][c2] !== UNKNOWN) continue;
                    var vals = new Set(cands.map(function (p) { return p[c2]; }));
                    if (vals.size === 1) {
                        grid[r2][c2] = vals.values().next().value;
                        changed = true;
                    }
                }
            }
            for (var c3 = 0; c3 < n; c3++) {
                var colKnown = [];
                for (var r3 = 0; r3 < n; r3++) colKnown.push(grid[r3][c3]);
                var cands2 = colPatternsAll[c3].filter(function (p) { return consistent(p, colKnown); });
                for (var r4 = 0; r4 < n; r4++) {
                    if (grid[r4][c3] !== UNKNOWN) continue;
                    var vals2 = new Set(cands2.map(function (p) { return p[r4]; }));
                    if (vals2.size === 1) {
                        grid[r4][c3] = vals2.values().next().value;
                        changed = true;
                    }
                }
            }
        }

        // a cell propagation just newly resolved that the player hasn't matched yet
        for (var r5 = 0; r5 < n; r5++) {
            for (var c5 = 0; c5 < n; c5++) {
                if (known[r5][c5] === UNKNOWN && grid[r5][c5] !== UNKNOWN) {
                    var isFill = grid[r5][c5] === FILLED;
                    return {
                        r: r5,
                        c: c5,
                        value: isFill ? "fill" : "x",
                        reason: isFill
                            ? "Row " + r5 + "'s clue forces column " + c5 + " to be filled, given what's already marked."
                            : "Column " + c5 + "'s clue rules out row " + r5 + " — it has to stay empty.",
                    };
                }
            }
        }

        // nothing forced by pure logic yet — reveal the next unsolved solution cell
        for (var r6 = 0; r6 < n; r6++) {
            for (var c6 = 0; c6 < n; c6++) {
                var truth6 = solution[r6][c6];
                var mark6 = marks[r6][c6];
                var already = (truth6 === 1 && mark6 === "fill") || (truth6 === 0 && mark6 === "x");
                if (!already) {
                    return {
                        r: r6,
                        c: c6,
                        value: truth6 === 1 ? "fill" : "x",
                        reason: "No cell is forced by logic alone from your current marks — this is the next cell of the solution.",
                    };
                }
            }
        }
        return null; // already solved
    }

    return {
        genPatterns: genPatterns,
        consistent: consistent,
        generateTrace: generateTrace,
        checkAgainstSolution: checkAgainstSolution,
        hint: hint,
    };
})();
