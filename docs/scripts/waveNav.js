/* WAVE NAV — animated travelling peak
   + idle movement on each layer */

(function () {

    const WAVE_H    = 80;
    const BASE_H    = 65;   // resting baseline y
    const PEAK_H    = 22;   // active crest y

    const TRAVEL_MS = 520;
    const EASING    = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;

    /* idle animation config
       amplitude: how many vb units it rises/falls
       period:    full cycle duration in ms
       phase:     offset so layers don't sync up               */
    const MOVE = [
        { amplitude: 3.5, period: 4200, phase: 0      },  // layer 1 — back
        { amplitude: 2.5, period: 5100, phase: 1400   },  // layer 2 — mid
        { amplitude: 2.0, period: 3700, phase: 2600   },  // layer 3 — front
    ];

    /* travel state */
    let currentPeakX  = 500;
    let currentCrestY = PEAK_H;
    let fromPeakX     = 500;
    let fromCrestY    = PEAK_H;
    let targetPeakX   = 500;
    let targetCrestY  = PEAK_H;
    let animStart     = null;
    let travelling    = false;
    let rafId         = null;

    /* build a wave path for one layer
       movementOffset nudges the whole layer's baseline up/down  */
    function buildWavePath(peakX, crestY, width, layerOffset, movementOffset) {
        layerOffset  = layerOffset  || 0;
        movementOffset = movementOffset || 0;

        const spread = width * 0.11;
        const base   = BASE_H   + layerOffset + movementOffset;
        const crest  = crestY   + layerOffset + movementOffset;

        const pts = [
            [0,                    base],
            [peakX - spread * 1.8, base],
            [peakX - spread,       base - 7],
            [peakX,                crest],
            [peakX + spread,       base - 7],
            [peakX + spread * 1.8, base],
            [width,                base],
        ];

        let d = `M ${pts[0][0]},${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            const cpX  = (prev[0] + curr[0]) / 2;
            d += ` C ${cpX},${prev[1]} ${cpX},${curr[1]} ${curr[0]},${curr[1]}`;
        }
        d += ` L ${width},${WAVE_H} L 0,${WAVE_H} Z`;
        return d;
    }

    /* draw all three layers, applying individual movement offsets */
    function drawWave(peakX, crestY, timestamp) {
        const offsets = [14, 7, 0]; // depth — layer 1 sits furthest back
        for (let i = 1; i <= 3; i++) {
            const path = document.getElementById(`wave-path-${i}`);
            if (!path) continue;

            let movementOffset = 0;
            if (timestamp !== undefined) {
                const b = MOVE[i - 1];
                // SIN oscillation: positive = layer rises (lower y value)
                movementOffset = -b.amplitude * Math.sin(
                    (2 * Math.PI * ((timestamp + b.phase) % b.period)) / b.period
                );
            }

            path.setAttribute('d',
                buildWavePath(peakX, crestY, 1000, offsets[i - 1], movementOffset)
            );
        }
    }

    /* main loop — runs continuously */
    function loop(timestamp) {
        if (travelling) {
            if (!animStart) animStart = timestamp;
            const elapsed  = timestamp - animStart;
            const progress = Math.min(elapsed / TRAVEL_MS, 1);
            const eased    = EASING(progress);

            currentPeakX  = fromPeakX  + (targetPeakX  - fromPeakX)  * eased;
            currentCrestY = fromCrestY + (targetCrestY  - fromCrestY) * eased;

            if (progress >= 1) travelling = false;
        }

        drawWave(currentPeakX, currentCrestY, timestamp);
        rafId = requestAnimationFrame(loop);
    }

    /* trigger travel to a new position */
    function travelTo(peakX, crestY) {
        fromPeakX    = currentPeakX;
        fromCrestY   = currentCrestY;
        targetPeakX  = peakX;
        targetCrestY = crestY;
        animStart    = null;
        travelling   = true;
    }

    /* get button centre as viewBox x */
    function getPeakX(index) {
        const btns  = document.querySelectorAll('.nav-btn');
        const stage = document.getElementById('wave-stage');
        if (!btns[index] || !stage) return 500;
        const btnRect   = btns[index].getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        const centreX   = btnRect.left + btnRect.width / 2 - stageRect.left;
        return (centreX / stageRect.width) * 1000;
    }

    /* build Object Model */
    function buildWaveStage() {
        const nav = document.querySelector('.bottom-nav');
        if (!nav) return;

        const stage = document.createElement('div');
        stage.className = 'wave-stage';
        stage.id = 'wave-stage';

        for (let i = 1; i <= 3; i++) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', `0 0 1000 ${WAVE_H}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.classList.add('wave-svg', `wave-svg-${i}`);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.id = `wave-path-${i}`;
            svg.appendChild(path);
            stage.appendChild(svg);
        }

        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'nav-buttons';
        [...nav.querySelectorAll('.nav-btn')].forEach(btn => btnWrapper.appendChild(btn));

        nav.appendChild(stage);
        nav.appendChild(btnWrapper);
    }

    /* public: called by swipe.js */
    function setActive(index) {
        document.querySelectorAll('.nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
        travelTo(getPeakX(index), PEAK_H);
    }

    window.setWaveAmplitude = setActive;

    /* init */
    document.addEventListener('DOMContentLoaded', () => {
        buildWaveStage();
        requestAnimationFrame(() => {
            currentPeakX  = getPeakX(0);
            currentCrestY = PEAK_H;
            rafId = requestAnimationFrame(loop);
        });
    });

    window.addEventListener('resize', () => {
        const btns = [...document.querySelectorAll('.nav-btn')];
        const idx  = btns.findIndex(b => b.classList.contains('active'));
        if (idx >= 0) {
            currentPeakX = getPeakX(idx);
        }
    });

})();