// ─── YOUTUBE ──────────────────────────────────────────────────────────────────
// Dipende da: config.js, state.js, utils.js, player.js, queue.js

// ── IFrame API callback (chiamata dall'SDK YT) ────────────────────────────────
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('yt-player', {
        height: '1', width: '1', videoId: '',
        playerVars: { playsinline: 1, autoplay: 0 },
        events: {
            onReady: () => {
                ytReady = true;
                if (ytPendingVideoId) {
                    ytPlayer.loadVideoById(ytPendingVideoId);
                    ytPendingVideoId = null;
                }
            },
            onStateChange: onYTStateChange
        }
    });
}

function onYTStateChange(e) {
    if (e.data === YT.PlayerState.ENDED) {
        document.getElementById('btn-next').click();
    }
    document.getElementById('btn-play').innerHTML =
        (e.data === YT.PlayerState.PLAYING) ? DRAW.pause : DRAW.play;
}

// ── Ricerca YouTube Data API v3 ───────────────────────────────────────────────
let ytSearchDebounce = null;

async function searchYouTube(q) {
    const container = document.getElementById('youtube-results');
    const section   = document.getElementById('yt-section');

    if (!q || q.length < 2) {
        section.style.display = 'none';
        container.innerHTML = '';
        window.ytResults = [];
        return;
    }

    // Skeleton loader
    section.style.display = 'block';
    container.innerHTML = `
        <div class="yt-skeleton">
            ${[0, 1, 2].map(() => `
            <div class="yt-skeleton-item">
                <div class="skel-cover"></div>
                <div class="skel-info">
                    <div class="skel-line"></div>
                    <div class="skel-line short"></div>
                </div>
            </div>`).join('')}
        </div>`;

    try {
        // 1) Search
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=3&key=${YT_API_KEY}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error(await searchRes.text());
        const searchData = await searchRes.json();

        const items = searchData.items || [];
        if (!items.length) {
            container.innerHTML = `<div style="color:var(--text-dim);font-size:0.8rem;padding:10px;">Nessun risultato</div>`;
            return;
        }

        const videoIds = items.map(i => i.id.videoId).join(',');

        // 2) Videos.list (durata)
        const detailUrl  = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YT_API_KEY}`;
        const detailRes  = await fetch(detailUrl, { signal: AbortSignal.timeout(8000) });
        const detailData = detailRes.ok ? await detailRes.json() : { items: [] };

        const durationMap = {};
        (detailData.items || []).forEach(v => {
            durationMap[v.id] = parseISO8601Duration(v.contentDetails.duration);
        });

        window.ytResults = items.map(item => ({
            type:     'youtube',
            id:       item.id.videoId,
            title:    item.snippet.title,
            thumb:    item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            duration: durationMap[item.id.videoId] || 0,
            uploader: item.snippet.channelTitle || 'YouTube'
        }));

        renderYouTubeResults(window.ytResults);

    } catch (err) {
        console.error('YouTube search error:', err);
        container.innerHTML = `<div style="color:#ff4444;font-size:0.8rem;padding:10px;">Errore: ${err.message}</div>`;
    }
}

// ── Render risultati ──────────────────────────────────────────────────────────
function renderYouTubeResults(results) {
    const container = document.getElementById('youtube-results');
    container.innerHTML = '';
    const n = results.length;

    results.forEach((video, i) => {
        const el = document.createElement('div');
        el.className = 'track-item';
        el.dataset.ytIdx = i;

        el.style.background   = '#1a1a1a';
        el.style.borderBottom = i < n - 1 ? '1px solid #2a2a2a' : 'none';
        el.style.marginBottom = i === n - 1 ? '15px' : '0';
        if      (n === 1)       el.style.borderRadius = '15px';
        else if (i === 0)       el.style.borderRadius = '15px 15px 0 0';
        else if (i === n - 1)   el.style.borderRadius = '0 0 15px 15px';

        const durStr = video.duration ? formatTime(video.duration) : '';

        el.innerHTML = `
            <div class="track-cover">
                <img src="${video.thumb}" alt="" onerror="this.parentElement.innerHTML='▶️'">
            </div>
            <div class="track-info" data-play-yt="${i}">
                <span class="track-name">${escapeHtml(video.title)}</span>
                <div class="track-meta-row">
                    <span>${escapeHtml(video.uploader)}</span>
                    <span class="file-format yt-badge">YT</span>
                    ${durStr ? `<span style="color:var(--primary);font-weight:bold;">${durStr}</span>` : ''}
                </div>
            </div>`;

        el.querySelector('[data-play-yt]').onclick = () => playItem(window.ytResults[i]);

        if (currentYTId && currentYTId === video.id) {
            el.style.borderLeft = '5px solid var(--primary)';
            el.style.background = '#252525';
        }

        setupYTSwipe(el, i);
        container.appendChild(el);
    });
}

// ── Swipe su risultato YT ─────────────────────────────────────────────────────
function setupYTSwipe(el, idx) {
    let sX = 0, sY = 0, cX = 0, isSwipe = false;
    const threshold = 50;

    el.ontouchstart = e => {
        sX = e.touches[0].clientX; sY = e.touches[0].clientY;
        isSwipe = false; el.style.transition = 'none';
    };

    el.ontouchmove = e => {
        let dX = e.touches[0].clientX - sX, dY = e.touches[0].clientY - sY;
        if (!isSwipe) {
            if (Math.abs(dX) > Math.abs(dY) && Math.abs(dX) > 10) isSwipe = true;
            else if (Math.abs(dY) > 10) return;
        }
        if (isSwipe) {
            e.preventDefault();
            cX = dX * 0.5;
            el.style.transform = `translateX(${cX}px)`;
            el.style.backgroundColor = cX > 0
                ? `rgba(76,175,80,${Math.min(Math.abs(cX) / 100, 0.4)})`
                : `rgba(33,150,243,${Math.min(Math.abs(cX) / 100, 0.4)})`;
        }
    };

    el.ontouchend = () => {
        el.style.transition = '0.4s cubic-bezier(0.18,0.89,0.32,1.28)';
        el.style.transform = 'translateX(0)';
        el.style.backgroundColor = '';
        if (isSwipe && Math.abs(cX) > threshold) {
            if (navigator.vibrate) navigator.vibrate(30);
            const video = window.ytResults[idx];
            if (cX > 0) { queue.unshift(video); showToast('In cima ↑'); }
            else         { queue.push(video);    showToast('In fondo ↓'); }
            renderQueue();
        }
        cX = 0;
    };
}

