/**
 * Curated nonogram puzzles. Every grid below was verified — with a
 * propagation + backtracking solver counting solutions — to have exactly
 * one valid fill given its row/column clues, before being checked in. See
 * the generator/verifier this was produced with if these ever need to
 * change: it will re-confirm uniqueness or refuse to emit the puzzle.
 *
 * solution[r][c] === 1 means filled, 0 means empty. rowClues/colClues are
 * the run-length clues a player would actually see next to the grid.
 */
var NONOGRAM_PUZZLES = [
    {
        id: "heart",
        title: "Heart",
        difficulty: "beginner",
        size: 5,
        rowClues: [[1, 1], [5], [5], [3], [1]],
        colClues: [[2], [4], [4], [4], [2]],
        solution: [
            [0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0],
        ],
    },
    {
        id: "smiley",
        title: "Smiley",
        difficulty: "beginner",
        size: 5,
        rowClues: [[1], [1, 1], [1, 1, 1], [1, 1], [3]],
        colClues: [[3], [1], [1, 1, 1], [1], [3]],
        solution: [
            [0, 0, 1, 0, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0],
        ],
    },
    {
        id: "arrow",
        title: "Arrow",
        difficulty: "beginner",
        size: 5,
        rowClues: [[1], [3], [5], [1], [1]],
        colClues: [[1], [2], [5], [2], [1]],
        solution: [
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
        ],
    },
    {
        id: "sailboat",
        title: "Sailboat",
        difficulty: "intermediate",
        size: 10,
        rowClues: [[1], [2], [3], [4], [6], [7], [2], [8], [0], [10]],
        colClues: [[1], [2, 1, 1], [4, 1, 1], [7, 1], [8, 1], [3, 1, 1], [2, 1, 1], [1, 1, 1], [1, 1], [1]],
        solution: [
            [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
    },
    {
        id: "star",
        title: "Star",
        difficulty: "intermediate",
        size: 10,
        rowClues: [[2], [4], [4], [8], [10], [3, 2, 3], [2, 2], [2, 2], [1, 1], [2, 2]],
        colClues: [[2], [5], [7], [4, 1], [6], [6], [4, 1], [7], [5], [2]],
        solution: [
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
            [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
            [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
            [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
            [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
        ],
    },
    {
        id: "umbrella",
        title: "Umbrella",
        difficulty: "intermediate",
        size: 10,
        rowClues: [[4], [6], [8], [2, 4, 2], [2], [2], [2], [2], [2], [1]],
        colClues: [[1], [2], [2], [4, 2], [9], [8], [4], [2], [2], [1]],
        solution: [
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        ],
    },
];
