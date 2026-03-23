/* ---------------------------------------------------
   PARTE 1 — VARIABILI GLOBALI + UTILITY + ICONS
--------------------------------------------------- */

// --- VARIABILI GLOBALI ---
let playlist = [];          
let queue = [];
let playHistory = [];
let currentPlayingIdx = -1;
let lastManualLibraryIdx = -1;
let isShuffle = false;
let isLooping = false;

let ytPlayer = null; // YouTube player

// --- ELEMENTI DOM ---
const audio = document.getElementById('main-audio');
const seekSlider = document.getElementById('seek-slider');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const playBtn = document.getElementById('btn-play');
const queueListEl = document.getElementById('queue-list');
const libraryEl = document.getElementById('library');
const savedPlaylistsList = document.getElementById('saved-playlists-list');
const nowPlayingTitle = document.getElementById('now-playing-title');



/* ---------------------------------------------------
   FUNZIONI UTILI
--------------------------------------------------- */

// Toast
function showToast(m) {
    const t = document.createElement('div');
    t.style.cssText = `
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: #fff; padding: 12px 25px;
        border-radius: 30px; font-weight:bold;
        z-index: 2000; transition: opacity .3s;
    `;
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 600);
}

// Format time
function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}



/* ---------------------------------------------------
   ICONS (SVG / DIV DRAWINGS)
--------------------------------------------------- */

const DRAW = {
    play: `
        <div style="
            width:0; height:0;
            border-left:18px solid #000;
            border-top:12px solid transparent;
            border-bottom:12px solid transparent;
            margin-left:4px;">
        </div>
    `,

    pause: `
        <div style="display:flex; gap:6px;">
            <div style="width:6px; height:22px; background:#000; border-radius:2px;"></div>
            <div style="width:6px; height:22px; background:#000; border-radius:2px;"></div>
        </div>
    `,

    next: `
        <div style="display:flex; align-items:center;">
            <div style="width:0; height:0; border-left:12px solid #fff; border-top:8px solid transparent; border-bottom:8px solid transparent;"></div>
            <div style="width:3px; height:16px; background:#fff; border-radius:1px;"></div>
        </div>
    `,

    prev: `
        <div style="display:flex; align-items:center;">
            <div style="width:3px; height:16px; background:#fff; border-radius:1px;"></div>
            <div style="width:0; height:0; border-right:12px solid #fff; border-top:8px solid transparent; border-bottom:8px solid transparent;"></div>
        </div>
    `,

    loop: active => `
        <div style="width:20px; height:14px; border:2px solid ${active ? '#1db954' : '#888'}; border-radius:4px; position:relative;">
            <div style="position:absolute; top:-5px; right:5px; width:0; height:0; border-left:6px solid ${active ? '#1db954' : '#888'}; border-top:3px solid transparent; border-bottom:3px solid transparent; transform:rotate(-180deg);"></div>
        </div>
    `,

    shuffle: active => `
        <svg width="26" height="20" viewBox="0 0 24 18" fill="none" stroke="${active ? '#1db954' : '#888'}" stroke-width="2" stroke-linecap="round">
            <path d="M2,14 L6,14 C9,14 11,4 14,4 L20,4" />
            <path d="M2,4 L6,4 C9,4 11,14 14,14 L20,14" />
        </svg>
    `
};



/* ---------------------------------------------------
   YOUTUBE API LOADER
--------------------------------------------------- */

window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('yt-player', {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: { playsinline: 1 },
        events: {
            onStateChange: () => updateUI()
        }
    });
};



/* ---------------------------------------------------
   INIZIALIZZAZIONE BASE
--------------------------------------------------- */

window.onload = () => {
    updateUI();
    renderPlaylists();
    setupExpandedSwipe();
};







/* ---------------------------------------------------
   PARTE 2 — CARICAMENTO BRANI LOCALI + LIBRERIA
--------------------------------------------------- */


