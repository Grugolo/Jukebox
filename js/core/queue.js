// ── queue.js ─────────────────────────────────────────────────────
import { store }          from './store.js';
import { showToast, fmtDateShort } from '../utils.js';
import { saveState }      from './persist.js';
import { emit, EV }       from './events.js';

const LS_KEY = 'f_p';

/* ── helpers emit ───────────────────────────────────────────────── */
function _queueChanged() {
  _refreshQueueUI();
  saveState();
  emit(EV.QUEUE_CHANGE);
}

export function enqueue(item, top = false) {
  top ? store.queue.unshift(item) : store.queue.push(item);
  showToast(top ? 'In cima ↑' : 'In fondo ↓');
  if (navigator.vibrate) navigator.vibrate(30);
  _queueChanged();
}

export function dequeueNext() {
  if (!store.queue.length) return false;
  const item = store.queue.shift();
  _queueChanged();
  import('./player.js').then(({ playLocal, playYT }) => {
    if (item.type === 'youtube') {
      playYT(item);
    } else {
      const idx = store.playlist.indexOf(item);
      if (idx !== -1) playLocal(idx);
    }
  });
  return true;
}

export function removeFromQueue(i) {
  store.queue.splice(i, 1);
  _queueChanged();
}

export function clearQueue() {
  store.queue = [];
  _queueChanged();
}

export function reorderQueue(from, to) {
  if (from === to) return;
  const [item] = store.queue.splice(from, 1);
  store.queue.splice(to, 0, item);
  _queueChanged();
}

export function loadPlaylists() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}

export function saveQueueAsPlaylist(name) {
  if (!name?.trim() || !store.queue.length) return;
  const all = loadPlaylists();
  all[name] = store.queue.map(_serialize);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  _refreshPlaylistUI();
}

export function saveHistoryAsPlaylist(name) {
  if (!name?.trim()) return;

  const entries = store.playHistory
    .map(entry => {
      if (entry && typeof entry === 'object' && entry.yt) {
        return { yt: true, id: entry.id, title: entry.title, duration: entry.duration || 0 };
      }
      const track = store.playlist[entry];
      return track ? { n: track.file.name, f: track.folder } : null;
    })
    .filter(Boolean);

  if (store.currentYTId && store.currentYTItem) {
    entries.push({ yt: true, id: store.currentYTId, title: store.currentYTItem.title, duration: store.currentYTItem.duration || 0 });
  } else if (store.currentIdx !== -1 && store.playlist[store.currentIdx]) {
    const cur = store.playlist[store.currentIdx];
    entries.push({ n: cur.file.name, f: cur.folder });
  }

  if (!entries.length) { showToast('Vuota!'); return; }

  const all = loadPlaylists();
  all[name] = entries;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  _refreshPlaylistUI();
  showToast('Cronologia salvata');
}

export function loadPlaylistIntoQueue(name) {
  const all = loadPlaylists();
  if (!all[name]) return;
  all[name].forEach(s => {
    if (s.yt) {
      store.queue.push({
        type:     'youtube',
        id:       s.id,
        title:    s.title,
        thumb:    `https://img.youtube.com/vi/${s.id}/mqdefault.jpg`,
        duration: s.duration || 0,
      });
    } else {
      const match = store.playlist.find(x => x.file.name === s.n && x.folder === s.f);
      if (match) store.queue.push(match);
    }
  });
  _queueChanged();
  showToast('Caricata!');
}

export function deletePlaylist(name) {
  const all = loadPlaylists();
  delete all[name];
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  _refreshPlaylistUI();
}

/**
 * Importa una playlist da array di righe testo (da file .txt).
 * Formato riga: "titolo, id_o_path, durata_secondi"
 * Se c'è solo il titolo (senza virgole), cerca su YT e carica il primo risultato.
 */
export async function importPlaylistFromLines(name, lines) {
  const { YT_API_KEY } = await import('../config.js');
  const entries = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());

    if (parts.length >= 2) {
      // Ha almeno titolo + id/path
      const title    = parts[0];
      const idOrPath = parts[1];
      const duration = parseInt(parts[2]) || 0;

      // Determina se è un id YT (11 chars alfanumerici) o un filename
      if (/^[A-Za-z0-9_-]{11}$/.test(idOrPath)) {
        entries.push({
          yt:       true,
          id:       idOrPath,
          title,
          duration,
        });
      } else {
        // È un file locale
        entries.push({ n: idOrPath, f: title });
      }
    } else {
      // Solo nome: cerca su YT
      try {
        const res  = await fetch(
          `https://www.googleapis.com/youtube/v3/search` +
          `?part=snippet&type=video&maxResults=1` +
          `&q=${encodeURIComponent(line)}&key=${YT_API_KEY}`
        );
        const data = await res.json();
        const item = data.items?.[0];
        if (item) {
          entries.push({
            yt:    true,
            id:    item.id.videoId,
            title: item.snippet.title,
            duration: 0,
          });
        }
      } catch (_) {}
    }
  }

  if (!entries.length) { showToast('Nessun brano trovato'); return; }

  const all = loadPlaylists();
  all[name] = entries;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  _refreshPlaylistUI();
  showToast(`Playlist "${name}" importata`);
}

function _serialize(item) {
  if (item?.type === 'youtube') return { yt: true, id: item.id, title: item.title, duration: item.duration || 0 };
  return { n: item.file.name, f: item.folder };
}

function _refreshQueueUI()    { import('../ui/queueUI.js').then(m => m.renderQueue()); }
function _refreshPlaylistUI() { import('../ui/queueUI.js').then(m => m.renderPlaylists()); }

/* ── Calcolo durata totale coda ─────────────────────────────────── */
export function queueTotalSeconds() {
  return store.queue.reduce((acc, item) => {
    if (item?.type === 'youtube') return acc + (item.duration || 0);
    // file locale: prova a leggere da cache DOM
    const idx = store.playlist.indexOf(item);
    if (idx !== -1) {
      const durEl = document.getElementById(`dur-${idx}`);
      if (durEl) {
        const [m, s] = (durEl.textContent || '').split(':').map(Number);
        if (!isNaN(m) && !isNaN(s)) return acc + m * 60 + s;
      }
    }
    return acc;
  }, 0);
}
