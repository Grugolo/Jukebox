// ─── EXPANDED PLAYER ─────────────────────────────────────────────────────────
import { state }     from './state.js';
import { showToast } from './utils.js';

const audio = document.getElementById('main-audio');
let lastTap = 0;

/** Apre o chiude il player espanso */
export function togglePlayer(open) {
    const p = document.getElementById('expanded-player');
    if (!p) return;
    if (open && state.currentPlayingIdx !== -1) {
        updateExpandedView(state.currentPlayingIdx);
        p.classList.add('open');
    } else {
        p.classList.remove('open');
    }
}

/** Aggiorna il contenuto visivo (copertina o video) */
export function updateExpandedView(idx) {
    const vContainer = document.getElementById('visual-container');
    if (!vContainer || idx === -1) return;

    const track = state.playlist[idx];
    vContainer.innerHTML = '';

    if (track.file.type.startsWith('video/')) {
        vContainer.appendChild(audio);
        audio.style.display   = 'block';
        audio.style.width     = '100%';
        audio.style.maxHeight = '100%';
    } else {
        const img = document.createElement('img');
        img.src          = track.cover || 'https://placehold.co/512x512';
        img.style.width  = '85%';
        img.style.borderRadius = '15px';
        vContainer.appendChild(img);
        document.body.appendChild(audio);
        audio.style.display = 'none';
    }
}

/** Inizializza swipe e gesture sull'expanded player — chiamare in window.onload */
export function setupExpandedSwipe() {
    const el       = document.getElementById('expanded-player');
    const vContainer = document.getElementById('visual-container');
    const closeBtn = document.querySelector('.close-indicator');
    if (!el) return;

    let sX = 0, sY = 0;
    const threshold = 60;

    closeBtn.onclick = (e) => { e.stopPropagation(); togglePlayer(false); };

    // Double-tap / single-tap sul visual
    vContainer.onclick = (e) => {
        const now   = Date.now();
        const DELAY = 300;
        const rect  = vContainer.getBoundingClientRect();
        const x     = e.clientX - rect.left;
        const width = rect.width;

        if (now - lastTap < DELAY) {
            // Double tap
            if      (x > width * 2 / 3) { audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); showToast('+10s ⏩'); }
            else if (x < width / 3)     { audio.currentTime = Math.max(0, audio.currentTime - 5);               showToast('⏪ -5s'); }
            lastTap = 0;
        } else {
            lastTap = now;
            setTimeout(() => {
                if (Date.now() - lastTap >= DELAY && lastTap !== 0) {
                    audio.paused ? audio.play() : audio.pause();
                }
            }, DELAY);
        }
    };

    // Swipe verticale → chiudi; orizzontale → prev/next
    el.addEventListener('touchstart', e => {
        sX = e.touches[0].clientX;
        sY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchend', e => {
        const dX = e.changedTouches[0].clientX - sX;
        const dY = e.changedTouches[0].clientY - sY;

        if (Math.abs(dY) > Math.abs(dX) && dY > threshold) {
            togglePlayer(false);
        } else if (Math.abs(dX) > Math.abs(dY)) {
            if      (dX >  threshold) document.getElementById('btn-prev').click();
            else if (dX < -threshold) document.getElementById('btn-next').click();
        }
    }, { passive: true });
}