/* ---------------------------------------------------
   CARICAMENTO CARTELLE LOCALI
--------------------------------------------------- */

document.getElementById('folderInput').onchange = async (e) => {
    const files = [...e.target.files].filter(f =>
        f.type.startsWith("audio/") || f.type.startsWith("video/")
    );

    const folders = {};

    // Raggruppa per cartella
    files.forEach(f => {
        const parts = f.webkitRelativePath.split("/");
        parts.pop();
        const path = parts.join("/") || "Root";

        if (!folders[path]) folders[path] = [];
        folders[path].push(f);
    });

    // Render cartelle
    for (const path of Object.keys(folders).sort()) {
        const group = document.createElement('div');
        group.className = 'folder-group';

        const header = document.createElement('div');
        header.className = 'folder-name';
        header.innerHTML = `📁 ${path}`;

        const container = document.createElement('div');
        header.onclick = () =>
            container.style.display = container.style.display === 'none' ? 'block' : 'none';

        group.append(header, container);

        // Aggiungi file
        for (const file of folders[path]) {
            const idx = playlist.length;

            playlist.push({
                type: "local",
                file,
                folder: path,
                cover: null,
                duration: null
            });

            const el = createTrackItem(idx);
            container.appendChild(el);

            extractCover(file, idx);
            getDuration(file, idx);
        }

        libraryEl.appendChild(group);
    }
};



/* ---------------------------------------------------
   CREA TRACK ITEM (BRANI LOCALI)
--------------------------------------------------- */

function createTrackItem(idx) {
    const track = playlist[idx];
    const file = track.file;
    const ext = file.name.split('.').pop();

    const item = document.createElement('div');
    item.className = 'track-item';

    item.innerHTML = `
        <div class="track-cover" id="cov-${idx}">🎵</div>

        <div class="track-info" onclick="playTrack(${idx})">
            <span class="track-name">${file.name.replace(/\.[^/.]+$/, "")}</span>

            <div class="track-meta-row">
                <span>${track.folder.split('/').pop()}</span>
                <span class="file-format">${ext}</span>
                <span id="dur-${idx}">...</span>
            </div>
        </div>
    `;

    setupSwipe(item, idx);
    return item;
}



/* ---------------------------------------------------
   COVER AUDIO / VIDEO
--------------------------------------------------- */

async function extractCover(file, idx) {

    // --- COVER VIDEO (screenshot) ---
    if (file.type.startsWith("video/")) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.muted = true;

        video.onloadeddata = () => video.currentTime = 1;

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');

            const size = Math.min(video.videoWidth, video.videoHeight);
            const x = (video.videoWidth - size) / 2;
            const y = (video.videoHeight - size) / 2;

            ctx.drawImage(video, x, y, size, size, 0, 0, 160, 160);

            const url = canvas.toDataURL('image/jpeg', 0.7);
            playlist[idx].cover = url;

            const img = document.getElementById(`cov-${idx}`);
            if (img) img.innerHTML = `<img src="${url}">`;

            URL.revokeObjectURL(video.src);
        };

        return;
    }

    // --- COVER AUDIO (ID3) ---
    if (window.jsmediatags && file.type.startsWith("audio/")) {
        jsmediatags.read(file, {
            onSuccess: tag => {
                const pic = tag.tags.picture;
                if (pic) {
                    const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
                    const url = URL.createObjectURL(blob);
                    playlist[idx].cover = url;

                    const img = document.getElementById(`cov-${idx}`);
                    if (img) img.innerHTML = `<img src="${url}">`;
                }
            }
        });
    }
}



/* ---------------------------------------------------
   DURATA BRANI LOCALI
--------------------------------------------------- */

function getDuration(file, idx) {
    const a = new Audio();
    a.src = URL.createObjectURL(file);

    a.onloadedmetadata = () => {
        const m = Math.floor(a.duration / 60);
        const s = Math.floor(a.duration % 60).toString().padStart(2, '0');

        playlist[idx].duration = `${m}:${s}`;

        const el = document.getElementById(`dur-${idx}`);
        if (el) el.textContent = `${m}:${s}`;

        URL.revokeObjectURL(a.src);
    };
}



