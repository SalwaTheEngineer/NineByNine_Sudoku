# NineByNine AI

Sudoku as a CSP for CS 5100 (Foundations of AI), Northeastern!!!!! :DDDDD

We built several solvers and a small web UI so we could see how they behave side by side with runtime, backtracks, nodes, etc.

---

## Solvers (quick version)

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

For the UI, open `docs/index.html` in a browser (or serve `docs/` if you prefer). You get the grid, solver buttons, and step traces there.

---

## Repo layout

```
common/          board, constraints, puzzle generator
salwa/           backtracking, MRV
anjali/          domains, forward checking + AC-3, metrics
ayush/           min-conflicts, runner
docs/            static site — index, play page, app.js, styles
demo.py          CLI comparison
```

---

## Notes

Everything listed above is in place and wired through `demo.py` / `StrategyRunner`. If we extend it, min-conflicts is the main candidate for more tuning; we might also add a degree tie break to forward checking MRV to match the standalone MRV solver, or charts if we want prettier comparisons.
