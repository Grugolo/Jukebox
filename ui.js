// ─── UI ───────────────────────────────────────────────────────────────────────
// Dipende da: state.js, draw.js

function updateUI() {
    const audio   = document.getElementById('main-audio');
    const playBtn = document.getElementById('btn-play');

    let isYTPlaying = false;
    if (ytReady && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        isYTPlaying = ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
    }
    const isPlaying = isYTPlaying || !audio.paused;
    playBtn.innerHTML = isPlaying ? DRAW.pause : DRAW.play;

    document.getElementById('btn-next').innerHTML    = DRAW.next;
    document.getElementById('btn-prev').innerHTML    = DRAW.prev;
    document.getElementById('btn-loop').innerHTML    = DRAW.loop(isLooping);
    document.getElementById('btn-shuffle').innerHTML = DRAW.shuffle(isShuffle);

    document.querySelectorAll('#library .track-item').forEach(el => {
        const i = parseInt(el.dataset.idx);
        el.classList.remove('playing', 'last-pos');
        if (i === currentPlayingIdx)      el.classList.add('playing');
        else if (i === lastManualLibraryIdx) el.classList.add('last-pos');
    });
}

