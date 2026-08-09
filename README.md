# NineByNine — AI Algorithms as Games

Started as Sudoku-as-a-CSP for CS 5100 (Foundations of AI), Northeastern, and grew into a small platform: three classic puzzles, each playable by hand and each with a "Watch Algorithm" mode that visualizes the actual AI search solving it step by step.

- **Sudoku** — backtracking, MRV, forward checking + AC-3, min-conflicts
- **N Queens** — recursive backtracking
- **Nonograms** — constraint propagation + backtracking

---

## Solvers (quick version, Sudoku)

**Plain backtracking** — Fixed cell order, try 1–9, backtrack when something breaks. Slow but easy to reason about.

**MRV** — Pick the cell with the fewest legal moves; if there’s a tie, prefer the one tied to more empty neighbors (degree). Try values in LCV order when possible. Lives in `salwa/mrv_solver.py`; the browser version does the same thing.

**Forward checking + AC-3** — Keeps domains updated, prunes after each placement, runs AC-3 at the start and after moves. MRV here is just “smallest domain”; no degree tie-break. Values go in sorted order.

**Min-conflicts** — Local search: shuffle and repair inside 3×3 boxes. It’s in the runner with sane iteration caps.

---

## Run it

Python 3 only, no pip install.

```bash
python demo.py
```

That hits a few sample boards plus a random one and prints timings for each solver.

For the web platform, serve `docs/` and open it (e.g. `python3 -m http.server 8000` from inside `docs/`, then visit `http://localhost:8000/`). It's a static site — file-based routing, no build step — so opening `docs/index.html` directly also works, though a couple of relative links assume a server root. Routes:

- `/` — game selection homepage
- `/sudoku/` — the original Sudoku CSP UI
- `/n-queens/` — N Queens, manual play + backtracking visualizer
- `/nonograms/` — Nonograms, manual play + constraint-propagation/backtracking visualizer

---

## Repo layout

```
common/          board, constraints, puzzle generator (Python, Sudoku solvers)
salwa/           backtracking, MRV (Python)
anjali/          domains, forward checking + AC-3, metrics (Python)
ayush/           min-conflicts, runner (Python)
demo.py          CLI comparison of the Python solvers

docs/            the web platform (static, no build step)
  index.html       homepage — game selection
  style.css        shared design tokens, nav, playback controls, homepage
  js/              nav.js, storage.js, playback-controls.js — shared across all three games
  sudoku/          index.html (difficulty select), play.html, app.js
  n-queens/        index.html, nqueens.css, nqueens.js, nqueens-solver.js
  nonograms/       index.html, nonograms.css, nonograms.js, nonograms-solver.js, nonograms-data.js
```

There's no `package.json` / lint / test / build tooling in this repo — it's plain static HTML/CSS/JS. JS is syntax-checked with `node --check <file>` when changed; there's nothing more automated than that today.

---

## Notes

Sudoku's Python solvers are wired through `demo.py` / `StrategyRunner`; the web UI's Sudoku solvers are a separate JS implementation (`docs/sudoku/app.js`) that mirrors the same strategies for in-browser visualization. If we extend it, min-conflicts is the main candidate for more tuning; we might also add a degree tie break to forward checking MRV to match the standalone MRV solver, or charts if we want prettier comparisons. Nonogram puzzles in `nonograms-data.js` were authored with a solver-verification script that confirms a unique solution before a puzzle ships — see the git history for that generator if new puzzles are added later.