/* ---------------------------------------------------
   SWIPE PER AGGIUNGERE IN CODA
--------------------------------------------------- */

function setupSwipe(el, idx) {
    let sX = 0, sY = 0, cX = 0, isSwipe = false;
    const threshold = 50;

    el.ontouchstart = e => {
        sX = e.touches[0].clientX;
        sY = e.touches[0].clientY;
        isSwipe = false;
        el.style.transition = 'none';
    };

    el.ontouchmove = e => {
        let diffX = e.touches[0].clientX - sX;
        let diffY = e.touches[0].clientY - sY;

        if (!isSwipe) {
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                isSwipe = true;
            } else if (Math.abs(diffY) > 10) return;
        }

        if (isSwipe) {
            e.preventDefault();
            cX = diffX * 0.5;
            el.style.transform = `translateX(${cX}px)`;
        }
    };

    el.ontouchend = () => {
        el.style.transition = '0.4s';
        el.style.transform = 'translateX(0)';

        if (isSwipe && Math.abs(cX) > threshold) {
            const track = playlist[idx];

            if (cX > 0) queue.unshift(track);
            else queue.push(track);

            renderQueue();
            showToast("Aggiunto alla coda");
        }

        cX = 0;
    };
}



/* ---------------------------------------------------
   RICERCA LOCALE + YOUTUBE
--------------------------------------------------- */

document.getElementById('search-input').oninput = (e) => {
    const val = e.target.value.toLowerCase();

    // Filtra libreria locale
    document.querySelectorAll('.folder-group').forEach(g => {
        let has = false;

        g.querySelectorAll('.track-item').forEach(tr => {
            const match = tr.textContent.toLowerCase().includes(val);
            tr.style.display = match ? 'flex' : 'none';
            if (match) has = true;
        });

        g.style.display = has ? 'block' : 'none';
    });

    // Filtra YouTube
    searchYouTube(val);
};




/* ---------------------------------------------------
   PARTE 3 — YOUTUBE: RICERCA + DURATA + RENDER
--------------------------------------------------- */


/* ---------------------------------------------------
   RICERCA YOUTUBE
--------------------------------------------------- */

async function searchYouTube(q) {
    const container = document.getElementById("youtube-results");

    if (!q || q.trim() === "") {
        container.innerHTML = "";
        return;
    }

    const API_KEY = "INSERISCI_LA_TUA_API_KEY"; // ← sostituisci con la tua

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=12&key=${API_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data.items) {
            container.innerHTML = "";
            return;
        }

        const durations = await getYouTubeDurations(data.items, API_KEY);
        renderYouTubeResults(data.items, durations);

    } catch (err) {
        console.error("Errore YouTube:", err);
    }
}



/* ---------------------------------------------------
   DURATA YOUTUBE (ISO 8601 → mm:ss)
--------------------------------------------------- */

async function getYouTubeDurations(items, API_KEY) {
    const ids = items.map(i => i.id.videoId).join(",");

    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    const map = {};

    data.items.forEach(v => {
        const iso = v.contentDetails.duration;

        // Converte "PT4M12S" → "4:12"
        const match = iso.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);

        const m = match[1] ? parseInt(match[1]) : 0;
        const s = match[2] ? parseInt(match[2]) : 0;

        map[v.id] = `${m}:${s.toString().padStart(2, '0')}`;
    });

    return map;
}



/* ---------------------------------------------------
   RENDER RISULTATI YOUTUBE
--------------------------------------------------- */

