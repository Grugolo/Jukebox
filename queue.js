// ─── QUEUE & PLAYLISTS ────────────────────────────────────────────────────────
// Dipende da: state.js, draw.js, utils.js

const queueListEl = document.getElementById('queue-list');

// ── Coda ──────────────────────────────────────────────────────────────────────
function renderQueue() {
    queueListEl.innerHTML = '';
    document.getElementById('queue-section').style.display = queue.length ? 'block' : 'none';

    queue.forEach((t, i) => {
        const item  = document.createElement('div');
        const title = t.type === 'youtube' ? t.title : t.file.name;
        item.innerHTML = `
            <div style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:0.85rem;">${escapeHtml(title)}</div>
            <div style="display:flex;gap:12px;margin-left:10px;align-items:center;">
                <div onclick="moveQ(${i},-1)">${i > 0 ? DRAW.up : ''}</div>
                <div onclick="moveQ(${i}, 1)">${i < queue.length - 1 ? DRAW.down : ''}</div>
                <div onclick="remQ(${i})">${DRAW.x}</div>
            </div>`;
        queueListEl.appendChild(item);
    });
}

window.moveQ = (i, d) => { [queue[i], queue[i + d]] = [queue[i + d], queue[i]]; renderQueue(); };
window.remQ  = (i)    => { queue.splice(i, 1); renderQueue(); };

// ── Playlist salvate ──────────────────────────────────────────────────────────
function renderPlaylists() {
    const listEl = document.getElementById('saved-playlists-list');
    const all    = JSON.parse(localStorage.getItem('f_p') || '{}');
    listEl.innerHTML = '';

    Object.keys(all).forEach(name => {
        const div = document.createElement('div');
        div.innerHTML = `
            <div style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:0.85rem;">${escapeHtml(name)}</div>
            <div style="display:flex;gap:12px;margin-left:10px;align-items:center;">
                <div onclick="loadP('${name}')" style="color:var(--primary);font-weight:bold;font-size:0.7rem;cursor:pointer;">CARICA</div>
                <div onclick="delP('${name}')">${DRAW.x}</div>
            </div>`;
        listEl.appendChild(div);
    });
}

window.loadP = (n) => {
    const all = JSON.parse(localStorage.getItem('f_p'));
    all[n].forEach(s => {
        if (s.yt) {
            queue.push({
                type: 'youtube', id: s.id, title: s.title,
                thumb: 'https://img.youtube.com/vi/' + s.id + '/mqdefault.jpg'
            });
        } else {
            const m = playlist.find(x => x.file.name === s.n && x.folder === s.f);
            if (m) queue.push(m);
        }
    });
    renderQueue(); showToast('Caricata!');
};

window.delP = (n) => {
    if (confirm('Elimina?')) {
        const all = JSON.parse(localStorage.getItem('f_p'));
        delete all[n];
        localStorage.setItem('f_p', JSON.stringify(all));
        renderPlaylists();
    }
};

// ── Salva coda come playlist ──────────────────────────────────────────────────
document.getElementById('save-playlist-btn').onclick = () => {
    const n = prompt('Nome Playlist:', 'Playlist ' + new Date().toLocaleDateString());
    if (!n || !queue.length) return;
    const all = JSON.parse(localStorage.getItem('f_p') || '{}');
    all[n] = queue.map(x => x.type === 'youtube'
        ? { yt: true, id: x.id, title: x.title, thumb: x.thumb }
        : { n: x.file.name, f: x.folder });
    localStorage.setItem('f_p', JSON.stringify(all));
    renderPlaylists();
};

// ── Salva cronologia ──────────────────────────────────────────────────────────
document.getElementById('save-history-btn').onclick = () => {
    if (!playHistory.length || !startTime) return showToast('Vuota!');
    const now    = new Date();
    const startH = startTime.getHours();
    const startM = startTime.getMinutes().toString().padStart(2, '0');
    const diffDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const endH   = now.getHours() + (diffDays * 24);
    const endM   = now.getMinutes().toString().padStart(2, '0');
    const dateStr = `${startTime.getDate()}/${startTime.getMonth() + 1}/${startTime.getFullYear().toString().slice(-2)}`;
    const name   = `${dateStr} ${startH}:${startM}-${endH}:${endM}`;

    const all = JSON.parse(localStorage.getItem('f_p') || '{}');
    all[name] = playHistory.map(idx => {
        const t = playlist[idx];
        if (t && t.type === 'youtube') return { yt: true, id: t.id, title: t.title };
        return t ? { n: t.file.name, f: t.folder } : null;
    }).filter(Boolean);

    localStorage.setItem('f_p', JSON.stringify(all));
    renderPlaylists();
    showToast('Cronologia Salvata');
};
  
