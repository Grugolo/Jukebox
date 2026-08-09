// ── youtube.js ───────────────────────────────────────────────────
// Ricerca YouTube e avvio riproduzione YT.

import { YT_API_KEY }                       from '../config.js';
import { store }                             from '../core/store.js';
import { playYT }                            from '../core/player.js';
import { makeTrackEl }                       from './localFiles.js';
import { parseISO8601, escHtml, decodeHtml } from '../utils.js';
  
let ytGroup = null;
let ytTracksEl = null;
let _lastReqId = 0;

/* ── Ricerca con debounce ───────────────────────────────────────── */
let _debounce = null;

export function scheduleYTSearch(query, delayMs = 600) {
  clearTimeout(_debounce);
  _debounce = setTimeout(() => _search(query), delayMs);
}

/* ── Avvia riproduzione e aggiorna highlight ────────────────────── */
export function playYTItem(item) {
  playYT(item);
  _highlight(item.id);
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER FETCH CON FALLBACK CHIAVI
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Esegue una richiesta alle API YouTube provando in sequenza le chiavi disponibili in YT_API_KEY.
 */
async function _fetchYT(endpoint, paramsObj = {}) {
  const keys = Array.isArray(YT_API_KEY) ? YT_API_KEY : [YT_API_KEY];

  for (const key of keys) {
    const params = new URLSearchParams({ ...paramsObj, key });
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${params.toString()}`;

    try {
      const res  = await fetch(url);
      const data = await res.json();

      // Se c'è un errore dell'API (es. Quota superata o chiave disabilitata)
      if (data.error) {
        console.warn(`[YT API] Chiave esaurita o non valida (${key.slice(0, 6)}...):`, data.error.message);
        continue; // Prova la chiave successiva
      }

      return data; // Risposta valida ricevuta
    } catch (err) {
      console.warn('[YT API] Errore di rete con la chiave corrente:', err);
    }
  }

  return null; // Nessuna chiave ha funzionato
}

/* ═══════════════════════════════════════════════════════════════════
   RICERCA
   ═══════════════════════════════════════════════════════════════════ */

async function _search(q) {
  const reqId = ++_lastReqId;
  if (!q || q.length < 2) {
    if (ytGroup) ytGroup.style.display = 'none';
    if (ytTracksEl) {
      ytTracksEl.innerHTML = `<div style="color:var(--text-dim);padding:10px;">Cerca su YouTube</div>`;
    }
    store.ytResults = [];
    return;
  }

  _ensureYTFolder();
  ytGroup.style.display = '';
  ytTracksEl.innerHTML = _skeletonHTML();
  ytTracksEl.hidden = false;
  
  try {
    // 1. Search (con fallback automatico chiavi)
    const searchData = await _fetchYT('search', {
      part: 'snippet',
      type: 'video',
      maxResults: 6,
      q: q
    });

    if (!searchData) {
      ytTracksEl.innerHTML = `<div style="color:var(--text-dim);padding:10px;">Errore API: Tutte le chiavi sono esaurite</div>`;
      return;
    }

    const items = searchData.items || [];

    if (!items.length) {
      ytTracksEl.innerHTML = `<div style="color:var(--text-dim);padding:10px;">Nessun risultato</div>`;
      return;
    }

    // 2. Durate (con fallback automatico chiavi)
    const ids        = items.map(i => i.id.videoId).join(',');
    const detailData = await _fetchYT('videos', {
      part: 'contentDetails',
      id: ids
    });

    const durationMap = Object.fromEntries(
      (detailData?.items || []).map(v => [v.id, parseISO8601(v.contentDetails.duration)])
    );

    store.ytResults = items.map(item => ({
      type:     'youtube',
      id:       item.id.videoId,
      title:    decodeHtml(item.snippet.title),
      thumb:    item.snippet.thumbnails?.medium?.url || '',
      duration: durationMap[item.id.videoId] || 0,
      uploader: decodeHtml(item.snippet.channelTitle || 'YouTube'),
    }));
    
    if (reqId !== _lastReqId) return;
    _renderResults(store.ytResults);

  } catch (err) {
    console.error('[YT search]', err);
    ytTracksEl.innerHTML = `<div style="color:var(--text-dim);padding:10px;">Nessun risultato</div>`;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════════════ */

function _ensureYTFolder() {
  const library = document.getElementById('library');

  if (ytGroup && !library.contains(ytGroup)) {
    ytGroup = null;
    ytTracksEl = null;
  }

  if (ytGroup) return;

  ytGroup = document.createElement('div');
  ytGroup.className = 'folder-group';
  ytGroup.dataset.ytGroup = '1';
  ytGroup.style.display = 'none';

  const header = document.createElement('div');
  header.className = 'folder-name';
  header.textContent = '🌐 YouTube';

  ytTracksEl = document.createElement('div');
  ytTracksEl.className = 'folder-tracks';

  header.addEventListener('click', () => {
    ytTracksEl.hidden = !ytTracksEl.hidden;
  });

  ytGroup.append(header, ytTracksEl);
  library.prepend(ytGroup);
}

function _renderResults(results) {
  ytTracksEl.innerHTML = '';
  results.forEach((video, i) => {
    ytTracksEl.appendChild(makeTrackEl(video, '', i, true));
  });
}

function _highlight(videoId) {
  if (!ytTracksEl) return;
  ytTracksEl.querySelectorAll('.track-item').forEach(el => {
    const idx   = parseInt(el.dataset.ytIdx);
    const match = store.ytResults[idx]?.id === videoId;
    el.style.borderLeft = match ? '5px solid var(--accent)' : '';
    el.style.background = match ? '#252525' : '';
  });
}

/* ── Skeleton loader ────────────────────────────────────────────── */
function _skeletonHTML() {
  const row = `
    <div class="skeleton-item">
      <div class="skel-box skel-cover"></div>
      <div class="skel-info">
        <div class="skel-box skel-line"></div>
        <div class="skel-box skel-line skel-short"></div>
      </div>
    </div>`;
  return `<div class="skeleton-list">${row.repeat(3)}</div>`;
}
