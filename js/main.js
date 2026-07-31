// ── main.js ──────────────────────────────────────────────────────
// Entry point.

import './modules/localFiles.js';
import './ui/controls.js';

import { updateUI }                         from './ui/controls.js';
import { renderPlaylists, renderQueue }     from './ui/queueUI.js';
import { setupExpandedSwipe, togglePlayer } from './ui/expandedPlayer.js';
import { scheduleYTSearch }                 from './modules/youtube.js';
import { loadState }                        from './core/persist.js';
import { playLocal, playYT }                from './core/player.js';
import { store }                            from './core/store.js';

/* ── Barra di ricerca ───────────────────────────────────────────── */
const searchInput = document.getElementById('searchInput');
const clearBtn    = document.getElementById('clearSearchBtn');

searchInput.addEventListener('input', e => {
  const val = e.target.value.toLowerCase();

  clearBtn.classList.toggle('active', val.length > 0);

  document.querySelectorAll('.folder-group:not([data-yt-group])').forEach(group => {
    let visible = false;

    group.querySelectorAll('.track-item').forEach(item => {
      const text  = item.querySelector('.track-name')?.textContent || '';
      const match = text.toLowerCase().includes(val);
      item.style.display = match ? 'flex' : 'none';
      if (match) visible = true;
    });

    group.style.display = visible ? '' : 'none';
  });

  scheduleYTSearch(val);
});

clearBtn.onclick = () => {
  searchInput.value = '';
  searchInput.dispatchEvent(new Event('input'));
  searchInput.focus();
};

/* ── Now-playing title: click → espandi; swipe → prev/next ─────── */
const titleEl = document.getElementById('nowPlayingTitle');
titleEl.addEventListener('click', () => togglePlayer(true));

let _sx = 0, _sy = 0;
titleEl.addEventListener('touchstart', e => {
  _sx = e.touches[0].clientX;
  _sy = e.touches[0].clientY;
}, { passive: true });

titleEl.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - _sx;
  const dy = e.changedTouches[0].clientY - _sy;
  const T  = 50;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx < -T) document.getElementById('btnNext').click();
    if (dx >  T) document.getElementById('btnPrev').click();
  } else {
    if (dy < -T) togglePlayer(true);
    if (dy >  T) togglePlayer(false);
  }
}, { passive: true });




/* ── Register Service Worker ───────────────────────────────────────────── */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("./service-worker.js");

            console.log("Service Worker registered:", registration.scope);
        } catch (err) {
            console.error("Service Worker registration failed:", err);
        }
    });
}



/* ── Collassabilità sezioni (coda, playlist, libreria) ──────────── */
// Deleghiamo i click sugli header di sezione presenti nell'HTML statico.
// Per la libreria, ogni folder-group ha già il suo handler in localFiles.js.
// Qui gestiamo le sezioni fisse: queueSection e playlistSection.



window.addEventListener('load', () => {
  // ── Gestore Universale per Collassare le Sezioni ──────────────────────
  const mainContent = document.getElementById('mainContent');

  mainContent.addEventListener('click', (e) => {
    // 1. Controlla se il click è avvenuto su un .section-title
    const titleEl = e.target.closest('.section-title');
    if (!titleEl) return;

    // 2. Trova il blocco principale (la <section> o l'elemento contenitore)
    const section = titleEl.closest('section') || mainContent;

    // 3. Trova il corpo da nascondere: 
    //    cerca prima [data-collapsible-body], altrimenti usa l'elemento immediatamente successivo (es. #library)
    const body = section.querySelector('[data-collapsible-body]') || titleEl.nextElementSibling;

    if (body) {
      // Alterna la visibilità (se è 'none' ripristina, altrimenti imposta 'none')
      const isCollapsed = body.style.display === 'none';
      body.style.display = isCollapsed ? '' : 'none';
      
      // Aggiorna un attributo dataset per eventuale CSS (es. ruotare freccette)
      titleEl.dataset.collapsed = !isCollapsed ? '1' : '0';
    }
  });

  

  updateUI();
  renderQueue();
  renderPlaylists();
  setupExpandedSwipe();

  const state = loadState();

  if (state) {
    state.queue.forEach(item => {
      if (item.yt) {
        store.queue.push({
          type:     'youtube',
          id:       item.id,
          title:    item.title,
          thumb:    `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
          duration: item.duration || 0,
        });
      }
    });

    if (state.current?.ytId) {
      playYT({
        id:    state.current.ytId,
        title: state.current.title || 'YouTube',
      });

      setTimeout(() => {
        try {
          store.ytPlayer.seekTo(state.current.time || 0);
          if (state.current.paused) store.ytPlayer.pauseVideo();
        } catch {}
      }, 1000);
    }

    renderQueue();
  }
});




window._playLocal   = playLocal;
window.togglePlayer = togglePlayer;
