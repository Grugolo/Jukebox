// ── queue.js ─────────────────────────────────────────────────────
import { store }          from './store.js';
import { showToast, fmtDateShort } from '../utils.js';
import { saveState }      from './persist.js';
import { emit, EV }       from './events.js';
import JSZip from 'https://esm.sh/jszip@3.10.1';

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
 * Importa una playlist da un array di righe di testo
 * @param {string} name - Nome della playlist
 * @param {string[]} lines - Righe del file .txt
 */
export async function importPlaylistFromLines(name, lines) {
  if (!lines || !lines.length) return;

  const parsedItems = [];

  lines.forEach(rawLine => {
    // 1. Rimuove \r, spazi iniziali e finali
    const line = rawLine.replace(/\r/g, '').trim();

    // Ignora righe vuote o commenti
    if (!line || line.startsWith('#')) return;

    // 2. Controllo Formato Esportato (Titolo, ID/Nome, Durata/Cartella)
    const parts = line.split(',').map(p => p.trim());

    if (parts.length >= 2) {
      const [col1, col2, col3] = parts;

      // Se il secondo campo è un ID YouTube valido (11 caratteri alfanumerici)
      if (col2.length === 11 && !col2.includes('.') && !col2.includes(' ')) {
        parsedItems.push({
          id: col2,
          title: col1,
          duration: parseInt(col3, 10) || 0,
          yt: true
        });
      } else {
        // Altrimenti è considerato un file Locale (NomeFile, Cartella)
        // Gestisce anche eventuali virgole extra nel nome riconnettendo il testo
        parsedItems.push({
          n: col1,
          f: parts.slice(1).join(','), // ricompone la cartella se conteneva virgole
          yt: false
        });
      }
    } 
    // 3. Fallback: Se la riga è un URL diretto di YouTube
    else if (line.includes('youtube.com/') || line.includes('youtu.be/')) {
      const match = line.match(/(?:v=|\/)([\w-]{11})/);
      if (match) {
        parsedItems.push({
          id: match[1],
          title: `YouTube Track (${match[1]})`,
          duration: 0,
          yt: true
        });
      }
    }
    // 4. Fallback: Se la riga è semplicemente un nome traccia/file
    else {
      parsedItems.push({
        n: line,
        f: 'File Locali',
        yt: false
      });
    }
  });

  if (!parsedItems.length) {
    showToast('Nessun brano valido trovato nel file');
    return;
  }

  // Salvataggio nello store / LocalStorage (Sostituito savePlaylists errato)
  const allPlaylists = loadPlaylists();
  allPlaylists[name] = parsedItems;
  localStorage.setItem(LS_KEY, JSON.stringify(allPlaylists));

  // Aggiorna l'interfaccia delle playlist
  _refreshPlaylistUI();

  showToast(`Playlist "${name}" importata (${parsedItems.length} brani)`);
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



/* ── Esporta tutte le playlist salvate in LocalStorage creando un archivio .ZIP ─────────────────────────────────── */


export async function exportAllPlaylists() {
  const all = loadPlaylists();
  const names = Object.keys(all);

  if (!names.length) {
    showToast('Nessuna playlist da esportare');
    return;
  }

  const zip = new JSZip();

  names.forEach(name => {
    let textContent = '';

    all[name].forEach(entry => {
      if (entry.yt) {
        // Formato YT: Titolo, ID_Video, Durata
        textContent += `${entry.title}, ${entry.id}, ${entry.duration || 0}\n`;
      } else {
        // Formato Locale: NomeFile, NomeCartella
        textContent += `${entry.n}, ${entry.f}\n`;
      }
    });

    // Pulisce il nome della playlist per evitare caratteri non validi
    const safeFileName = name.replace(/[/\\?%*:|"<>]/g, '_');
    
    // Aggiunge il file .txt all'archivio ZIP
    zip.file(`${safeFileName}.txt`, textContent);
  });

  try {
    showToast('Generazione ZIP in corso...');
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');

    a.href     = url;
    a.download = `Grugofy_Playlists_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Playlists esportate!');
  } catch (err) {
    console.error('Errore creazione ZIP:', err);
    showToast('Errore durante l\'esportazione');
  }
}



