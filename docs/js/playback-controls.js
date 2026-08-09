/**
 * Reusable transport widget for algorithm visualizers (N Queens + Nonograms).
 * Renders Play/Pause, Prev, Next, Restart, a speed select, and a step
 * counter into `container`, and drives a step index forward on a timer.
 * The caller owns the actual step data — this just owns the index + clock.
 *
 * createPlaybackControls(container, {
 *   stepCount: () => number,       // total steps available right now
 *   onRender: (index) => void,     // called whenever the visible step changes
 *   speeds: [{ label, ms }, ...],  // optional, defaults below
 *   initialSpeedIndex: number,     // optional, defaults to the middle speed
 * })
 * returns { play, pause, next, prev, restart, goTo, isPlaying, currentIndex, destroy }
 */
function createPlaybackControls(container, opts) {
    "use strict";
    var stepCount = opts.stepCount;
    var onRender = opts.onRender;
    var speeds = opts.speeds || [
        { label: "0.5x", ms: 900 },
        { label: "1x", ms: 450 },
        { label: "2x", ms: 220 },
        { label: "4x", ms: 100 },
    ];
    var speedIdx = opts.initialSpeedIndex != null ? opts.initialSpeedIndex : 1;

    var idx = 0;
    var playing = false;
    var timer = null;

    var wrap = document.createElement("div");
    wrap.className = "playback";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Algorithm playback controls");

    var restartBtn = mkBtn("⏮", "Restart");
    var prevBtn = mkBtn("◀", "Previous step");
    var playBtn = mkBtn("▶", "Play");
    var nextBtn = mkBtn("▶|", "Next step");

    var speedWrap = document.createElement("label");
    speedWrap.className = "playback-speed";
    var speedText = document.createElement("span");
    speedText.textContent = "Speed";
    var speedSel = document.createElement("select");
    speeds.forEach(function (s, i) {
        var o = document.createElement("option");
        o.value = String(i);
        o.textContent = s.label;
        if (i === speedIdx) o.selected = true;
        speedSel.appendChild(o);
    });
    speedWrap.appendChild(speedText);
    speedWrap.appendChild(speedSel);

    var counter = document.createElement("span");
    counter.className = "playback-counter";

    [restartBtn, prevBtn, playBtn, nextBtn, speedWrap, counter].forEach(function (el) {
        wrap.appendChild(el);
    });
    container.appendChild(wrap);

    function mkBtn(icon, label) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "playback-btn";
        b.innerHTML = '<span aria-hidden="true">' + icon + "</span>";
        b.appendChild(document.createTextNode(" " + label));
        return b;
    }

    function total() {
        return Math.max(1, stepCount());
    }

    function clamp(i) {
        return Math.max(0, Math.min(total() - 1, i));
    }

    function render() {
        onRender(idx);
        counter.textContent = "Step " + (idx + 1) + " / " + total();
        prevBtn.disabled = idx <= 0;
        nextBtn.disabled = idx >= total() - 1;
        playBtn.disabled = idx >= total() - 1 && !playing;
        playBtn.innerHTML = playing
            ? '<span aria-hidden="true">⏸</span> Pause'
            : '<span aria-hidden="true">▶</span> Play';
        playBtn.setAttribute("aria-pressed", String(playing));
    }

    function tick() {
        if (!playing) return;
        if (idx >= total() - 1) {
            playing = false;
            render();
            return;
        }
        idx = clamp(idx + 1);
        render();
        timer = setTimeout(tick, speeds[speedIdx].ms);
    }

    function play() {
        if (idx >= total() - 1) idx = 0;
        playing = true;
        render();
        timer = setTimeout(tick, speeds[speedIdx].ms);
    }
    function pause() {
        playing = false;
        clearTimeout(timer);
        render();
    }
    function next() {
        pause();
        idx = clamp(idx + 1);
        render();
    }
    function prev() {
        pause();
        idx = clamp(idx - 1);
        render();
    }
    function restart() {
        pause();
        idx = 0;
        render();
    }
    function goTo(i) {
        pause();
        idx = clamp(i);
        render();
    }
    function destroy() {
        clearTimeout(timer);
        wrap.remove();
    }

    restartBtn.addEventListener("click", restart);
    prevBtn.addEventListener("click", prev);
    nextBtn.addEventListener("click", next);
    playBtn.addEventListener("click", function () {
        if (playing) pause();
        else play();
    });
    speedSel.addEventListener("change", function () {
        speedIdx = Number(speedSel.value);
    });

    render();

    return {
        play: play,
        pause: pause,
        next: next,
        prev: prev,
        restart: restart,
        goTo: goTo,
        isPlaying: function () {
            return playing;
        },
        currentIndex: function () {
            return idx;
        },
        refresh: render,
        destroy: destroy,
    };
}
