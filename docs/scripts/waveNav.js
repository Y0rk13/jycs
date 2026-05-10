/* WAVE NAV — animated travelling peak
   + idle breathing (vertical)
   + idle drift (horizontal) */

(function () {

    const WAVE_H    = 80;
    const BASE_H    = 65;
    const PEAK_H    = 22;

    const TRAVEL_MS = 520;
    const EASING    = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;

    /* idle config per layer

       breath.amplitude  : vertical px oscillation
       breath.period     : full vertical cycle ms
       breath.phase      : vertical phase offset ms
       
       drift.speed       : horizontal viewBox units per second
       drift.direction   : 1 = left, -1 = right */

    const IDLE = [
        {
            breath: { amplitude: 3.5, period: 4200, phase: 0    },
            drift:  { speed: 12,  direction:  1 },   // back — slowest, drifts right→left
        },
        {
            breath: { amplitude: 2.5, period: 5100, phase: 1400 },
            drift:  { speed: 20, direction: -1 },   // mid — medium, drifts left→right
        },
        {
            breath: { amplitude: 2.0, period: 3700, phase: 2600 },
            drift:  { speed: 30,  direction:  1 },   // front — fastest, drifts right→left
        },
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
    let lastTimestamp = null;

    /* per-layer drift accumulator in viewBox units */
    const driftX = [0, 0, 0];

    /*  build wave path 
       driftOffset shifts the entire wave shape horizontally,
       creating the illusion the water surface is moving.
       We wrap the peak position so it stays on screen.        */
    function buildWavePath(peakX, crestY, width, layerOffset, breathOffset, driftOffset) {
        layerOffset  = layerOffset  || 0;
        breathOffset = breathOffset || 0;
        driftOffset  = driftOffset  || 0;

        const spread = width * 0.11;
        const base   = BASE_H + layerOffset + breathOffset;
        const crest  = crestY + layerOffset + breathOffset;

        // drift shifts points; peak stays anchored to button
        const px = peakX;
        const sl = peakX - spread + driftOffset * 0.3;
        const sr = peakX + spread + driftOffset * 0.3;
        const sl2 = peakX - spread * 1.8 + driftOffset * 0.5;
        const sr2 = peakX + spread * 1.8 + driftOffset * 0.5;

        const pts = [
            [0,     base],
            [sl2,   base],
            [sl,    base - 7],
            [px,    crest],
            [sr,    base - 7],
            [sr2,   base],
            [width, base],
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

    /*  draw all three layers  */
    function drawWave(peakX, crestY, timestamp, delta) {
        const layerOffsets = [0, 7, 14];

        for (let i = 1; i <= 3; i++) {
            const path = document.getElementById(`wave-path-${i}`);
            if (!path) continue;

            const idle = IDLE[i - 1];

            // vertical breath
            let breathOffset = 0;
            if (timestamp !== undefined) {
                breathOffset = -idle.breath.amplitude * Math.sin(
                    (2 * Math.PI * ((timestamp + idle.breath.phase) % idle.breath.period)) / idle.breath.period
                );
            }

            // horizontal drift, accumulate over time
            if (delta !== undefined) {
                driftX[i - 1] += idle.drift.speed * idle.drift.direction * (delta / 1000);
                // wrap so it doesn't grow forever
                driftX[i - 1] = driftX[i - 1] % 200;
            }

            path.setAttribute('d',
                buildWavePath(peakX, crestY, 1000, layerOffsets[i - 1], breathOffset, driftX[i - 1])
            );
        }
    }

    /* main RAF loop */
    function loop(timestamp) {
        const delta = lastTimestamp !== null ? timestamp - lastTimestamp : 0;
        lastTimestamp = timestamp;

        if (travelling) {
            if (!animStart) animStart = timestamp;
            const elapsed  = timestamp - animStart;
            const progress = Math.min(elapsed / TRAVEL_MS, 1);
            const eased    = EASING(progress);

            currentPeakX  = fromPeakX  + (targetPeakX  - fromPeakX)  * eased;
            currentCrestY = fromCrestY + (targetCrestY  - fromCrestY) * eased;

            if (progress >= 1) travelling = false;
        }

        drawWave(currentPeakX, currentCrestY, timestamp, delta);
        rafId = requestAnimationFrame(loop);
    }

    /* trigger travel */
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

    /*  build DOM  */
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

    /*  public  */
    function setActive(index) {
        document.querySelectorAll('.nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
        travelTo(getPeakX(index), PEAK_H);
    }

    window.setWaveSwell = setActive;

    /*  init  */
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
        if (idx >= 0) currentPeakX = getPeakX(idx);
    });

})();