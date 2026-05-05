const SECTION_COUNT = 5;
let current = 0;

const track = document.getElementById('track');

function goTo(i) {
    if (i < 0 || i >= SECTION_COUNT) return;
    current = i;
    track.style.transform = `translateX(-${i * 100}vw)`;
    document.querySelectorAll('.nav-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === i);
    });
}

/* keyboard — left / right arrow keys */
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft')  goTo(current - 1);
});

/* touch swipe */
let touchStartX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', e => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
        goTo(delta > 0 ? current + 1 : current - 1);
    }
}, { passive: true });