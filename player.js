// ─── PLAYER ───────────────────────────────────────────────────────────────────
// Dipende da: state.js, utils.js, ui.js, expandedPlayer.js

const audio         = document.getElementById('main-audio');
const seekSlider    = document.getElementById('seek-slider');
const timeCurrent   = document.getElementById('time-current');
const timeTotal     = document.getElementById('time-total');
const nowPlayingTitle = document.getElementById('now-playing-title');
const playBtn       = document.getElementById('btn-play');

// ── Riproduci traccia locale ──────────────────────────────────────────────────
function playTrack(idx, fromQueue = false, isBack = false) {
    if (idx < 0 || idx >= playlist.length) return;
    currentYTId = null;
    if (!isBack && currentPlayingIdx !== -1 && currentPlayingIdx !== idx) {
        playHistory.push(currentPlayingIdx);
    }
    currentPlayingIdx = idx;
    if (!fromQueue) lastManualLibraryIdx = idx;

    const track = playlist[idx];
    audio.src = URL.createObjectURL(track.file);
    audio.play();

    nowPlayingTitle.textContent = track.file.name.replace(/\.[^/.]+$/, '');
    updateUI();
    updateExpandedView(idx);

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title:   nowPlayingTitle.textContent,
            artist:  track.folder.split('/').pop(),
            artwork: [{ src: track.cover || 'https://placehold.co/512x512', sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => document.getElementById('btn-prev').click());
        navigator.mediaSession.setActionHandler('nexttrack',     () => document.getElementById('btn-next').click());
        navigator.mediaSession.setActionHandler('play',  () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    }
}

// ── Riproduci item generico (locale o YT) ─────────────────────────────────────
function playItem(item) {
    if (item.type === 'youtube') {
        audio.pause();
        currentYTId = item.id;
        nowPlayingTitle.textContent = item.title;

        document.querySelectorAll('#youtube-results .track-item').forEach(el => {
            const idx = parseInt(el.dataset.ytIdx);
            const v = window.ytResults[idx];
            if (v && v.id === item.id) {
                el.style.borderLeft = '5px solid var(--primary)';
                el.style.background = '#252525';
            } else {
                el.style.borderLeft = '';
                el.style.background = '#1a1a1a';
            }
        });

        if (ytReady && ytPlayer) {
            ytPlayer.loadVideoById(item.id);
        } else {
            ytPendingVideoId = item.id;
        }

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title:   item.title,
                artist:  item.uploader || 'YouTube',
                artwork: [{ src: item.thumb || '', sizes: '512x512', type: 'image/jpeg' }]
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => document.getElementById('btn-prev').click());
            navigator.mediaSession.setActionHandler('nexttrack',     () => document.getElementById('btn-next').click());
        }

        updateUI();
        return;
    }

    // File locale
    currentYTId = null;
    const idx = playlist.indexOf(item);
    playTrack(idx);
}

// ── Controlli ─────────────────────────────────────────────────────────────────
playBtn.onclick = () => {
    if (ytReady && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) { ytPlayer.pauseVideo(); return; }
        if (state === YT.PlayerState.PAUSED)  { ytPlayer.playVideo();  return; }
    }
    audio.paused ? audio.play() : audio.pause();
};

document.getElementById('btn-shuffle').onclick = () => {
    isShuffle = !isShuffle;
    if (isShuffle) {
        shuffleOrder = Array.from(Array(playlist.length).keys());
        for (let i = shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
        }
    }
    if (navigator.vibrate) navigator.vibrate(30);
    updateUI();
};

document.getElementById('btn-loop').onclick = () => { isLooping = !isLooping; updateUI(); };

document.getElementById('btn-next').onclick = () => {
    if (queue.length > 0) {
        const next = queue.shift();
        renderQueue();
        playItem(next);
        return;
    }
    let nextIdx = lastManualLibraryIdx + 1;
    if (isShuffle) nextIdx = Math.floor(Math.random() * playlist.length);
    if (nextIdx < playlist.length) playTrack(nextIdx);
};

document.getElementById('btn-prev').onclick = () => {
    if (audio.currentTime > 3) return (audio.currentTime = 0);
    if (playHistory.length) { playTrack(playHistory.pop(), false, true); return; }
    if (currentPlayingIdx > 0) playTrack(currentPlayingIdx - 1);
};

// ── Audio events ──────────────────────────────────────────────────────────────
audio.onplay  = updateUI;
audio.onpause = updateUI;

audio.onended = () => {
    if (isLooping) { audio.currentTime = 0; audio.play(); }
    else document.getElementById('btn-next').click();
};

audio.ontimeupdate = () => {
    seekSlider.value = (audio.currentTime / audio.duration) * 100 || 0;
    timeCurrent.textContent = formatTime(audio.currentTime);
    if (audio.duration) timeTotal.textContent = formatTime(audio.duration);
};

seekSlider.oninput = () => { audio.currentTime = (seekSlider.value / 100) * audio.duration; };