function renderYouTubeResults(items, durations) {
    const container = document.getElementById("youtube-results");
    container.innerHTML = "";

    items.forEach(item => {
        const video = {
            type: "youtube",
            id: item.id.videoId,
            title: item.snippet.title,
            thumb: item.snippet.thumbnails.medium.url,
            duration: durations[item.id.videoId] || "?"
        };

        const idx = playlist.length;
        playlist.push(video);

        const el = createYouTubeTrackItem(idx);
        container.appendChild(el);

        setupSwipe(el, idx);
    });
}



/* ---------------------------------------------------
   CREA TRACK ITEM YOUTUBE
--------------------------------------------------- */

function createYouTubeTrackItem(idx) {
    const t = playlist[idx];

    const el = document.createElement("div");
    el.className = "track-item";

    el.innerHTML = `
        <div class="track-cover">
            <img src="${t.thumb}">
        </div>

        <div class="track-info" onclick="playTrack(${idx})">
            <span class="track-name">${t.title}</span>

            <div class="track-meta-row">
                <span>YouTube</span>
                <span class="file-format">YT</span>
                <span>${t.duration}</span>
            </div>
        </div>
    `;

    return el;
}







/* ---------------------------------------------------
   PARTE 4 — PLAYER COMPLETO (LOCAL + YOUTUBE)
--------------------------------------------------- */


/* ---------------------------------------------------
   RIPRODUZIONE UNIFICATA
--------------------------------------------------- */

function playTrack(idx, fromQueue = false, isBack = false) {
    if (idx < 0 || idx >= playlist.length) return;

    const track = playlist[idx];

    // Cronologia
    if (!isBack && currentPlayingIdx !== -1 && currentPlayingIdx !== idx) {
        playHistory.push(currentPlayingIdx);
    }

    currentPlayingIdx = idx;
    if (!fromQueue) lastManualLibraryIdx = idx;

    // --- YOUTUBE ---
    if (track.type === "youtube") {
        audio.pause();
        if (ytPlayer) ytPlayer.loadVideoById(track.id);

        nowPlayingTitle.textContent = track.title;
        updateExpandedView(idx);
        updateUI();
        openExpandedPlayer();

        return;
    }

    // --- FILE LOCALE ---
    audio.src = URL.createObjectURL(track.file);
    audio.play();

    nowPlayingTitle.textContent = track.file.name.replace(/\.[^/.]+$/, "");
    updateExpandedView(idx);
    updateUI();
    openExpandedPlayer();
}



/* ---------------------------------------------------
   NEXT / PREV
--------------------------------------------------- */

document.getElementById('btn-next').onclick = () => {

    // Se c’è qualcosa in coda → riproduci quello
    if (queue.length > 0) {
        const next = queue.shift();
        renderQueue();
        playTrack(playlist.indexOf(next), true);
        return;
    }

    // Altrimenti vai avanti nella libreria
    let nextIdx = lastManualLibraryIdx + 1;

    if (isShuffle) {
        nextIdx = Math.floor(Math.random() * playlist.length);
    }

    if (nextIdx < playlist.length) playTrack(nextIdx);
};

document.getElementById('btn-prev').onclick = () => {
    const track = playlist[currentPlayingIdx];

    if (track.type === "youtube") {
        if (ytPlayer.getCurrentTime() > 3) {
            ytPlayer.seekTo(0, true);
            return;
        }
    } else {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
    }

    if (playHistory.length) {
        playTrack(playHistory.pop(), false, true);
        return;
    }

    if (currentPlayingIdx > 0) playTrack(currentPlayingIdx - 1);
};



/* ---------------------------------------------------
   SLIDER + SEEK
--------------------------------------------------- */

seekSlider.style.background = `
    linear-gradient(to right, var(--primary) 0%, var(--primary) 0%, #444 0%, #444 100%)
`;

function updateSeekBar() {
    const track = playlist[currentPlayingIdx];
    if (!track) return;

    let cur = 0;
    let dur = 0;

    if (track.type === "youtube") {
        if (!ytPlayer) return;
        cur = ytPlayer.getCurrentTime();
        dur = ytPlayer.getDuration();
    } else {
        cur = audio.currentTime;
        dur = audio.duration;
    }

    if (!dur || isNaN(dur)) return;

    const percent = (cur / dur) * 100;
    seekSlider.value = percent;

    seekSlider.style.background = `
        linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, #444 ${percent}%, #444 100%)
    `;

    timeCurrent.textContent = formatTime(cur);
    timeTotal.textContent = formatTime(dur);
}

