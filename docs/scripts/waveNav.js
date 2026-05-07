/* WAVE NAV — single wave, travelling peak
   Static version: peak snaps to active button */

(function () {

    const WAVE_H  = 80;   // viewBox height
    const PEAK_H  = 28;   // peak crest y (lower = taller peak)
    const BASE_H  = 65;   // resting baseline y

    /* ── generate SVG path with a crest at peakX ── */
    function buildWavePath(peakX, width, crestY) {
        crestY = crestY ?? PEAK_H;
        const spread = width * 0.11;

        const pts = [
            [0,                    BASE_H],
            [peakX - spread * 1.8, BASE_H],
            [peakX - spread,       BASE_H - 8],
            [peakX,                crestY],
            [peakX + spread,       BASE_H - 8],
            [peakX + spread * 1.8, BASE_H],
            [width,                BASE_H],
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

    /* build DOM */
    function buildWaveStage() {
        const nav = document.querySelector('.bottom-nav');
        if (!nav) return;

        const stage = document.createElement('div');
        stage.className = 'wave-stage';
        stage.id = 'wave-stage';

        // 3 SVG layers for depth — back layers have a shallower crest
        const crests = [PEAK_H + 20, PEAK_H + 10, PEAK_H];
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

        // move buttons into a wrapper that sits above the wave
        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'nav-buttons';
        [...nav.querySelectorAll('.nav-btn')].forEach(btn => btnWrapper.appendChild(btn));

        nav.appendChild(stage);
        nav.appendChild(btnWrapper);
    }

    /* get button centre as viewBox x coord */
    function getPeakX(index) {
        const btns  = document.querySelectorAll('.nav-btn');
        const stage = document.getElementById('wave-stage');
        if (!btns[index] || !stage) return 500;

        const btnRect   = btns[index].getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        const centreX   = btnRect.left + btnRect.width / 2 - stageRect.left;
        return (centreX / stageRect.width) * 1000;
    }

    /* draw all three layers at peakX */
    function drawWave(peakX) {
        const crests = [PEAK_H + 20, PEAK_H + 10, PEAK_H];
        for (let i = 1; i <= 3; i++) {
            const path = document.getElementById(`wave-path-${i}`);
            if (path) path.setAttribute('d', buildWavePath(peakX, 1000, crests[i - 1]));
        }
    }

    /* set active section */
    function setActive(index) {
        document.querySelectorAll('.nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
        drawWave(getPeakX(index));
    }

    /* expose for swipe.js */
    window.setWaveAmplitude = setActive;

    /* init */
    document.addEventListener('DOMContentLoaded', () => {
        buildWaveStage();
        requestAnimationFrame(() => setActive(0));
    });

    window.addEventListener('resize', () => {
        const btns = [...document.querySelectorAll('.nav-btn')];
        const idx  = btns.findIndex(b => b.classList.contains('active'));
        if (idx >= 0) setActive(idx);
    });

})();