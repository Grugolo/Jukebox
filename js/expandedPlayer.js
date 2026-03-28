// ─── EXPANDED PLAYER ─────────────────────────────────────────────────────────
import { state }      from './state.js';
import { showToast, formatTime } from './utils.js';

const audio = document.getElementById('main-audio');
let lastTap = 0;

// ─── Seekbar polling per YT ───────────────────────────────────────────────────
let ytSeekInterval = null;

export function startYTSeekPolling() {
    stopYTSeekPolling();
    const seekSlider  = document.getElementById('seek-slider');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal   = document.getElementById('time-total');

    ytSeekInterval = setInterval(() => {
        if (!state.ytPlayer || !state.currentYTId) { stopYTSeekPolling(); return; }
        try {
            const cur = state.ytPlayer.getCurrentTime() || 0;
            const dur = state.ytPlayer.getDuration()    || 0;
            if (dur > 0) {
                seekSlider.value      = (cur / dur) * 100;
                timeCurrent.textContent = formatTime(cur);
                timeTotal.textContent   = formatTime(dur);
            }
        } catch (_) {}
    }, 500);
}

export function stopYTSeekPolling() {
    clearInterval(ytSeekInterval);
    ytSeekInterval = null;
}

/** Apre o chiude il player espanso */
export function togglePlayer(open) {
    const p = document.getElementById('expanded-player');
    if (!p) return;
    // Apri se c'è qualcosa in riproduzione: YT oppure traccia locale
    const hasYT    = !!state.currentYTId;
    const hasLocal = state.currentPlayingIdx !== -1;
    if (open && (hasYT || hasLocal)) {
        updateExpandedView();
        p.classList.add('open');
    } else {
        p.classList.remove('open');
        // Se YT è attivo, rimetti l'iframe al suo posto originale nascosto
        if (hasYT) {
            const ytEl = document.getElementById('yt-player');
            if (ytEl) {
                ytEl.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
                document.body.appendChild(ytEl);
            }
        }
        stopYTSeekPolling();
    }
}

/** Aggiorna il contenuto visivo: YT iframe, video locale, o copertina */
export function updateExpandedView(idx) {
    const vContainer = document.getElementById('visual-container');
    if (!vContainer) return;
    vContainer.innerHTML = '';

    // ── Caso YT: mostra l'iframe già esistente nel DOM ──────────────────────
    if (state.currentYTId) {
        const ytEl = document.getElementById('yt-player');
        if (ytEl) {
            ytEl.style.cssText = 'width:100%;height:100%;max-height:80vh;opacity:1;pointer-events:auto;position:relative;border-radius:10px;';
            vContainer.appendChild(ytEl);
        }
        // Polling già avviato da playItem; non serve riavviarlo qui
        return;
    }

    // ── Caso locale ──────────────────────────────────────────────────────────
    stopYTSeekPolling();
    const resolvedIdx = (idx !== undefined) ? idx : state.currentPlayingIdx;
    if (resolvedIdx === -1) return;
    const track = state.playlist[resolvedIdx];
    if (!track) return;

    if (track.file.type.startsWith('video/')) {
        vContainer.appendChild(audio);
        audio.style.display   = 'block';
        audio.style.width     = '100%';
        audio.style.maxHeight = '100%';
    } else {
        const img = document.createElement('img');
        img.src = track.cover || 'https://placehold.co/512x512';
        img.style.cssText = 'width:85%;border-radius:15px;';
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