setInterval(updateSeekBar, 200);

seekSlider.oninput = () => {
    const track = playlist[currentPlayingIdx];
    if (!track) return;

    const percent = seekSlider.value / 100;

    if (track.type === "youtube") {
        const dur = ytPlayer.getDuration();
        ytPlayer.seekTo(dur * percent, true);
    } else {
        audio.currentTime = audio.duration * percent;
    }

    updateSeekBar();
};



/* ---------------------------------------------------
   CODA (QUEUE)
--------------------------------------------------- */

function renderQueue() {
    queueListEl.innerHTML = "";
    document.getElementById('queue-section').style.display = queue.length ? 'block' : 'none';

    queue.forEach((t, i) => {
        const title = t.type === "youtube" ? t.title : t.file.name;

        const item = document.createElement('div');
        item.className = "playlist-row";

        item.innerHTML = `
            <span>${title}</span>
            <div style="display:flex; gap:10px;">
                <button onclick="moveQ(${i},-1)">⬆️</button>
                <button onclick="moveQ(${i},1)">⬇️</button>
                <button onclick="remQ(${i})">❌</button>
            </div>
        `;

        queueListEl.appendChild(item);
    });
}

window.moveQ = (i, d) => {
    if (!queue[i + d]) return;
    [queue[i], queue[i + d]] = [queue[i + d], queue[i]];
    renderQueue();
};

window.remQ = (i) => {
    queue.splice(i, 1);
    renderQueue();
};



/* ---------------------------------------------------
   PLAYLIST SALVATE
--------------------------------------------------- */

document.getElementById('save-playlist-btn').onclick = () => {
    if (!queue.length) return showToast("Coda vuota!");

    const name = prompt("Nome playlist:", "Playlist " + new Date().toLocaleDateString());
    if (!name) return;

    const all = JSON.parse(localStorage.getItem('f_p') || '{}');

    all[name] = queue.map(t => {
        if (t.type === "youtube") {
            return { yt: true, id: t.id, title: t.title };
        }
        return { n: t.file.name, f: t.folder };
    });

    localStorage.setItem('f_p', JSON.stringify(all));
    renderPlaylists();
    showToast("Playlist salvata");
};



/* ---------------------------------------------------
   CARICA PLAYLIST
--------------------------------------------------- */

function renderPlaylists() {
    savedPlaylistsList.innerHTML = "";

    const all = JSON.parse(localStorage.getItem('f_p') || '{}');

    Object.keys(all).forEach(name => {
        const row = document.createElement('div');
        row.className = "playlist-row";

        row.innerHTML = `
            <span onclick="loadP('${name}')">${name}</span>
            <button onclick="delP('${name}')">❌</button>
        `;

        savedPlaylistsList.appendChild(row);
    });
}

window.loadP = (name) => {
    const all = JSON.parse(localStorage.getItem('f_p') || '{}');
    const list = all[name];
    if (!list) return;

    list.forEach(s => {
        if (s.yt) {
            queue.push({
                type: "youtube",
                id: s.id,
                title: s.title,
                thumb: "https://img.youtube.com/vi/" + s.id + "/mqdefault.jpg"
            });
        } else {
            const m = playlist.find(x => x.file.name === s.n && x.folder === s.f);
            if (m) queue.push(m);
        }
    });

    renderQueue();
    showToast("Playlist caricata");
};

window.delP = (name) => {
    const all = JSON.parse(localStorage.getItem('f_p') || '{}');
    delete all[name];
    localStorage.setItem('f_p', JSON.stringify(all));
    renderPlaylists();
};



