/**
 * N Queens — pure algorithm logic, no DOM. Two things live here:
 *   1. computeConflicts / solveFromPartial — used by manual play (conflict
 *      highlighting + the Hint button).
 *   2. generateTrace — the recursive backtracking solver used by Watch
 *      Algorithm mode, which records one event per action so the UI can
 *      scrub forward/backward through the search instead of just replaying it.
 */
var NQ = (function () {
    "use strict";

    // Two queens conflict if they share a row, a column, or a diagonal.
    function conflictsPair(a, b) {
        return a.r === b.r || a.c === b.c || Math.abs(a.r - b.r) === Math.abs(a.c - b.c);
    }

    /**
     * queens: [{r,c}, ...] — arbitrary placements, may include conflicts.
     * Returns { queenKeys: Set("r,c"), lineKeys: Set("r,c") } where lineKeys
     * covers every cell on the shared row/column/diagonal between each
     * conflicting pair (inclusive), for highlighting the attack line itself.
     */
    function computeConflicts(queens) {
        var queenKeys = new Set();
        var lineKeys = new Set();
        for (var i = 0; i < queens.length; i++) {
            for (var j = i + 1; j < queens.length; j++) {
                var a = queens[i];
                var b = queens[j];
                if (!conflictsPair(a, b)) continue;
                queenKeys.add(a.r + "," + a.c);
                queenKeys.add(b.r + "," + b.c);
                var dr = Math.sign(b.r - a.r);
                var dc = Math.sign(b.c - a.c);
                var r = a.r;
                var c = a.c;
                while (true) {
                    lineKeys.add(r + "," + c);
                    if (r === b.r && c === b.c) break;
                    r += dr;
                    c += dc;
                }
            }
        }
        return { queenKeys: queenKeys, lineKeys: lineKeys };
    }

    function isSafe(rows, row, col) {
        for (var r = 0; r < row; r++) {
            if (rows[r] === -1) continue;
            if (rows[r] === col) return false;
            if (Math.abs(rows[r] - col) === Math.abs(r - row)) return false;
        }
        return true;
    }

    /**
     * Tries to extend the user's current (conflict-free) queens into a full
     * solution via backtracking. Non-conflicting queens are treated as
     * givens; conflicting ones and duplicate-per-row ones are ignored so a
     * messy board can't poison the search. Returns a full rows[] array
     * (rows[i] = column of the queen in row i) or null if unsolvable as-is.
     */
    function solveFromPartial(n, queensList) {
        var conflicts = computeConflicts(queensList).queenKeys;
        var rowsSoFar = new Array(n).fill(-1);
        var seenRow = Object.create(null);
        queensList.forEach(function (q) {
            var key = q.r + "," + q.c;
            if (conflicts.has(key)) return;
            if (seenRow[q.r] !== undefined) return;
            seenRow[q.r] = true;
            rowsSoFar[q.r] = q.c;
        });

        function solve(row) {
            if (row === n) return true;
            if (rowsSoFar[row] !== -1) {
                if (!isSafe(rowsSoFar, row, rowsSoFar[row])) return false;
                return solve(row + 1);
            }
            for (var col = 0; col < n; col++) {
                if (isSafe(rowsSoFar, row, col)) {
                    rowsSoFar[row] = col;
                    if (solve(row + 1)) return true;
                    rowsSoFar[row] = -1;
                }
            }
            return false;
        }

        return solve(0) ? rowsSoFar : null;
    }

    /**
     * Full recursive-backtracking trace for a fresh n x n board, one queen
     * per row, columns tried left to right. Every event carries a full
     * `rows` snapshot plus running counters so the playback UI can jump to
     * any index without replaying from the start.
     */
    function generateTrace(n) {
        var trace = [];
        var rowsSoFar = new Array(n).fill(-1);
        var tested = 0;
        var backtracks = 0;
        var EVENT_CAP = 60000;
        var capped = false;

        function push(type, row, col) {
            if (trace.length >= EVENT_CAP) {
                capped = true;
                return;
            }
            var messages = {
                test: "Trying row " + row + ", column " + col + ".",
                accept: "Row " + row + ", column " + col + " is safe — placing queen.",
                reject: "Conflict at row " + row + ", column " + col + " — skipping.",
                backtrack:
                    "No solution below row " + row + " with that queen — removing it, trying the next column.",
                solved: "Solution found — all " + n + " queens placed safely.",
            };
            trace.push({
                type: type,
                row: row,
                col: col,
                rows: rowsSoFar.slice(),
                tested: tested,
                backtracks: backtracks,
                message: messages[type],
            });
        }

        function solve(row) {
            if (capped) return false;
            if (row === n) {
                push("solved", row, -1);
                return true;
            }
            for (var col = 0; col < n && !capped; col++) {
                tested++;
                push("test", row, col);
                if (isSafe(rowsSoFar, row, col)) {
                    rowsSoFar[row] = col;
                    push("accept", row, col);
                    if (solve(row + 1)) return true;
                    rowsSoFar[row] = -1;
                    backtracks++;
                    push("backtrack", row, col);
                } else {
                    push("reject", row, col);
                }
            }
            return false;
        }

        var solved = solve(0);
        return { trace: trace, solved: solved, capped: capped };
    }

    return {
        computeConflicts: computeConflicts,
        solveFromPartial: solveFromPartial,
        generateTrace: generateTrace,
    };
})();