/* ---------------------------------------------------
   CRONOLOGIA
--------------------------------------------------- */

document.getElementById('save-history-btn').onclick = () => {
    if (!playHistory.length) return showToast("Cronologia vuota!");

    const name = "Cronologia " + new Date().toLocaleDateString();

    const all = JSON.parse(localStorage.getItem('f_p') || '{}');

    all[name] = playHistory.map(idx => {
        const t = playlist[idx];
        if (t.type === "youtube") {
            return { yt: true, id: t.id, title: t.title };
        }
        return { n: t.file.name, f: t.folder };
    });

    localStorage.setItem('f_p', JSON.stringify(all));
    renderPlaylists();
    showToast("Cronologia salvata");
};



/* ---------------------------------------------------
   EXPANDED PLAYER
--------------------------------------------------- */

function openExpandedPlayer() {
    document.getElementById('expanded-player').classList.add('open');
}

function closeExpandedPlayer() {
    document.getElementById('expanded-player').classList.remove('open');
}

function setupExpandedSwipe() {
    const ep = document.getElementById('expanded-player');
    let startY = 0;

    ep.ontouchstart = e => startY = e.touches[0].clientY;

    ep.ontouchend = e => {
        const endY = e.changedTouches[0].clientY;
        if (endY - startY > 80) closeExpandedPlayer();
    };
}

function updateExpandedView(idx) {
    const track = playlist[idx];
    const container = document.getElementById('visual-container');
    container.innerHTML = "";

    if (track.type === "youtube") {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${track.id}`;
        iframe.allow = "autoplay";
        container.appendChild(iframe);
    } else {
        const img = document.createElement('img');
        img.src = track.cover || "https://placehold.co/300x300";
        container.appendChild(img);
    }
}



/* ---------------------------------------------------
   MEDIA SESSION (ANDROID)
--------------------------------------------------- */

function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: nowPlayingTitle.textContent,
        artist: track.type === "youtube" ? "YouTube" : track.folder.split('/').pop(),
        artwork: [
            { src: track.cover || track.thumb || "https://placehold.co/512", sizes: "512x512", type: "image/png" }
        ]
    });

    navigator.mediaSession.setActionHandler('play', () => playBtn.click());
    navigator.mediaSession.setActionHandler('pause', () => playBtn.click());
    navigator.mediaSession.setActionHandler('previoustrack', () => document.getElementById('btn-prev').click());
    navigator.mediaSession.setActionHandler('nexttrack', () => document.getElementById('btn-next').click());
}



/* ---------------------------------------------------
   UPDATE UI
--------------------------------------------------- */

function updateUI() {
    const track = playlist[currentPlayingIdx];
    const isYT = track?.type === "youtube";

    try {
        if (isYT) {
            const state = ytPlayer?.getPlayerState();
            playBtn.innerHTML = (state === YT.PlayerState.PLAYING) ? DRAW.pause : DRAW.play;
        } else {
            playBtn.innerHTML = audio.paused ? DRAW.play : DRAW.pause;
        }
    } catch {
        playBtn.innerHTML = DRAW.play;
    }

    document.getElementById('btn-next').innerHTML = DRAW.next;
    document.getElementById('btn-prev').innerHTML = DRAW.prev;
    document.getElementById('btn-loop').innerHTML = DRAW.loop(isLooping);
    document.getElementById('btn-shuffle').innerHTML = DRAW.shuffle(isShuffle);

    document.querySelectorAll('.track-item').forEach((el, i) => {
        el.classList.remove('playing');
        if (i === currentPlayingIdx) el.classList.add('playing');
    });
}



/* ---------------------------------------------------
   PLAY / PAUSE BUTTON
--------------------------------------------------- */

playBtn.onclick = () => {
    const track = playlist[currentPlayingIdx];
    if (!track) return;

    if (track.type === "youtube") {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
    } else {
        audio.paused ? audio.play() : audio.pause();
    }

    updateUI();
};